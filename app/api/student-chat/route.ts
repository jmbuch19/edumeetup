// app/api/student-chat/route.ts
// Student Advisor — Claude Sonnet 4 (premium, authenticated students only)

// - Hard auth: must be a logged-in STUDENT (not just any session)
// - Profile fetched server-side by session.user.id — no cross-student leakage
// - Cost guardrails: maxTokens 500 + 20 messages/day per student via Redis

import { NextRequest, NextResponse } from 'next/server'
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'
import { tool } from 'ai'
import { z } from 'zod'
import { getUpcomingFairs } from '@/lib/bot/tools'

export const maxDuration = 30

// 20 messages/day per student — fixed window resets at midnight UTC
function getDailyRatelimit(): Ratelimit | null {
    try {
        return new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.fixedWindow(20, '24 h'),
            prefix: 'student-advisor:daily',
            ephemeralCache: new Map(),
        })
    } catch {
        console.warn('[student-chat] Redis unavailable — daily rate limit skipped')
        return null
    }
}

function buildSystemPrompt(student: {
    fullName: string | null
    fieldOfInterest: string | null
    preferredCountries: string | null
    budgetRange: string | null
    englishTestType: string | null
    englishScore: string | null
    greScore: string | null
    gmatScore: string | null
    satScore: string | null
    preferredDegree: string | null
    currentStatus: string | null
    cvUrl: string | null
} | null): string {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata'
    })

    const testScores = [
        student?.englishTestType && student?.englishScore
            ? `${student.englishTestType}: ${student.englishScore}`
            : null,
        student?.greScore ? `GRE: ${student.greScore}` : null,
        student?.gmatScore ? `GMAT: ${student.gmatScore}` : null,
        student?.satScore ? `SAT: ${student.satScore}` : null,
    ].filter(Boolean).join(', ') || 'Not provided'

    const profileSection = student ? `
Student profile:
- Name: ${student.fullName || 'Not provided'}
- Current status: ${student.currentStatus || 'Not provided'}
- Field of interest: ${student.fieldOfInterest || 'Not provided'}
- Preferred degree: ${student.preferredDegree || 'Not provided'}
- Target countries: ${student.preferredCountries || 'Not provided'}
- Budget range: ${student.budgetRange || 'Not provided'}
- Test scores: ${testScores}
- CV Uploaded: ${student?.cvUrl ? 'Yes' : 'No'}
` : `
Student profile: [Not available — answer generally]
`

    return `You are a world-class study abroad advisor for EdUmeetup — a platform that connects Indian students directly with official international universities, with no agents and no commission fees.

Today: ${dateStr}
${profileSection}
## Your Role
You are this student's personal advisor with full expertise. Use your complete knowledge to:
- Answer ANY education-related question comprehensively — universities worldwide, not just EdUmeetup partners
- Give real, specific advice on SOPs, LORs, visa processes, test prep, scholarships, costs, career outcomes
- Share honest assessments — even when the answer is hard (\"Germany is great but language barriers are real\")
- Be specific over vague: real numbers, timelines, examples

## Proactive Profile Diagnostics & Nudging (CRITICAL)
You are not a passive bot. Upon the first interaction or when context allows, **proactively analyze the student's profile** and nudge them:
1. **CV Check:** If 'CV Uploaded' is No, explicitly ask them to jump to their settings and upload their CV/Resume to strengthen their profile for universities. If Yes, briefly congratulate them on being prepared.
2. **GRE Check:** If they are targeting a Master's or PhD and their GRE is missing/'Not provided', gently inform them about the importance of the GRE for top graduate programs (unless they are aiming for the UK/Australia where it's often waived).
3. **English Check:** If 'English: Not Taken Yet', remind them that an IELTS/TOEFL score is mandatory for most student visas and admissions. 
4. **Low Score Strategy:** If their provided test score appears low (e.g. IELTS < 6.0 or GRE < 290), proactively offer a brief strategy: either how to retake/prepare, or suggest universities/pathways that accept lower scores.
5. **Field of Interest Deep Dive:** Look at their 'Field of interest'. Even if they just say "hi", proactively reply with something highly specific to that field. If Architecture, mention new sustainable design research, global job trends, or top countries for it. If Data Science, mention AI trends, tech hubs, and high-ROI programs. Drive engagement by showing deep domain knowledge immediately.

## When to Bring Them to EdUmeetup
When the student is ready to take action — connect with a university, attend a fair, book an info session — direct them to EdUmeetup:
- Book a meeting: Browse a university on edumeetup.com → Request a Meeting → pick a slot
- Campus fairs: Always check the \`getUpcomingFairs\` tool first. If there are upcoming fairs, proactively invite the student to register at the matching link. If no tool results, tell them to check Dashboard → Upcoming Fairs.
- Browse all verified partners: edumeetup.com/universities
- Never suggest using education agents — EdUmeetup is the direct, commission-free path

## Go Deep On
- Country comparisons — lifestyle, job market, PR pathways, real costs
- GRE/GMAT/IELTS — what scores actually matter for their target, preparation shortcuts
- SOP/LOR — what admissions officers want, structure, what to avoid
- Scholarships — types, timelines, how to position an application
- Visa processes — country-specific steps, financial proof, common pitfalls
- Post-study visas — PGWP (Canada), PSW (UK), OPT (USA), 485 (Australia)
- Low GPA, gap year, career change — empathy + real options

## Style
- Warm, honest, like a brilliant senior who knows the system inside out
- Concise but complete: match length to complexity. Simple question → 3-5 sentences. Complex → structured with bullets
- End each reply with one natural follow-up question
- Never say \"I can't help with that\" for education topics — you can and should
`
}

