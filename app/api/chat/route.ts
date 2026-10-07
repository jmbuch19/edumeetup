// app/api/chat/route.ts
// EdUmeetup Admissions Concierge Bot — Groq (model from GROQ_CHAT_MODEL, see lib/ai.ts)

// Streaming response — changes Netlify timeout from "10s total" to "10s idle".
// First token arrives ~1s, resets the clock — full reply completes easily.

import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { streamText, tool, stepCountIs } from 'ai'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { groq, getGroqChatModelId, groqProviderOptions } from '@/lib/ai'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { buildSystemPrompt } from '@/lib/bot/system-prompt'
import { BOT_VERSION } from '@/lib/bot/registry'
import { getQuotaStatus, consumeMessage } from '@/lib/bot/quota'
import { scoreConversation } from '@/lib/bot/lead-scorer'
import * as Sentry from '@sentry/nextjs'
import { verifyTurnstile } from '@/lib/turnstile'
import {
  HUMAN_COOKIE, HUMAN_COOKIE_TTL_SEC, createHumanCookie, verifyHumanCookie,
  decideAnonAccess, sanitizeMessages,
} from '@/lib/chat/access'

export const maxDuration = 30

// Lazy rate-limiter — initialised inside the handler so missing Redis env vars
// only skip rate-limiting, never crash the whole function at module load time.
// Stricter limiter for anonymous visitors whose browser couldn't run Turnstile
// (ad blocker / CSP / network). They still get answers, just fewer per hour.
function getFallbackRatelimit(): Ratelimit | null {
  try {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(8, '1 h'),
      prefix: 'bot:chat:unverified',
    })
  } catch {
    return null
  }
}

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
  // ── Helper to mock AI streams for immediate blocks ──
  const mockTextStream = (text: string) => new Response(
    text,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
  );

  // ── Observability: one traceId per turn, timings in ms from request start ──
  const traceId = randomUUID()
  const t0 = Date.now()
  const timings: Record<string, number> = {}
  let redisOk = true   // flipped to false on any Redis failure
  let streamEmpty = true // flipped to false when first token arrives

  return Sentry.startSpan({ name: 'bot.chat', op: 'ai' }, async (span) => {
    try {
      const body = await req.json().catch(() => null)
      // NOTE: any client-supplied studentId is deliberately ignored — the profile
      // used for context comes only from the authenticated session (see below).
      const messages = sanitizeMessages(body?.messages)

      if (!messages) {
        return NextResponse.json({ error: 'Please type a message to send.' }, { status: 400 })
      }

      // Resolve identity from the session only.
      const session = await auth()
      const userId = session?.user?.id ?? null
      let studentId: string | null = null
      let studentContext = null
      if (userId) {
        try {
          const student = await prisma.student.findUnique({
            where: { userId },
            select: {
              id: true,
              fullName: true, fieldOfInterest: true, budgetRange: true,
              preferredDegree: true, preferredCountries: true,
              englishTestType: true, englishScore: true,
              currentStatus: true, country: true,
            }
          })
          if (student) {
            const { id, ...ctx } = student
            studentId = id
            studentContext = ctx
          }
        } catch { /* non-fatal */ }
      }

      span.setAttribute('bot.traceId', traceId)
      span.setAttribute('bot.studentId', studentId ?? 'anon')

      // ── Rate limit — 30 req/hour per IP ──────────────────────────────────
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')
        || '127.0.0.1'

      // ── T09: Pre-flight prompt injection check ───────────────────────────
      const lastMessage = messages[messages.length - 1]?.content || ''
      const injectionRegex = /(ignore (all )?previous instructions|you are now|DAN|act as (a|an)|system prompt|forget everything)/i
      if (injectionRegex.test(lastMessage)) {
        await prisma.systemLog.create({
          data: {
            level: 'WARN',
            type: 'PROMPT_INJECTION',
            message: `Prompt injection attempt blocked`,
            metadata: { studentId: studentId ?? 'anon', ip, attempt: lastMessage.slice(0, 100) }
          }
        });

        const recentAttempts = await prisma.systemLog.count({
          where: {
            type: 'PROMPT_INJECTION',
            metadata: { path: ['studentId'], equals: studentId ?? 'anon' },
            createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
          }
        });

        if (recentAttempts >= 4 && process.env.ADMIN_NOTIFICATION_EMAIL) {
          await sendEmail({
            to: process.env.ADMIN_NOTIFICATION_EMAIL,
            subject: `[SECURITY] Repeated injection attempts — ${studentId ?? 'anon'}`,
            html: `<p>User ${studentId ?? 'anon'} (IP: ${ip}) triggered prompt injection defenses ${recentAttempts + 1} times in the last hour.</p><p>Latest attempt: ${lastMessage.slice(0, 500)}</p>`,
          }).catch(console.error);
        }

        return mockTextStream("I am here to help you with university admissions. How can I assist you with your study plans today? 😊");
      }

      const rl = getRatelimit()
      if (rl) {
        try {
          const { success, limit, remaining, reset } = await rl.limit(ip)
          if (!success) {
            const retryAfterSec = Math.ceil((reset - Date.now()) / 1000)
            const response = mockTextStream(`You've sent a lot of messages! 😊 Please wait ${Math.ceil(retryAfterSec / 60)} minute(s) and try again.`);
            response.headers.set('X-RateLimit-Limit', String(limit));
            response.headers.set('X-RateLimit-Remaining', String(remaining));
            response.headers.set('Retry-After', String(retryAfterSec));
            return response;
          }
        } catch (e) {
          // Redis auth/network failure — skip rate limiting, keep bot alive
          redisOk = false
          console.warn('[chat] rate-limit Redis error (skipping):', (e as Error).message)
        }
      }

      timings.auth = Date.now() - t0

      // ── Anonymous human check: Turnstile token → signed cookie, or fallback ──
      let humanCookieToSet: string | null = null
      if (!userId) {
        const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
        const access = await decideAnonAccess({
          hasValidCookie: verifyHumanCookie(req.cookies.get(HUMAN_COOKIE)?.value, ip, secret),
          token: req.headers.get('x-turnstile-token'),
          verify: verifyTurnstile,
        })
        if (access.kind === 'denied') {
          return NextResponse.json({ error: access.message }, { status: 403 })
        }
        if (access.kind === 'verified' && access.setCookie && secret) {
          humanCookieToSet = createHumanCookie(ip, secret)
        }
        if (access.kind === 'fallback') {
          const frl = getFallbackRatelimit()
          if (!frl) {
            return NextResponse.json(
              { error: "The advisor couldn't verify your browser. Please disable any content blocker for this site, refresh, and try again." },
              { status: 403 }
            )
          }
          try {
            const { success, reset } = await frl.limit(ip)
            if (!success) {
              const mins = Math.max(1, Math.ceil((reset - Date.now()) / 60000))
              return NextResponse.json(
                { error: `You've reached the message limit for now. Please wait ${mins} minute(s), or refresh the page and try again.` },
                { status: 429, headers: { 'Retry-After': String(mins * 60) } }
              )
            }
          } catch (e) {
            redisOk = false
            console.warn('[chat] fallback rate-limit Redis error (denying unverified):', (e as Error).message)
            return NextResponse.json(
              { error: 'The advisor is busy right now. Please refresh the page and try again.' },
              { status: 503 }
            )
          }
        }
      }

      // ── Quota check (session/daily limits) ───────────────────────────────

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
        if (quota.reason === 'anon_limit') {
            return mockTextStream(`You've reached your trial limit. Please register to continue chatting about your study plans!`);
        } else if (quota.reason === 'anon_cooldown' || quota.reason === 'registered_limit') {
            return mockTextStream(`You've sent a lot of messages today. Please chat with me again tomorrow! 😊`);
        }
        return mockTextStream(`Your message limit has been reached. Please try again later.`);
      }


      // ── 1. Student context was loaded above from the session user only ────

      timings.context = Date.now() - t0

      // ── 2. Build system prompt ────────────────────────────────────────────
      const systemPrompt = buildSystemPrompt(studentContext)

      // ── 3. Stream — max 2 steps (1 optional tool call + final reply) ──────
      // streamText changes Netlify timeout from "10s total" to "10s idle".
      // First token arrives ~1s, resets the clock — full reply completes easily.
      const result = streamText({
        model: groq(getGroqChatModelId()),
        providerOptions: groqProviderOptions(),

        system: systemPrompt,
        messages,
        maxOutputTokens: 500,
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
                    programList: {
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
                    programList: {
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
                  universities: universities.map((u: any) => ({
                    name: u.institutionName, country: u.country, city: u.city,
                    scholarships: u.scholarshipsAvailable,
                    about: u.about?.slice(0, 150),
                    profileUrl: `/universities/${u.id}`,
                    programs: u.programList,
                  }))
                }
              } catch {
                return { found: false, message: 'Database search temporarily unavailable.' }
              }
            }
          }),

          getUpcomingCircuits: tool({
            description: 'Get upcoming EdUmeetup Geographic Circuits. Call this when a university representative asks about upcoming tours, fairs, or wants to travel to India. Pitch the value of joining an entire multi-city circuit.',
            inputSchema: z.object({}),
            execute: async () => {
              try {
                const circuits = await prisma.fairCircuit.findMany({
                  where: { status: { in: ['PUBLISHED', 'ONGOING'] }, startDate: { gte: new Date() } },
                  include: { events: true },
                  orderBy: { startDate: 'asc' },
                  take: 3,
                })
                if (circuits.length === 0) return { found: false, message: 'No upcoming circuits right now. Encourage the rep to register their interest for the next season.' }
                return { 
                  found: true, 
                  circuits: circuits.map((c: any) => ({
                    name: c.name,
                    dates: `${c.startDate.toISOString().split('T')[0]} to ${c.endDate.toISOString().split('T')[0]}`,
                    citiesIncluded: c.events.map((e: any) => e.city).join(', '),
                    estimatedStudents: c.events.length * 150 // heuristic
                  }))
                }
              } catch {
                return { found: false, message: 'Circuit data temporarily unavailable.' }
              }
            }
          }),

        },
        // Without this, provider errors (bad/missing GROQ_API_KEY, model errors)
        // just end the stream silently. The client shows a retry message.
        onError: ({ error }) => {
          console.error('[/api/chat] stream error:', (error as Error)?.message ?? error)
          Sentry.captureException(error, { extra: { traceId } })
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

          // ── Lead scoring ────────────────────────────────────────────────────
          const allMessages = [...messages, { role: 'assistant', content: text ?? '' }]
          const lead = scoreConversation(allMessages, !!userId)

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
                    // Lead scoring (Phase 1)
                    leadScore: lead.score,
                    leadTier: lead.tier,
                    leadSignals: lead.signals,
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
      if (humanCookieToSet) {
        response.headers.append('Set-Cookie',
          `${HUMAN_COOKIE}=${humanCookieToSet}; Path=/api/chat; Max-Age=${HUMAN_COOKIE_TTL_SEC}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`)
      }
      return response

    } catch (error) {
      console.error('[/api/chat] error:')
      Sentry.captureException(error, { extra: { traceId } })
      return new Response(
        "I'm having a moment of trouble. Please try again — I'm here to help! 😊",
        { status: 200, headers: { 'Content-Type': 'text/plain', 'X-Trace-Id': traceId } }
      )
    }
  })
}
