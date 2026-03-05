'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendNudgeEmail } from '@/lib/email'
import { buildFilterWhere, computeProfileComplete } from '@/lib/admin/student-filters'
import type { StudentFilter } from '@/lib/admin/student-filters'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

async function requireAdmin() {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') redirect('/admin/dashboard')
    return session.user
}

// ── Sync profile complete flag ────────────────────────────────────────────────
export async function syncProfileComplete(studentId: string) {
    await requireAdmin()
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return { error: 'Student not found' }
    const { isComplete } = computeProfileComplete(student)
    await prisma.student.update({ where: { id: studentId }, data: { profileComplete: isComplete } })
    revalidatePath(`/admin/users/${student.userId}`)
    return { success: true, isComplete }
}

// ── Block ─────────────────────────────────────────────────────────────────────
export async function blockUser(formData: FormData) {
    const admin = await requireAdmin()
    const userId = formData.get('userId') as string
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } })
    await prisma.auditLog.create({
        data: { action: 'ADMIN_USER_BLOCKED', entityType: 'USER', entityId: userId, actorId: admin.id }
    })
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
}

// ── Unblock ───────────────────────────────────────────────────────────────────
export async function unblockUser(formData: FormData) {
    const admin = await requireAdmin()
    const userId = formData.get('userId') as string
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } })
    await prisma.auditLog.create({
        data: { action: 'ADMIN_USER_UNBLOCKED', entityType: 'USER', entityId: userId, actorId: admin.id }
    })
    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
}

// ── Delete user ───────────────────────────────────────────────────────────────
export async function deleteUser(userId: string) {
    await requireAdmin()
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    if (!user) return { error: 'User not found' }
    if (user.role === 'ADMIN') return { error: 'Cannot delete admin accounts' }
    await prisma.user.delete({ where: { id: userId } })
    revalidatePath('/admin/users')
    return { success: true }
}

// ── Edit email ────────────────────────────────────────────────────────────────
export async function updateUserEmail(formData: FormData) {
    const admin = await requireAdmin()
    const userId = formData.get('userId') as string
    const newEmail = (formData.get('newEmail') as string)?.trim().toLowerCase()

    if (!newEmail?.includes('@')) return { error: 'Invalid email format' }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } })
    if (existing && existing.id !== userId) return { error: 'Email already registered to another account' }

    const old = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

    await prisma.user.update({
        where: { id: userId },
        data: { email: newEmail, emailVerified: null },
    })

    // Audit log — non-critical, don't let it fail the action
    try {
        await prisma.auditLog.create({
            data: {
                action: 'ADMIN_EMAIL_UPDATED', entityType: 'USER', entityId: userId,
                actorId: admin.id,
            }
        })
    } catch (e) {
        console.error('[AUDIT] auditLog.create failed (email update):', e)
    }

    revalidatePath(`/admin/users/${userId}`)
    return { success: true }
}

// ── Segment nudge ─────────────────────────────────────────────────────────────
export async function sendSegmentNudge(formData: FormData) {
    const admin = await requireAdmin()
    const filter = formData.get('filter') as StudentFilter
    const title = (formData.get('title') as string)?.trim()
    const message = (formData.get('message') as string)?.trim()
    const sendEmailFlag = formData.get('sendEmail') === 'true'

    if (!filter || !title || !message) return { error: 'Missing required fields' }
    if (message.length > 500) return { error: 'Message must be under 500 characters' }

    const where = buildFilterWhere(filter)
    const users = await prisma.user.findMany({
        where: { ...where, isActive: true },
        select: {
            id: true,
            email: true,
            name: true,
            consentMarketing: true,
            student: { select: { fullName: true } },
        },
        take: 500,
    })

    console.log(`[NUDGE] filter=${filter} users=${users.length} sendEmail=${sendEmailFlag}`)
    if (users.length === 0) return { error: 'No active students match this filter' }

    // Determine CTA for fair segments
    const isFairFilter = filter.startsWith('fair_')
    const ctaText = filter === 'fair_registered' ? 'Complete Your Profile' : 'Open EdUmeetup'
    const ctaUrl = filter === 'fair_registered' ? '/onboarding/student' : '/student/dashboard'

    // Batch in-app notifications (single round trip)
    const notifData = users.map(user => {
        const firstName = user.student?.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'there'
        return {
            userId: user.id,
            title: title.replace(/\{\{name\}\}/g, firstName),
            message: message.replace(/\{\{name\}\}/g, firstName),
            type: 'INFO' as const,
        }
    })
    const { count: notified } = await prisma.notification.createMany({
        data: notifData,
        skipDuplicates: true,
    })

    // Emails — non-blocking, respect consentMarketing for fair segments
    let emailed = 0
    let failed = 0
    if (sendEmailFlag) {
        const emailTargets = isFairFilter
            ? users.filter(u => u.consentMarketing)
            : users
        const emailResults = await Promise.allSettled(
            emailTargets.map(user => {
                const firstName = user.student?.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'there'
                return sendNudgeEmail({
                    to: user.email,
                    subject: title.replace(/\{\{name\}\}/g, firstName),
                    message: message.replace(/\{\{name\}\}/g, firstName),
                    ctaText,
                    ctaUrl,
                })
            })
        )
        emailed = emailResults.filter(r => r.status === 'fulfilled').length
        failed = emailResults.filter(r => r.status === 'rejected').length
    }

    console.log(`[NUDGE] Done: notified=${notified} emailed=${emailed} failed=${failed}`)

    // Audit log — non-critical
    try {
        await prisma.auditLog.create({
            data: { action: 'ADMIN_SEGMENT_NUDGE_SENT', entityType: 'CAMPAIGN', entityId: filter, actorId: admin.id }
        })
    } catch (e) {
        console.error('[AUDIT] auditLog.create failed (nudge):', e)
    }

    return { success: true, notified, emailed, failed }
}


