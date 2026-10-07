// lib/chat/access.ts
// Anonymous-visitor access policy for the public admissions chat (/api/chat).
//
// Turnstile tokens are single-use, but a conversation is many requests. So the
// first request carries the token (x-turnstile-token header); once it verifies
// we set a short-lived HMAC-signed "human" cookie and later requests use that.
// If Turnstile can't run in the browser (ad blocker, CSP, network), the client
// sends no token and the visitor is admitted on a stricter IP rate limit instead
// of being silently rejected.

import { createHmac, timingSafeEqual } from 'crypto'

export const HUMAN_COOKIE = 'em_chat_human'
export const HUMAN_COOKIE_TTL_SEC = 2 * 60 * 60 // 2 hours

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Cookie value: `<expiresAtSec>.<sig>` where sig binds expiry + client IP. */
export function createHumanCookie(ip: string, secret: string, nowMs = Date.now()): string {
  const exp = Math.floor(nowMs / 1000) + HUMAN_COOKIE_TTL_SEC
  return `${exp}.${sign(`${exp}|${ip}`, secret)}`
}

export function verifyHumanCookie(
  value: string | undefined | null,
  ip: string,
  secret: string | undefined,
  nowMs = Date.now(),
): boolean {
  if (!value || !secret) return false
  const dot = value.indexOf('.')
  if (dot <= 0) return false
  const expStr = value.slice(0, dot)
  const sig = value.slice(dot + 1)
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp * 1000 < nowMs) return false
  const expected = sign(`${expStr}|${ip}`, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export type AnonAccess =
  | { kind: 'verified'; setCookie: boolean } // human proven (cookie or fresh token)
  | { kind: 'fallback' }                     // no token: admit on strict rate limit
  | { kind: 'denied'; message: string }      // token present but invalid

/**
 * Decide how to treat an anonymous request.
 * `verify` is only called when a token is present (tokens are single-use).
 */
export async function decideAnonAccess(opts: {
  hasValidCookie: boolean
  token: string | null | undefined
  verify: (token: string) => Promise<{ success: boolean }>
}): Promise<AnonAccess> {
  if (opts.hasValidCookie) return { kind: 'verified', setCookie: false }
  const token = opts.token?.trim()
  if (!token) return { kind: 'fallback' }
  const res = await opts.verify(token)
  if (res.success) return { kind: 'verified', setCookie: true }
  return {
    kind: 'denied',
    message: "We couldn't verify your browser. Please refresh the page and try again.",
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Keep only well-formed user/assistant text turns (drops client-supplied
 * system/tool messages), cap per-message length and history size.
 */
export function sanitizeMessages(input: unknown, maxMessages = 20, maxChars = 2000): ChatMessage[] | null {
  if (!Array.isArray(input)) return null
  const out: ChatMessage[] = []
  for (const m of input) {
    if (!m || typeof m !== 'object') continue
    const { role, content } = m as { role?: unknown; content?: unknown }
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    const text = content.slice(0, maxChars)
    if (!text.trim()) continue
    out.push({ role, content: text })
  }
  const trimmed = out.slice(-maxMessages)
  // A conversation must end with the user's turn.
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== 'user') return null
  return trimmed
}
