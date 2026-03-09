'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'

// ── Segment windows ───────────────────────────────────────────────────────────
const FRESH_DAYS = 30
const DORMANT_DAYS = 60

function daysAgo(n: number) {
    return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type SegmentStudent = {
    id: string
    name: string | null
    email: string
    joinedAt: Date
    lastSeenAt: Date | null
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

/** Students whose User account was created in the last 30 days */
export async function getFreshStudents(): Promise<SegmentStudent[]> {
    const since = daysAgo(FRESH_DAYS)
    const rows = await prisma.student.findMany({
        where: {
            user: { createdAt: { gte: since }, role: 'STUDENT' }
        },
        select: {
            id: true,
            lastSeenAt: true,
            user: { select: { name: true, email: true, createdAt: true } }
        },
        orderBy: { user: { createdAt: 'desc' } },
    })
    return rows.map(r => ({
        id: r.id,
        name: r.user.name,
        email: r.user.email,
        joinedAt: r.user.createdAt,
        lastSeenAt: r.lastSeenAt,
    }))
}

/** Students who joined >60 days ago AND haven't been seen in 60 days */
export async function getDormantStudents(): Promise<SegmentStudent[]> {
    const cutoff = daysAgo(DORMANT_DAYS)
    const rows = await prisma.student.findMany({
        where: {
            user: {
                createdAt: { lt: cutoff },  // joined before the window
                role: 'STUDENT'
            },
            OR: [
                { lastSeenAt: null },           // never logged in after field was added
                { lastSeenAt: { lt: cutoff } }, // last seen before cutoff
            ]
        },
        select: {
            id: true,
            lastSeenAt: true,
            user: { select: { name: true, email: true, createdAt: true } }
        },
        orderBy: { lastSeenAt: 'asc' }, // oldest first
    })
    return rows.map(r => ({
        id: r.id,
        name: r.user.name,
        email: r.user.email,
        joinedAt: r.user.createdAt,
        lastSeenAt: r.lastSeenAt,
    }))
}

// ── Bulk nudge (in-app notification only) ─────────────────────────────────────

export async function nudgeSegment(
    segment: 'fresh' | 'dormant',
    title: string,
    message: string,
): Promise<{ sent: number; error?: string }> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { sent: 0, error: 'Unauthorized' }
    if (!title.trim() || !message.trim()) return { sent: 0, error: 'Title and message are required' }

    const students = segment === 'fresh'
        ? await getFreshStudents()
        : await getDormantStudents()

    if (students.length === 0) return { sent: 0 }

    await prisma.studentNotification.createMany({
        data: students.map(s => ({
            studentId: s.id,
            title: title.trim(),
            message: message.trim(),
            type: 'INFO' as const,
        })),
        skipDuplicates: true,
    })

    return { sent: students.length }
}

// ── Bulk email ────────────────────────────────────────────────────────────────

export async function emailSegment(
    segment: 'fresh' | 'dormant',
    subject: string,
    body: string,
): Promise<{ sent: number; failed: number; error?: string }> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { sent: 0, failed: 0, error: 'Unauthorized' }
    if (!subject.trim() || !body.trim()) return { sent: 0, failed: 0, error: 'Subject and body are required' }

    const students = segment === 'fresh'
        ? await getFreshStudents()
        : await getDormantStudents()

    if (students.length === 0) return { sent: 0, failed: 0 }

    let sent = 0
    let failed = 0

    // Sequential — avoids SMTP/Resend rate limit blasts
    for (const student of students) {
        try {
            await sendEmail({
                to: student.email,
                subject: `[EdUmeetup] ${subject.trim()}`,
                html: generateEmailHtml(subject.trim(), EmailTemplates.announcement(subject.trim(), body.trim())),
            })
            sent++
        } catch (e) {
            console.error(`[emailSegment] failed for ${student.email}:`, e)
            failed++
        }
    }

    return { sent, failed }
}
