// app/api/chat/route.ts
// EdUmeetup Admissions Concierge Bot — Groq (Llama 3.1 8B)
// Streaming response — changes Netlify timeout from "10s total" to "10s idle".
// First token arrives ~1s, resets the clock — full reply completes easily.

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { groq } from '@/lib/ai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildSystemPrompt } from '@/lib/bot/system-prompt'
import { BOT_VERSION } from '@/lib/bot/registry'
import { getQuotaStatus, consumeMessage } from '@/lib/bot/quota'
import * as Sentry from '@sentry/nextjs'

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
  // ── Observability: one traceId per turn, timings in ms from request start ──
  const traceId = randomUUID()
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  let redisOk = true   // flipped to false on any Redis failure
  let streamEmpty = true // flipped to false when first token arrives

  return Sentry.startSpan({ name: 'bot.chat', op: 'ai' }, async (span) => {
    try {
      const { messages, studentId } = await req.json()

      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'messages array required' }, { status: 400 })
      }

      span.setAttribute('bot.traceId', traceId)
      span.setAttribute('bot.studentId', studentId ?? 'anon')

      // ── Rate limit — 30 req/hour per IP ──────────────────────────────────
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || '127.0.0.1'

      const rl = getRatelimit()
      if (rl) {
        try {
          const { success, limit, remaining, reset } = await rl.limit(ip)
          if (!success) {
            const retryAfterSec = Math.ceil((reset - Date.now()) / 1000)
            return NextResponse.json(
              { reply: `You've sent a lot of messages! 😊 Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) and try again.` },
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
        } catch (e) {
          // Redis auth/network failure — skip rate limiting, keep bot alive
          redisOk = false
          console.warn('[chat] rate-limit Redis error (skipping):', (e as Error).message)
        }
      }

      timings.auth = Date.now() - t0

      // ── Quota check (session/daily limits) ───────────────────────────────
      const session = await auth()
      const userId = session?.user?.id ?? null
      let quota
      try {
        quota = await getQuotaStatus(ip, userId)
      } catch (e) {
        // Redis auth/network failure — allow through, quota enforcement degraded
        redisOk = false
        console.warn('[chat] quota Redis error (allowing through):', (e as Error).message)
        quota = { allowed: true, remaining: 10, isRegistered: !!userId, dailyLimit: 10 } as const
      }

      timings.quota = Date.now() - t0

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

      timings.context = Date.now() - t0

      // ── 2. Build system prompt ────────────────────────────────────────────
      const systemPrompt = buildSystemPrompt(studentContext)

      // ── 3. Stream — max 2 steps (1 optional tool call + final reply) ──────
      // streamText changes Netlify timeout from "10s total" to "10s idle".
      // First token arrives ~1s, resets the clock — full reply completes easily.
      const result = streamText({
        model: groq('llama-3.1-8b-instant'),
        system: systemPrompt,
        messages,
        stopWhen: stepCountIs(2), // max 1 tool call
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
        onChunk: () => {
          if (streamEmpty) {
            // First chunk received — mark the timing
            timings.firstToken = Date.now() - t0
            streamEmpty = false
          }
        },
        onFinish: ({ text, steps, usage }) => {
          timings.total = Date.now() - t0

          // Fire-and-forget after stream closes — never blocks the response
          consumeMessage(ip, userId).catch(() => { })
          Promise.resolve().then(async () => {
            try {
              await prisma.systemLog.create({
                data: {
                  level: streamEmpty ? 'WARN' : 'INFO',
                  type: 'BOT_TRACE',
                  message: `trace ${traceId}`,
                  metadata: {
                    traceId,
                    botVersion: BOT_VERSION,
                    studentId: studentId || null,
                    userId: userId || null,
                    // Failure flags (SF taxonomy)
                    streamEmpty,       // SF-1: true = no tokens produced
                    redisOk,           // SF-3: false = Redis auth/network failure
                    // Timing checkpoints (ms from request start)
                    timings,
                    // Content (truncated for storage — used by eval system)
                    question: messages[messages.length - 1]?.content?.slice(0, 200) ?? null,
                    answer: text?.slice(0, 500) ?? null,
                    // Tool usage
                    toolCalls: steps.length,
                    toolNames: steps.flatMap(s => s.toolCalls?.map(t => t.toolName) ?? []).filter(Boolean),
                    // LLM usage
                    inputTokens: usage?.inputTokens ?? null,
                    outputTokens: usage?.outputTokens ?? null,
                    // Partial truncation detector (SF-6)
                    likelyTruncated: !streamEmpty && (usage?.outputTokens ?? 0) > 0 && (usage?.outputTokens ?? 0) < 10,
                  }
                }
              })
            } catch { /* non-fatal */ }
          })
        },
      })

      // Return text stream with traceId header for client-side correlation
      const response = result.toTextStreamResponse()
      response.headers.set('X-Trace-Id', traceId)
      return response

    } catch (error) {
      console.error('[/api/chat] error:', error)
      Sentry.captureException(error, { extra: { traceId } })
      return new Response(
        "I'm having a moment of trouble. Please try again — I'm here to help! 😊",
        { status: 200, headers: { 'Content-Type': 'text/plain', 'X-Trace-Id': traceId } }
      )
    }
  })
}
