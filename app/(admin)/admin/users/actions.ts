'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendEmail, generateEmailHtml } from '@/lib/email'
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
    // Query all matching active students — no need for student relation since we use userId
    const users = await prisma.user.findMany({
        where: { ...where, isActive: true },
        select: { id: true, email: true, name: true, student: { select: { fullName: true } } },
        take: 500,
    })

    console.log(`[NUDGE] filter=${filter} users=${users.length} sendEmail=${sendEmailFlag}`)

    if (users.length === 0) return { error: 'No active students match this filter' }

    let notifCount = 0
    let emailCount = 0

    for (const user of users) {
        const firstName = user.student?.fullName?.split(' ')[0] || user.name?.split(' ')[0] || 'there'
        const msg = message.replace(/\{\{name\}\}/g, firstName)
        const ttl = title.replace(/\{\{name\}\}/g, firstName)

        // Write to the Notification table (what the header bell reads from)
        try {
            await prisma.notification.create({
                data: { userId: user.id, title: ttl, message: msg, type: 'INFO' }
            })
            notifCount++
        } catch (e) {
            console.error(`[NUDGE] Failed notification for userId=${user.id}:`, e)
        }

        if (sendEmailFlag) {
            try {
                await sendEmail({
                    to: user.email,
                    subject: ttl,
                    html: generateEmailHtml(ttl, `
            <p>Hi ${firstName},</p>
            <p>${msg}</p>
            <p style="text-align:center;margin-top:24px;">
              <a href="${BASE_URL}/student/dashboard" style="background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Go to Dashboard →</a>
            </p>
            <p style="font-size:12px;color:#94a3b8;">Sent by the EdUmeetup team.</p>
          `),
                })
                emailCount++
                // Throttle: Resend free tier allows ~2 req/sec — avoid silent drops
                await new Promise(r => setTimeout(r, 300))
            } catch (e) {
                console.error(`[NUDGE] Failed email to ${user.email}:`, e)
            }
        }
    }

    console.log(`[NUDGE] Done: notifCount=${notifCount} emailCount=${emailCount}`)

    // Audit log — non-critical
    try {
        await prisma.auditLog.create({
            data: { action: 'ADMIN_SEGMENT_NUDGE_SENT', entityType: 'CAMPAIGN', entityId: filter, actorId: admin.id }
        })
    } catch (e) {
        console.error('[AUDIT] auditLog.create failed (nudge):', e)
    }

    return { success: true, recipientCount: notifCount, notifCount, emailCount }
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

// ── Nudge fair walk-ins via email ──────────────────────────────────────────────
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

    if (walkIns.length === 0) return { success: true, sent: 0, skipped: 0 }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || BASE_URL
    let sent = 0
    let skipped = 0

    for (const pass of walkIns) {
        if (!pass.email) { skipped++; continue }
        const firstName = pass.fullName?.split(' ')[0] || 'there'
        const subject = 'Your EdUmeetup fair visit summary'
        const body = message.replace(/\{\{name\}\}/g, firstName)
        const htmlContent = `
            <p>Hi ${firstName},</p>
            <p>${body}</p>
            <p>You visited <strong>${pass.fairEvent.name}</strong>. The universities you spoke with are ready to connect.</p>
            <p style="text-align:center;margin-top:24px;">
              <a href="${appUrl}${ctaUrl}" style="background:#6366f1;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Get Started →</a>
            </p>
            <p style="font-size:12px;color:#94a3b8;">Sent by the EdUmeetup team. You received this because you registered a fair pass at ${pass.fairEvent.name}.</p>
        `
        try {
            await sendEmail({
                to: pass.email,
                subject,
                html: generateEmailHtml(subject, htmlContent),
            })
            sent++
            // Throttle: avoid Resend free-tier rate limits
            await new Promise(r => setTimeout(r, 300))
        } catch (e) {
            console.error(`[FAIR_WALKIN_NUDGE] Email failed for pass ${pass.id}:`, e)
            skipped++
        }
    }

    // Audit to SystemLog
    try {
        await prisma.systemLog.create({
            data: {
                level: 'INFO',
                type: 'ADMIN_FAIR_WALKIN_NUDGE',
                message: `[done] sent:${sent} skipped:${skipped} adminId:${admin.id}`,
                metadata: JSON.stringify({ sent, skipped, ctaUrl, adminId: admin.id }),
            },
        })
    } catch (e) {
        console.error('[FAIR_WALKIN_NUDGE] systemLog.create failed:', e)
    }

    return { success: true, sent, skipped }
}