// ── Targeted in-app notification (called from filter bar client component) ────
export async function notifyFilteredStudents(
    studentIds: string[], // in this context these are userIds
    title: string,
    message: string
) {
    await requireAdmin()
    if (!studentIds.length) return { error: 'No students selected' }
    if (!title || !message) return { error: 'Title and message required' }

    // Write to Notification table (userId-based) — what the header bell reads
    await prisma.notification.createMany({
        data: studentIds.map((userId) => ({
            userId, title, message, type: 'INFO' as const,
        })),
        skipDuplicates: true,
    })

    revalidatePath('/admin/users')
    return { success: true, count: studentIds.length }
}

// ── Fair filter counts ─────────────────────────────────────────────────────────
export async function getFairFilterCounts() {
    await requireAdmin()
    const [fairRegistered, fairAttended, fairNotAttended, fairWalkins] = await Promise.all([
        // Students with at least one fair pass linked to their account
        prisma.student.count({
            where: { fairPasses: { some: {} } },
        }),
        // Students who visited at least one university booth
        prisma.student.count({
            where: { fairPasses: { some: { attendances: { some: {} } } } },
        }),
        // Students who registered but never scanned at a booth
        prisma.student.count({
            where: { fairPasses: { some: { attendances: { none: {} } } } },
        }),
        // Walk-in pass holders — no edUmeetup account (studentId IS NULL)
        prisma.fairStudentPass.count({
            where: { studentId: null },
        }),
    ])
    return { fairRegistered, fairAttended, fairNotAttended, fairWalkins }
}

// ── Nudge fair walk-ins via email (only) ───────────────────────────────────────
export async function nudgeFairWalkins(message: string, ctaUrl: string) {
    const admin = await requireAdmin()
    if (!message?.trim()) return { error: 'Message is required' }

    const walkIns = await prisma.fairStudentPass.findMany({
        where: {
            studentId: null,           // no edUmeetup account
            emailConsent: true,        // only those who consented
        },
        select: {
            id: true,
            email: true,
            fullName: true,
            fairEvent: { select: { name: true } },
        },
        take: 500,
    })

    if (walkIns.length === 0) return { success: true, notified: 0, emailed: 0, failed: 0 }

    const emailResults = await Promise.allSettled(
        walkIns.map(pass => {
            const firstName = pass.fullName?.split(' ')[0] || 'there'
            const personalised = message.replace(/\{\{name\}\}/g, firstName)
            const body = `${personalised}\n\nYou visited <strong>${pass.fairEvent.name}</strong>. The universities you spoke with are ready to connect.`
            return sendNudgeEmail({
                to: pass.email,
                subject: 'Your EdUmeetup fair visit summary',
                message: body,
                ctaText: 'Join edUmeetup Free',
                ctaUrl,
            })
        })
    )

    const emailed = emailResults.filter(r => r.status === 'fulfilled').length
    const failed = emailResults.filter(r => r.status === 'rejected').length

    try {
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'ADMIN_FAIR_WALKIN_NUDGE',
                message: `[summary] sent:${emailed} failed:${failed}`,
                metadata: JSON.stringify({ sent: emailed, failed, total: walkIns.length, ctaUrl, adminId: admin.id }),
            },
        })
    } catch (e) {
        console.error('[FAIR_WALKIN_NUDGE] systemLog.create failed:', e)
    }

    return { success: true, notified: 0, emailed, failed }
}
