// lib/bot/lead-scorer.ts
// Pure, testable lead scoring — 0 to 10 points.
// Called in onFinish of the bot stream; result stored in BOT_TRACE metadata.
//
// Score bands:
//   ≥ 7 = 🔥 Hot   (high-intent, likely to register/book)
//   4–6 = 🟡 Warm  (interested, needs nurturing)
//   < 4 = 🔵 Cold  (browsing, low signal)

export type LeadTier = '🔥 Hot' | '🟡 Warm' | '🔵 Cold'

export interface LeadScore {
    score: number
    tier: LeadTier
    signals: string[]  // human-readable list of signals that fired
}

// Keyword sets — tested against the full conversation text (lowercased)
const COUNTRY_KEYWORDS = [
    'usa', 'united states', 'canada', 'uk', 'united kingdom', 'australia',
    'germany', 'france', 'ireland', 'new zealand', 'singapore', 'netherlands',
    'sweden', 'italy', 'spain', 'japan', 'dubai', 'uae', 'europe',
]

const DEGREE_KEYWORDS = [
    'phd', 'masters', "master's", 'mba', 'ms ', 'msc', 'bachelor',
    "bachelor's", 'pg diploma', 'postgrad', 'undergraduate', 'ug', 'pg',
]

const BUDGET_KEYWORDS = [
    'budget', 'cost', 'fees', 'fee', 'tuition', 'afford', 'scholarship',
    'financial', 'rupees', 'usd', 'gbp', 'aud', 'expensive', 'cheap', 'free',
]

const PERSONAL_KEYWORDS = [
    'my marks', 'my percentage', 'my grade', 'my gpa', 'my score', 'my gre',
    'my ielts', 'my toefl', 'my sat', 'i have', 'i got', 'my gap', 'my backlog',
    'my cgpa', 'my result', 'i studied', 'i completed', 'i passed', 'i failed',
    'my profile', 'my application',
]

const INTENT_KEYWORDS = [
    'apply', 'application', 'intake', 'when can i', 'deadline', 'admit',
    'admission', 'join', 'enroll', 'start', 'register', 'how to apply',
    'next year', 'this year', 'september', 'january', 'fall', 'spring',
]

function containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(kw => text.includes(kw))
}

/**
 * Score a bot conversation.
 *
 * @param messages - The full message history (user + assistant turns)
 * @param isLoggedIn - Whether the visitor has an authenticated session
 */
export function scoreConversation(
    messages: Array<{ role: string; content: string }>,
    isLoggedIn: boolean
): LeadScore {
    const userMessages = messages.filter(m => m.role === 'user')
    const fullText = messages
        .map(m => m.content)
        .join(' ')
        .toLowerCase()

    let score = 0
    const signals: string[] = []

    // ── Signal 1: Conversation depth ─────────────────────────────────────────
    if (userMessages.length >= 4) {
        score += 2
        signals.push(`${userMessages.length} user messages (deep engagement)`)
    } else if (userMessages.length >= 2) {
        score += 1
        signals.push(`${userMessages.length} user messages`)
    }

    // ── Signal 2: Specific country interest ──────────────────────────────────
    if (containsAny(fullText, COUNTRY_KEYWORDS)) {
        score += 1
        signals.push('Mentioned specific country')
    }

    // ── Signal 3: Degree-level intent ────────────────────────────────────────
    if (containsAny(fullText, DEGREE_KEYWORDS)) {
        score += 1
        signals.push('Mentioned specific degree level')
    }

    // ── Signal 4: Budget / cost awareness ────────────────────────────────────
    if (containsAny(fullText, BUDGET_KEYWORDS)) {
        score += 1
        signals.push('Discussed budget or fees')
    }

    // ── Signal 5: Personal profile details shared ────────────────────────────
    if (containsAny(fullText, PERSONAL_KEYWORDS)) {
        score += 2
        signals.push('Shared personal academic details')
    }

    // ── Signal 6: Timeline / application intent ───────────────────────────────
    if (containsAny(fullText, INTENT_KEYWORDS)) {
        score += 1
        signals.push('Mentioned intake or application')
    }

    // ── Signal 7: Authenticated user (highest signal) ────────────────────────
    if (isLoggedIn) {
        score += 2
        signals.push('Logged-in registered student')
    }

    // Cap at 10
    score = Math.min(score, 10)

    const tier: LeadTier =
        score >= 7 ? '🔥 Hot' :
        score >= 4 ? '🟡 Warm' :
                    '🔵 Cold'

    return { score, tier, signals }
}
