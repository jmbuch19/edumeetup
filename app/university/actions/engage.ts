'use server'

/**
 * app/university/actions/engage.ts
 *
 * Two server actions for the Action Centre:
 * 1. sendProactiveMessage — creates ProactiveMessage, notifies student, updates RepPerformance
 * 2. dismissStudent — creates StudentDiscoveryDismissal so rep doesn't see them again
 */

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { revalidatePath } from 'next/cache'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── 1. Send Proactive Message ─────────────────────────────────────────────────
export async function sendProactiveMessage(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {

    const user = await requireUser()

    const studentId = formData.get('studentId') as string
    const universityId = formData.get('universityId') as string
    const repId = (formData.get('repId') as string) || user.id
    const content = (formData.get('content') as string)?.trim()

    if (!studentId || !universityId || !content) {
        return { error: 'Missing required fields.' }
    }
    if (content.length < 20) {
        return { error: 'Message is too short. Write at least a sentence.' }
    }
    if (content.length > 1000) {
        return { error: 'Message is too long. Keep it under 1000 characters.' }
    }

    // ── Verify university ownership ───────────────────────────────────────────
    const university = await prisma.university.findFirst({
        where: { id: universityId, userId: user.id },
        select: { id: true, institutionName: true, proactiveCooldownDays: true },
    })
    if (!university) return { error: 'University not found.' }

    // ── Cooldown check — don't message same student twice within cooldown ──────
    const cooldownDate = new Date(
        Date.now() - university.proactiveCooldownDays * 24 * 60 * 60 * 1000
    )
    const recentMessage = await prisma.proactiveMessage.findFirst({
        where: {
            universityId,
            studentId,
            sentAt: { gte: cooldownDate },
        },
    })
    if (recentMessage) {
        return { error: `You already messaged this student within the last ${university.proactiveCooldownDays} days.` }
    }

    // ── Fetch student for notification ────────────────────────────────────────
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { user: { select: { email: true, name: true } } },
    })
    if (!student) return { error: 'Student not found.' }

    // ── 1. Create ProactiveMessage record ─────────────────────────────────────
    await prisma.proactiveMessage.create({
        data: {
            repId,
            studentId,
            universityId,
            content,
            status: 'SENT',
        },
    })

    // ── 2. In-app notification for student ────────────────────────────────────
    await prisma.studentNotification.create({
        data: {
            studentId,
            title: `💌 ${university.institutionName} wants to connect`,
            message: content.slice(0, 120) + (content.length > 120 ? '...' : ''),
            type: 'INFO',
            actionUrl: '/student/messages',
        },
    })

    // ── 3. Email to student ───────────────────────────────────────────────────
    const studentName = student.user.name || 'there'
    const emailContent = `
    <p>Hi ${studentName},</p>
    <p>A university representative from <strong>${university.institutionName}</strong> has reached out to you on <strong>EdUmeetup</strong>.</p>
    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
      <p style="margin:0 0 10px 0;font-weight:600;color:#3730a3;">Their message:</p>
      <p style="margin:0;color:#374151;white-space:pre-line;">${content}</p>
    </div>
    <p>You can reply to this message and explore ${university.institutionName}'s programmes directly on EdUmeetup.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/student/dashboard" class="btn">View Message &amp; Reply →</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      You're receiving this because a verified university partner found your profile on EdUmeetup.
    </p>
  `

    await sendEmail({
        to: student.user.email,
        subject: `💌 ${university.institutionName} wants to connect with you`,
        html: generateEmailHtml(`Message from ${university.institutionName}`, emailContent),
    })

    // ── 4. Update RepPerformance ──────────────────────────────────────────────
    await prisma.repPerformance.upsert({
        where: { repId },
        update: {
            totalProactiveSent: { increment: 1 },
            points: { increment: 5 },
            lastCalculatedAt: new Date(),
        },
        create: {
            repId,
            totalProactiveSent: 1,
            points: 5,
        },
    })

    // ── 5. Check and award FIRST_NUDGE badge ─────────────────────────────────
    const performance = await prisma.repPerformance.findUnique({
        where: { repId },
        select: { totalProactiveSent: true },
    })

    if (performance?.totalProactiveSent === 1) {
        const alreadyHasBadge = await prisma.repBadge.findFirst({
            where: { repId, badgeType: 'FIRST_NUDGE' },
        })
        if (!alreadyHasBadge) {
            await prisma.repBadge.create({
                data: {
                    repId,
                    badgeType: 'FIRST_NUDGE',
                    name: 'First Nudge — Sent your first proactive message',
                },
            })
        }
    }

    revalidatePath('/university/dashboard')
    return { success: true }
}

// ── 2. Dismiss Student from Discovery Feed ───────────────────────────────────
export async function dismissStudent(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {

    const user = await requireUser()
    const studentId = formData.get('studentId') as string
    const universityId = formData.get('universityId') as string

    if (!studentId || !universityId) return { error: 'Missing fields.' }

    // Verify ownership
    const university = await prisma.university.findFirst({
        where: { id: universityId, userId: user.id },
        select: { id: true },
    })
    if (!university) return { error: 'University not found.' }

    // Upsert — safe if already dismissed
    await prisma.studentDiscoveryDismissal.upsert({
        where: {
            universityId_studentId: { universityId, studentId },
        },
        update: {},
        create: { universityId, studentId },
    })

    revalidatePath('/university/dashboard')
    return { success: true }
}