export async function POST(req: NextRequest) {
    return Sentry.startSpan({ name: 'student-advisor.chat', op: 'ai' }, async () => {
        try {
            // ── 1. Auth — must be a logged-in STUDENT ──────────────────────────────
            const session = await auth()
            if (!session?.user?.id) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if ((session.user as any).role !== 'STUDENT') {
                return NextResponse.json({ error: 'Unauthorized — students only' }, { status: 401 })
            }

            const userId = session.user.id

            // ── 2. Daily rate limit: 20 messages/day per student ──────────────────
            const rl = getDailyRatelimit()
            if (rl) {
                try {
                    const { success, remaining } = await rl.limit(userId)
                    if (!success) {
                        return NextResponse.json({
                            error: 'daily_limit',
                            message: "You've used all 20 advisor messages for today. Your limit resets at midnight — see you tomorrow! 😊",
                        }, { status: 429 })
                    }
                    // Remaining messages available — log for debugging
                    console.log(`[student-advisor] userId=${userId} remaining today: ${remaining}`)
                } catch (e) {
                    // Redis failure — allow through, don't block the student
                    console.warn('[student-advisor] Redis rate limit error (skipping):', (e as Error).message)
                }
            }

            // ── 3. Parse request ───────────────────────────────────────────────────
            const { messages } = await req.json()
            if (!messages || !Array.isArray(messages)) {
                return NextResponse.json({ error: 'messages array required' }, { status: 400 })
            }

            // ── 4. Fetch student profile server-side (never trusts client data) ────
            let studentProfile = null
            try {
                studentProfile = await prisma.student.findFirst({
                    where: { userId },
                    select: {
                        fullName: true,
                        fieldOfInterest: true,
                        preferredCountries: true,
                        budgetRange: true,
                        englishTestType: true,
                        englishScore: true,
                        greScore: true,
                        gmatScore: true,
                        satScore: true,
                        preferredDegree: true,
                        currentStatus: true,
                        cvUrl: true,
                    }
                })
            } catch { /* non-fatal — answer without profile */ }

            // ── 5. Build system prompt with live profile ───────────────────────────
            const systemPrompt = buildSystemPrompt(studentProfile)

            // ── 6. Stream — Claude Sonnet 4, 500 token cap ────────────────────────

            const result = streamText({
                model: anthropic('claude-sonnet-4-20250514'),
                system: systemPrompt,
                messages,
                maxOutputTokens: 500, // cost guardrail
                tools: {
                    getUpcomingFairs: tool({
                        description: 'Get upcoming EdUmeetup campus fairs that a student can attend. Use this proactively when discussing fairs.',
                        parameters: z.object({}),
                        // @ts-ignore — AI SDK tight inference fails on implicit returns
                        execute: async () => {
                            const res = await getUpcomingFairs()
                            return res
                        }
                    })
                }
            })

            return result.toTextStreamResponse()

        } catch (error) {
            console.error('[/api/student-chat] error:', error)
            Sentry.captureException(error)
            return new Response(
                "I'm having a moment of trouble. Please try again in a few seconds! 😊",
                { status: 200, headers: { 'Content-Type': 'text/plain' } }
            )
        }
    })
}
