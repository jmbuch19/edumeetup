'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'
import { validateFileSignature } from '@/lib/file-signature'

// ── Segment windows ───────────────────────────────────────────────────────────
const FRESH_DAYS = 30
const DORMANT_DAYS = 60
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024 // 5 MB

// Duplicate-guard windows
const NUDGE_GUARD_HOURS = 24      // warn if same segment nudged within 24 h
const EMAIL_GUARD_DAYS = 7        // warn if same segment emailed within 7 days

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

export type RecentActivity = {
    adminName: string | null
    adminEmail: string | null
    sentAt: Date
    count: number
    subject?: string | null
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
                createdAt: { lt: cutoff },
                role: 'STUDENT'
            },
            OR: [
                { lastSeenAt: null },
                { lastSeenAt: { lt: cutoff } },
            ]
        },
        select: {
            id: true,
            lastSeenAt: true,
            user: { select: { name: true, email: true, createdAt: true } }
        },
        orderBy: { lastSeenAt: 'asc' },
    })
    return rows.map(r => ({
        id: r.id,
        name: r.user.name,
        email: r.user.email,
        joinedAt: r.user.createdAt,
        lastSeenAt: r.lastSeenAt,
    }))
}

// ── Duplicate-send guard ───────────────────────────────────────────────────────

/**
* Checks whether this segment was nudged/emailed recently.
* Returns the most recent activity record, or null if safe to proceed.
*/
export async function getRecentSegmentActivity(
    segment: 'fresh' | 'dormant',
    type: 'nudge' | 'email',
): Promise<RecentActivity | null> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return null

    const logType = type === 'nudge' ? 'SEGMENT_NUDGE' : 'SEGMENT_EMAIL'
    const windowMs = type === 'nudge'
        ? NUDGE_GUARD_HOURS * 60 * 60 * 1000
        : EMAIL_GUARD_DAYS * 24 * 60 * 60 * 1000
    const since = new Date(Date.now() - windowMs)

    const log = await prisma.systemLog.findFirst({
        where: {
            type: logType,
            createdAt: { gte: since },
            metadata: { path: ['segment'], equals: segment },
        },
        orderBy: { createdAt: 'desc' },
    })

    if (!log) return null

    const meta = log.metadata as Record<string, unknown>
    return {
        adminName: (meta.adminName as string) ?? null,
        adminEmail: (meta.adminEmail as string) ?? null,
        sentAt: log.createdAt,
        count: (meta.count as number) ?? 0,
        subject: (meta.subject as string) ?? null,
    }
}

// ── Bulk nudge (in-app only — no attachments) ─────────────────────────────────

export async function nudgeSegment(
    segment: 'fresh' | 'dormant',
    title: string,
    message: string,
    overrideReason?: string,
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

    // Log for duplicate-guard
    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'SEGMENT_NUDGE',
            message: `Nudge sent to ${segment} segment (${students.length} students)`,
            metadata: {
                segment,
                adminName: session.user?.name ?? null,
                adminEmail: session.user?.email ?? null,
                count: students.length,
                title: title.trim(),
                ...(overrideReason ? { overrideReason } : {}),
            },
        },
    }).catch(() => { /* non-fatal */ })

    return { sent: students.length }
}

// ── Bulk email (FormData — enables optional file attachment) ──────────────────

export async function emailSegment(
    formData: FormData,
): Promise<{ sent: number; failed: number; error?: string }> {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { sent: 0, failed: 0, error: 'Unauthorized' }

    const segment = formData.get('segment') as 'fresh' | 'dormant'
    const subject = (formData.get('subject') as string)?.trim()
    const body = (formData.get('body') as string)?.trim()
    const attachmentFile = formData.get('attachment') as File | null
    const overrideReason = (formData.get('overrideReason') as string)?.trim() || undefined

    if (!segment || !subject || !body) return { sent: 0, failed: 0, error: 'Subject and body are required' }

    // Parse and validate optional attachment
    let attachment: { filename: string; content: Buffer } | undefined
    if (attachmentFile && attachmentFile.size > 0) {
        if (attachmentFile.size > MAX_ATTACHMENT_BYTES) {
            return { sent: 0, failed: 0, error: 'Attachment too large (max 5 MB)' }
        }
        const buf = Buffer.from(await attachmentFile.arrayBuffer())
        if (!validateFileSignature(buf, attachmentFile.type)) {
            return { sent: 0, failed: 0, error: 'Attachment content does not match declared type' }
        }
        attachment = { filename: attachmentFile.name, content: buf }
    }

    const students = segment === 'fresh'
        ? await getFreshStudents()
        : await getDormantStudents()

    if (students.length === 0) return { sent: 0, failed: 0 }

    let sent = 0
    let failed = 0

    for (const student of students) {
        try {
            await sendEmail({
                to: student.email,
                subject: `[EdUmeetup] ${subject}`,
                html: generateEmailHtml(subject, EmailTemplates.announcement(subject, body)),
                ...(attachment ? { attachments: [attachment] } : {}),
            })
            sent++
        } catch (e) {
            console.error(`[emailSegment] failed for ${student.email}:`, e)
            failed++
        }
    }

    // Log for duplicate-guard
    await prisma.systemLog.create({
        data: {
            level: 'INFO',
            type: 'SEGMENT_EMAIL',
            message: `Email sent to ${segment} segment (${sent} sent, ${failed} failed)`,
            metadata: {
                segment,
                adminName: session.user?.name ?? null,
                adminEmail: session.user?.email ?? null,
                count: sent,
                subject,
                hasAttachment: !!attachment,
                ...(overrideReason ? { overrideReason } : {}),
            },
        },
    }).catch(() => { /* non-fatal */ })

    return { sent, failed }
}
