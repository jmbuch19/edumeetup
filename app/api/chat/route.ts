// app/api/chat/route.ts
// EdUmeetup Admissions Concierge Bot — powered by Gemini via Vercel AI SDK
// Function calling: searchInternalUniversities, getStudentProfile, searchGlobalUniversities, getUpcomingFairs

import { NextRequest, NextResponse } from 'next/server'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { google } from '@/lib/ai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/bot/system-prompt'
import { BOT_VERSION } from '@/lib/bot/registry'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages, studentId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // ── 1. Load student context ───────────────────────────────────────────
    let studentContext = null
    if (studentId) {
      try {
        studentContext = await prisma.student.findUnique({
          where: { id: studentId },
          select: {
            fullName: true, fieldOfInterest: true, budgetRange: true,
            preferredDegree: true, preferredCountries: true,
            englishTestType: true, englishScore: true,
            currentStatus: true, country: true,
          }
        })
      } catch { /* non-fatal */ }
    }

    // ── 2. Build system prompt ────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(studentContext)

    // ── 3. Run Gemini with tools ──────────────────────────────────────────
    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      messages,
      maxSteps: 5, // agentic loop — up to 5 tool calls
      tools: {
        searchInternalUniversities: tool({
          description: "Search EdUmeetup's verified partner universities. Always call this FIRST before global search.",
          parameters: z.object({
            fieldOfStudy: z.string().optional().describe('e.g. Computer Science, Business, Engineering'),
            country: z.string().optional().describe('e.g. Canada, United Kingdom, Australia'),
            degreeLevel: z.string().optional().describe('e.g. Masters, Bachelor, PhD'),
            maxBudgetUSD: z.number().optional().describe('Maximum annual tuition in USD'),
          }),
          execute: async ({ fieldOfStudy, country, degreeLevel, maxBudgetUSD }) => {
            const universities = await prisma.university.findMany({
              where: {
                verificationStatus: 'VERIFIED',
                isPublic: true,
                ...(country ? { country: { contains: country, mode: 'insensitive' } } : {}),
                programs: {
                  some: {
                    status: 'ACTIVE',
                    ...(fieldOfStudy ? { fieldCategory: { contains: fieldOfStudy, mode: 'insensitive' } } : {}),
                    ...(degreeLevel ? { degreeLevel: { contains: degreeLevel, mode: 'insensitive' } } : {}),
                    ...(maxBudgetUSD ? { tuitionFee: { lte: maxBudgetUSD } } : {}),
                  }
                }
              },
              select: {
                id: true, institutionName: true, country: true, city: true,
                website: true, verificationStatus: true, scholarshipsAvailable: true, about: true, logo: true,
                programs: {
                  where: {
                    status: 'ACTIVE',
                    ...(fieldOfStudy ? { fieldCategory: { contains: fieldOfStudy, mode: 'insensitive' } } : {}),
                    ...(degreeLevel ? { degreeLevel: { contains: degreeLevel, mode: 'insensitive' } } : {}),
                    ...(maxBudgetUSD ? { tuitionFee: { lte: maxBudgetUSD } } : {}),
                  },
                  select: {
                    id: true, programName: true, degreeLevel: true,
                    tuitionFee: true, currency: true, durationMonths: true,
                    intakes: true, stemDesignated: true, fieldCategory: true,
                  },
                  take: 3,
                }
              },
              take: 6,
            })

            if (universities.length === 0) {
              return { found: false, message: 'No verified partner universities found. Suggest global search.' }
            }
            return {
              found: true, source: 'INTERNAL', count: universities.length,
              universities: universities.map(u => ({
                id: u.id, name: u.institutionName, country: u.country, city: u.city,
                website: u.website, isVerified: true, scholarships: u.scholarshipsAvailable,
                about: u.about?.slice(0, 200), logo: u.logo, programs: u.programs,
                profileUrl: `/universities/${u.id}`,
              }))
            }
          }
        }),

        getStudentProfile: tool({
          description: "Get the logged-in student's profile to personalize recommendations.",
          parameters: z.object({
            studentId: z.string().describe("The student's database ID"),
          }),
          execute: async ({ studentId: sId }) => {
            const student = await prisma.student.findUnique({
              where: { id: sId },
              select: {
                fullName: true, fieldOfInterest: true, budgetRange: true,
                preferredDegree: true, preferredCountries: true,
                englishTestType: true, englishScore: true,
                currentStatus: true, country: true,
              }
            })
            return student ? { found: true, profile: student } : { found: false }
          }
        }),

        searchGlobalUniversities: tool({
          description: 'FALLBACK ONLY — use when searchInternalUniversities returns no results. Searches global sources. Always label results as external.',
          parameters: z.object({
            query: z.string().describe('e.g. "top universities for Computer Science in Canada"'),
          }),
          execute: async ({ query }) => {
            const cx = process.env.GOOGLE_CSE_CX
            const apiKey = process.env.GOOGLE_CSE_API_KEY
            if (!cx || !apiKey) return { found: false, error: 'Global search not configured.' }

            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=4`
            const res = await fetch(url)
            if (!res.ok) return { found: false, error: 'Google search failed.' }

            const data = await res.json()
            const items = data.items || []
            if (items.length === 0) return { found: false }

            return {
              found: true, source: 'EXTERNAL',
              note: 'Label every result as External Recommendation — not verified on EdUmeetup. Offer a Request Verification button.',
              results: items.slice(0, 4).map((item: { title: string; link: string; snippet: string; displayLink: string }) => ({
                title: item.title, url: item.link,
                snippet: item.snippet, host: item.displayLink,
              }))
            }
          }
        }),

        getUpcomingFairs: tool({
          description: 'Get upcoming EdUmeetup campus fairs for students to attend.',
          parameters: z.object({}),
          execute: async () => {
            const fairs = await prisma.fairEvent.findMany({
              where: { status: { in: ['UPCOMING', 'LIVE'] }, startDate: { gte: new Date() } },
              select: {
                id: true, name: true, city: true, country: true, venue: true,
                startDate: true, endDate: true, isHybrid: true, onlineUrl: true, status: true, slug: true,
              },
              orderBy: { startDate: 'asc' },
              take: 5,
            })
            if (fairs.length === 0) return { found: false, message: 'No upcoming fairs at this time.' }
            return { found: true, fairs: fairs.map(f => ({ ...f, url: `/fairs/${f.slug}` })) }
          }
        }),
      },
    })

    // ── 4. Log to SystemLog ───────────────────────────────────────────────
    try {
      const session = await auth()
      await prisma.systemLog.create({
        data: {
          level: 'INFO', type: 'BOT_SESSION',
          message: `Admissions bot — ${messages.length} messages, ${result.steps?.length || 0} steps`,
          metadata: {
            botVersion: BOT_VERSION,
            studentId: studentId || null,
            userId: session?.user?.id || null,
            toolCalls: result.steps?.length || 0,
            question: messages[messages.length - 1]?.content?.slice(0, 100),
          }
        }
      })
    } catch { /* non-fatal */ }

    // ── 5. Log BotMisses if Gemini said it can't help ────────────────────
    const replyText = result.text
    if (replyText.toLowerCase().includes('i do not have that information') ||
      replyText.toLowerCase().includes('feature not available')) {
      try {
        const lastQ = messages[messages.length - 1]?.content
        if (lastQ) await prisma.botMisses.create({ data: { question: lastQ.slice(0, 500) } })
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ reply: replyText })

  } catch (error) {
    console.error('[/api/chat] error:', error)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
