/**
 * lib/auth/requireAuth.ts
 *
 * Central server-side authorization helpers.
 * Every API route and server action that touches protected data MUST use these.
 *
 * Design rules:
 *  - Always reads session via auth() — never trusts client-supplied IDs or role strings
 *  - Always re-checks isActive from DB on every call (JWT caches stale state)
 *  - Throws AuthorizationError — catch at route boundary with toErrorResponse()
 *
 * Owner vs Rep semantics (enforced throughout):
 *  - UNIVERSITY user  → owns a university via University.userId === session.user.id
 *  - UNIVERSITY_REP   → belongs to a university via User.universityId === university.id
 *  - These are intentionally distinct and must NOT be treated interchangeably
 *    unless the helper explicitly accepts both (e.g. requireUniversityUser).
 *  - ADMIN bypasses all ownership checks.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Role Type ─────────────────────────────────────────────────────────────────
// Strict union — must stay in sync with Prisma enum UserRole in schema.prisma.
// Do NOT use plain `string` for role comparisons anywhere in authorization code.

export type UserRole = 'STUDENT' | 'UNIVERSITY' | 'UNIVERSITY_REP' | 'ADMIN'

// ── Error Class ───────────────────────────────────────────────────────────────

export class AuthorizationError extends Error {
    statusCode: 401 | 403

    constructor(message: string, statusCode: 401 | 403 = 403) {
        super(message)
        this.name = 'AuthorizationError'
        this.statusCode = statusCode
    }
}

/** Converts AuthorizationError → correct HTTP Response for API route handlers. */
export function toErrorResponse(error: unknown): Response {
    if (error instanceof AuthorizationError) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
        })
    }
    console.error('[Auth] Unexpected authorization error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    })
}

// ── Session Shape ─────────────────────────────────────────────────────────────

export type AuthSession = {
    user: {
        id: string
        email: string
        role: UserRole  // ← strict union, not string
    }
}

// ── Core Helpers ──────────────────────────────────────────────────────────────

/**
 * Verifies a valid session exists and the account is active.
 * Throws AuthorizationError(401) if unauthenticated.
 * Throws AuthorizationError(403) if the account is inactive.
 *
 * isActive is re-checked from DB on every call because JWT tokens cache
 * the state at login time and cannot reflect mid-session deactivations.
 */
export async function requireAuth(): Promise<AuthSession> {
    const session = await auth()

    if (!session?.user?.id) {
        throw new AuthorizationError('Unauthenticated', 401)
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isActive: true, role: true },
    })

    if (!dbUser) {
        throw new AuthorizationError('User account not found', 401)
    }

    if (!dbUser.isActive) {
        throw new AuthorizationError('Account is deactivated', 403)
    }

    // Return session with role enforced from DB (not JWT cache)
    return {
        user: {
            id: session.user.id,
            email: session.user.email!,
            role: dbUser.role as UserRole,
        },
    }
}

/**
 * Requires a specific role. Accepts a single role or an array (OR logic).
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<AuthSession> {
    const session = await requireAuth()
    const allowed: UserRole[] = Array.isArray(role) ? role : [role]

    if (!allowed.includes(session.user.role)) {
        throw new AuthorizationError(
            `Forbidden — requires role: ${allowed.join(' | ')}`,
            403
        )
    }

    return session
}

/** ADMIN only. */
export async function requireAdmin(): Promise<AuthSession> {
    return requireRole('ADMIN')
}

/**
 * UNIVERSITY or UNIVERSITY_REP.
 * Note: these have different ownership semantics — see helpers below.
 */
export async function requireUniversityUser(): Promise<AuthSession> {
    return requireRole(['UNIVERSITY', 'UNIVERSITY_REP'])
}

/** STUDENT only. */
export async function requireStudentUser(): Promise<AuthSession> {
    return requireRole('STUDENT')
}

// ── Ownership Helpers ─────────────────────────────────────────────────────────

/**
 * Verifies the authenticated user owns the given studentId.
 *
 * Ownership rule: Student.userId === session.user.id
 * ADMIN bypasses.
 */
