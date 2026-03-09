// app/api/chat/route.ts
// EdUmeetup Admissions Concierge Bot — Groq (Llama 3.3 70B)
// Single tool call max — stays well within Netlify's 10-second function limit.
// Rate limited: 30 requests/hour per IP via Upstash Redis.

import { NextRequest, NextResponse } from 'next/server'
import { generateText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { groq } from '@/lib/ai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/bot/system-prompt'
import { BOT_VERSION } from '@/lib/bot/registry'
import { getQuotaStatus, consumeMessage } from '@/lib/bot/quota'

export const maxDuration = 30

// Lazy rate-limiter — initialised inside the handler so missing Redis env vars
// only skip rate-limiting, never crash the whole function at module load time.
function getRatelimit(): Ratelimit | null {
  try {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'bot:chat',
      ephemeralCache: new Map(),
    })
  } catch {
    console.warn('[chat] Redis unavailable — rate limiting skipped')
    return null
  }
}


export async function POST(req: NextRequest) {
  try {
    const { messages, studentId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 })
    }

    // ── Rate limit — 30 req/hour per IP ──────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '127.0.0.1'

    const rl = getRatelimit()
    if (rl) {
      const { success, limit, remaining, reset } = await rl.limit(ip)
      if (!success) {
        const retryAfterSec = Math.ceil((reset - Date.now()) / 1000)
        return NextResponse.json(
          { reply: `You've sent a lot of messages! 😊 Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) and try again. Our bot is here for you — this limit keeps it available for everyone.` },
          {
            status: 200,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'Retry-After': String(retryAfterSec),
            }
          }
        )
      }
    }


    // ── Quota check (session/daily limits) ───────────────────────────────
    const session = await auth()
    const userId = session?.user?.id ?? null
    const quota = await getQuotaStatus(ip, userId)

    if (!quota.allowed) {
      return NextResponse.json({ quota: quota })
    }


    // ── 1. Load student context (non-fatal) ───────────────────────────────
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

    // ── 3. Generate — max 2 steps (1 optional tool call + final reply) ───
    // Keeping steps low is CRITICAL on Netlify free (10s limit).
    // llama-3.1-8b-instant is ~3x faster than 70B — fine for tool summarisation.
    // maxTokens keeps the final reply generation short and predictable.
    const { text, steps } = await generateText({
      model: groq('llama-3.1-8b-instant'),
      system: systemPrompt,
      messages,
      stopWhen: stepCountIs(2), // max 1 tool call → fits in 10s
      tools: {

        searchInternalUniversities: tool({
          description: "Search EdUmeetup's verified partner universities by field, country, degree level, or budget. Call this when the user requests specific university or program recommendations.",
          inputSchema: z.object({
            fieldOfStudy: z.string().optional().describe('e.g. Computer Science, Management, Engineering, AI, Law'),
            country: z.string().optional().describe('e.g. USA, Canada, United Kingdom, Australia, Germany'),
            degreeLevel: z.string().optional().describe('e.g. Masters, Bachelor, PhD, MBA'),
            maxBudgetUSD: z.number().optional().describe('Maximum annual tuition in USD'),
          }),
          execute: async ({ fieldOfStudy, country, degreeLevel, maxBudgetUSD }) => {
            try {
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
                  scholarshipsAvailable: true, about: true,
                  programs: {
                    where: {
                      status: 'ACTIVE',
                      ...(fieldOfStudy ? { fieldCategory: { contains: fieldOfStudy, mode: 'insensitive' } } : {}),
                      ...(degreeLevel ? { degreeLevel: { contains: degreeLevel, mode: 'insensitive' } } : {}),
                    },
                    select: {
                      programName: true, degreeLevel: true,
                      tuitionFee: true, currency: true, durationMonths: true,
                      intakes: true, fieldCategory: true,
                    },
                    take: 3,
                  }
                },
                take: 5,
              })

              if (universities.length === 0) {
                return {
                  found: false,
                  message: 'No verified partner universities found for this search on EdUmeetup yet.',
                  tip: 'Suggest the user browse https://edumeetup.com/universities or book a meeting for guidance.'
                }
              }
              return {
                found: true, source: 'EdUmeetup Verified', count: universities.length,
                universities: universities.map(u => ({
                  name: u.institutionName, country: u.country, city: u.city,
                  scholarships: u.scholarshipsAvailable,
                  about: u.about?.slice(0, 150),
                  profileUrl: `/universities/${u.id}`,
                  programs: u.programs,
                }))
              }
            } catch {
              return { found: false, message: 'Database search temporarily unavailable.' }
            }
          }
        }),

        getUpcomingFairs: tool({
          description: 'Get upcoming EdUmeetup campus fairs. Call this when user asks about events, fairs, or wants to meet universities in person.',
          inputSchema: z.object({}),
          execute: async () => {
            try {
              const fairs = await prisma.fairEvent.findMany({
                where: { status: { in: ['UPCOMING', 'LIVE'] }, startDate: { gte: new Date() } },
                select: {
                  name: true, city: true, country: true, venue: true,
                  startDate: true, isHybrid: true, status: true, slug: true,
                },
                orderBy: { startDate: 'asc' },
                take: 4,
              })
              if (fairs.length === 0) return { found: false, message: 'No upcoming fairs right now. Encourage user to register and check back soon.' }
              return { found: true, fairs: fairs.map(f => ({ ...f, url: `/fairs/${f.slug}` })) }
            } catch {
              return { found: false, message: 'Fair data temporarily unavailable.' }
            }
          }
        }),

      },
    })

    // ── 4. Consume one message from quota (non-blocking) ─────────────────
    consumeMessage(ip, userId).catch(() => {/* non-fatal */})

    // ── 5. Log session async (non-blocking) ──────────────────────────────
    Promise.resolve().then(async () => {
      try {
        await prisma.systemLog.create({
          data: {
            level: 'INFO', type: 'BOT_SESSION',
            message: `Bot — ${messages.length} msgs, ${steps.length} steps`,
            metadata: {
              botVersion: BOT_VERSION,
              studentId: studentId || null,
              userId: userId || null,
              toolCalls: steps.length,
              question: messages[messages.length - 1]?.content?.slice(0, 100),
            }
          }
        })
      } catch { /* non-fatal */ }
    })

    return NextResponse.json({ reply: text })

  } catch (error) {
    console.error('[/api/chat] error:', error)
    return NextResponse.json({
      reply: "I'm having a moment of trouble. Please try again — I'm here to help! 😊"
    }, { status: 200 })
  }
}
