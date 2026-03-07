/**
 * lib/auth/requireAuth.ts
 *
 * Central server-side authorization helpers.
 * Every API route and server action that touches protected data MUST use these.
 *
 * Rules:
 *  - Always reads session from auth() — never trusts client-supplied IDs
 *  - Always checks isActive before returning
 *  - Throws AuthorizationError (extends Error) — catch at route level and return 401/403
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Error Class ─────────────────────────────────────────────────────────────

export class AuthorizationError extends Error {
    statusCode: 401 | 403

    constructor(message: string, statusCode: 401 | 403 = 403) {
        super(message)
        this.name = 'AuthorizationError'
        this.statusCode = statusCode
    }
}

/** Convert AuthorizationError into the correct Response for API routes. */
export function toErrorResponse(error: unknown): Response {
    if (error instanceof AuthorizationError) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: error.statusCode,
            headers: { 'Content-Type': 'application/json' },
        })
    }
    // Unexpected error — return 500
    console.error('[AuthorizationError] Unexpected:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    })
}

// ── Session Shape ────────────────────────────────────────────────────────────

export type AuthSession = {
    user: {
        id: string
        email: string
        role: string
    }
}

// ── Core Helpers ─────────────────────────────────────────────────────────────

/**
 * Verifies a valid session exists and the user is active.
 * Throws 401 if unauthenticated, 403 if the account is inactive.
 */
export async function requireAuth(): Promise<AuthSession> {
    const session = await auth()

    if (!session?.user?.id) {
        throw new AuthorizationError('Unauthenticated', 401)
    }

    // Re-check isActive from DB — cannot rely on JWT alone since it caches state
    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isActive: true },
    })

    if (!dbUser || !dbUser.isActive) {
        throw new AuthorizationError('Account is inactive or does not exist', 403)
    }

    return session as AuthSession
}

/**
 * Verifies session + isActive, then checks role.
 * Accepts a single role or an array (any match is sufficient).
 */
export async function requireRole(
    role: string | string[]
): Promise<AuthSession> {
    const session = await requireAuth()
    const allowed = Array.isArray(role) ? role : [role]

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

/** UNIVERSITY or UNIVERSITY_REP. */
export async function requireUniversityUser(): Promise<AuthSession> {
    return requireRole(['UNIVERSITY', 'UNIVERSITY_REP'])
}

/** STUDENT only. */
export async function requireStudentUser(): Promise<AuthSession> {
    return requireRole('STUDENT')
}

// ── Ownership Helpers ────────────────────────────────────────────────────────

/**
 * Verifies the authenticated user owns the given studentId.
 * Admins bypass this check (they can access all).
 */
export async function requireStudentOwnership(studentId: string): Promise<AuthSession> {
    const session = await requireAuth()

    // Admins can access any student record
    if (session.user.role === 'ADMIN') return session

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
    })

    if (!student) {
        throw new AuthorizationError('Student not found', 403)
    }

    if (student.userId !== session.user.id) {
        throw new AuthorizationError('Forbidden — you do not own this student record', 403)
    }

    return session
}

/**
 * Verifies the authenticated user belongs to the given universityId.
 * UNIVERSITY: must be the direct owner (university.userId === session.user.id)
 * UNIVERSITY_REP: must have universityId === this university
 * ADMIN: bypassed
 */
export async function requireUniversityOwnership(universityId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    if (session.user.role === 'UNIVERSITY') {
        const uni = await prisma.university.findUnique({
            where: { id: universityId },
            select: { userId: true },
        })
        if (!uni || uni.userId !== session.user.id) {
            throw new AuthorizationError('Forbidden — you do not own this university record', 403)
        }
        return session
    }

    if (session.user.role === 'UNIVERSITY_REP') {
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
 * Access is granted if the user is:
 *   - A participant in the meeting, OR
 *   - The university rep who owns the meeting, OR
 *   - An admin
 */
export async function requireMeetingAccess(meetingId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        select: {
            universityId: true,
            repId: true,
            participants: {
                select: { user: { select: { id: true } } },
            },
            university: {
                select: { userId: true },
            },
        },
    })

    if (!meeting) {
        throw new AuthorizationError('Meeting not found', 403)
    }

    const isParticipant = meeting.participants.some(p => p.user?.id === session.user.id)
    const isRep = meeting.repId === session.user.id
    const isUniOwner = meeting.university?.userId === session.user.id

    if (!isParticipant && !isRep && !isUniOwner) {
        throw new AuthorizationError('Forbidden — you are not a participant in this meeting', 403)
    }

    return session
}

/**
 * Verifies the authenticated user can access a direct message conversation.
 * Access: the student side OR the university side of the conversation.
 * Admins bypass.
 */
export async function requireConversationAccess(conversationId: string): Promise<AuthSession> {
    const session = await requireAuth()

    if (session.user.role === 'ADMIN') return session

    const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
            student: { select: { userId: true } },
            university: { select: { userId: true, reps: { select: { id: true } } } },
        },
    })

    if (!conv) {
        throw new AuthorizationError('Conversation not found', 403)
    }

    const isStudent = conv.student.userId === session.user.id
    const isUniOwner = conv.university.userId === session.user.id
    const isUniRep = conv.university.reps.some(r => r.id === session.user.id)

    if (!isStudent && !isUniOwner && !isUniRep) {
        throw new AuthorizationError('Forbidden — you are not part of this conversation', 403)
    }

    return session
}