export async function requireStudentOwnership(studentId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
    })

    if (!student) {
        throw new AuthorizationError('Student record not found', 403)
    }

    if (student.userId !== session.user.id) {
        throw new AuthorizationError('Forbidden — you do not own this student record', 403)
    }

    return session
}

/**
 * Verifies the authenticated user belongs to the given universityId.
 *
 * UNIVERSITY owner:    University.userId === session.user.id
 * UNIVERSITY_REP:      User.universityId === universityId
 *
 * These are distinct relations. A UNIVERSITY owner does NOT automatically
 * satisfy the REP check, and vice versa. The helper handles each path
 * explicitly and intentionally.
 *
 * ADMIN bypasses.
 */
export async function requireUniversityOwnership(universityId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    if (session.user.role === 'UNIVERSITY') {
        const uni = await prisma.university.findUnique({
            where: { id: universityId },
            select: { userId: true },
        })
        if (!uni) {
            throw new AuthorizationError('University not found', 403)
        }
        if (uni.userId !== session.user.id) {
            throw new AuthorizationError('Forbidden — you do not own this university', 403)
        }
        return session
    }

    if (session.user.role === 'UNIVERSITY_REP') {
        // Rep is linked via User.universityId (the parent university they belong to)
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { universityId: true },
        })
        if (!user || user.universityId !== universityId) {
            throw new AuthorizationError('Forbidden — you are not a rep for this university', 403)
        }
        return session
    }

    throw new AuthorizationError('Forbidden', 403)
}

/**
 * Verifies the authenticated user can access a specific meeting.
 *
 * Access is granted if the user is ANY of:
 *   1. A participant (MeetingParticipant.userId === session.user.id)
 *   2. The assigned rep (Meeting.repId === session.user.id)
 *   3. The university owner (University.userId === session.user.id)
 *   4. The student who booked (Meeting.student.userId === session.user.id)
 *      — defensive fallback in case participant rows are missing/incomplete
 *
 * ADMIN bypasses.
 */
export async function requireMeetingAccess(meetingId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: {
            repId: true,
            // Path 1: explicit participant rows
            participants: {
                select: { user: { select: { id: true } } },
            },
            // Path 2: university owner
            university: {
                select: { userId: true },
            },
            // Path 3: student direct ownership (defensive, covers missing participant rows)
            student: {
                select: { user: { select: { id: true } } },
            },
        },
    })

    if (!meeting) {
        throw new AuthorizationError('Meeting not found', 403)
    }

    const isParticipant = meeting.participants.some((p: any) => p.user?.id === session.user.id)
    const isRep = meeting.repId === session.user.id
    const isUniOwner = meeting.university?.userId === session.user.id
    const isBookingStudent = meeting.student?.user?.id === session.user.id

    if (!isParticipant && !isRep && !isUniOwner && !isBookingStudent) {
        throw new AuthorizationError('Forbidden — you do not have access to this meeting', 403)
    }

    return session
}

/**
 * Verifies the authenticated user can access a direct message conversation.
 *
 * Access rules:
 *   - Student side:    Conversation.student.userId === session.user.id
 *   - University side: University.userId === session.user.id  (owner)
 *                   OR University.reps contains session.user.id  (rep)
 *
 * ADMIN bypasses.
 */
export async function requireConversationAccess(conversationId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
            student: { select: { userId: true } },
            university: {
                select: {
                    userId: true,
                    reps: { select: { id: true } },
                },
            },
        },
    })

    if (!conv) {
        throw new AuthorizationError('Conversation not found', 403)
    }

    const isStudent = conv.student.userId === session.user.id
    const isUniOwner = conv.university.userId === session.user.id
    const isUniRep = conv.university.reps.some((r: any) => r.id === session.user.id)

    if (!isStudent && !isUniOwner && !isUniRep) {
        throw new AuthorizationError('Forbidden — you are not part of this conversation', 403)
    }

    return session
}
