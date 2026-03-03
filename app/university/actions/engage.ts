'use server'

/**
 * app/university/actions/engage.ts
 *
 * Action Centre server actions:
 *   sendProactiveMessage — send a nudge to a discoverable student
 *   dismissStudent       — hide a student from the discovery feed for this university
 */

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── Send proactive message (Action Centre version) ────────────────────
export async function sendProactiveMessage(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const studentId = formData.get('studentId')?.toString().trim()
    const universityId = formData.get('universityId')?.toString().trim()
    const repId = formData.get('repId')?.toString().trim()
    const content = formData.get('content')?.toString().trim()

    if (!studentId || !universityId || !repId || !content) {
        return { error: 'Missing required fields.' }
    }
    if (content.length < 20) return { error: 'Message must be at least 20 characters.' }
    if (content.length > 1000) return { error: 'Message must be under 1000 characters.' }

    // Load university
    const uni = await prisma.university.findUnique({
        where: { id: universityId },
        select: { id: true, institutionName: true, verificationStatus: true, proactiveCooldownDays: true },
    })
    if (!uni) return { error: 'University not found.' }
    if (uni.verificationStatus !== 'VERIFIED') return { error: 'Only verified universities can send messages.' }

    // Load student (consent check)
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: { select: { name: true, email: true, consentMarketing: true, consentWithdrawnAt: true } },
            bookmarks: { where: { universityId }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
    })
    if (!student) return { error: 'Student not found.' }
    if (!student.user.consentMarketing || student.user.consentWithdrawnAt) {
        return { error: 'Student has not consented to marketing messages.' }
    }

    // Cooldown check (per universityId + studentId)
    const cooldownDays = uni.proactiveCooldownDays ?? 21
    const cooldownDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000)
    const recentNudge = await prisma.proactiveMessage.findFirst({
        where: { universityId, studentId, sentAt: { gte: cooldownDate } },
        orderBy: { sentAt: 'desc' },
    })

    if (recentNudge) {
        const newBookmark = student.bookmarks[0] && student.bookmarks[0].createdAt > recentNudge.sentAt
        const profileUpdated = student.updatedAt > recentNudge.sentAt
        if (!newBookmark && !profileUpdated) {
            const daysAgo = Math.floor((Date.now() - recentNudge.sentAt.getTime()) / (1000 * 60 * 60 * 24))
            return { error: `Already nudged ${daysAgo} day(s) ago. ${cooldownDays - daysAgo} days left on cooldown.` }
        }
    }

    // Rep name for email
    const rep = await prisma.user.findUnique({ where: { id: repId }, select: { name: true } })
    const repName = rep?.name || 'The Admissions Team'

    // Create message record
    await prisma.proactiveMessage.create({
        data: { repId, studentId, universityId, content, status: 'SENT' },
    })

    // In-app notification for student
    await prisma.studentNotification.create({
        data: {
            studentId,
            title: `${uni.institutionName} reached out to you`,
            message: `A representative from ${uni.institutionName} sent you a personal message.`,
            type: 'INFO',
            actionUrl: `/universities`,
        },
    })

    // Email to student
    const firstName = student.user.name?.split(' ')[0] ?? 'there'
    const html = generateEmailHtml(
        `A message from ${uni.institutionName}`,
        `<p>Hi ${firstName},</p>
     <p><strong>${uni.institutionName}</strong> found your profile and wanted to reach out personally.</p>
     <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
       <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#3333cc;">Message from ${repName}:</p>
       <p style="margin:0;white-space:pre-wrap;">${content}</p>
     </div>
     <p style="text-align:center;margin-top:24px;">
       <a href="${BASE_URL}/universities" class="btn">View ${uni.institutionName}'s Profile →</a>
     </p>`
    )
    await sendEmail({
        to: student.user.email,
        subject: `${uni.institutionName} would love to connect with you`,
        html,
    })

    revalidatePath('/university/dashboard')
    return { success: true }
}

// ── Dismiss student from discovery feed ────────────────────────────────
export async function dismissStudent(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const studentId = formData.get('studentId')?.toString().trim()
    const universityId = formData.get('universityId')?.toString().trim()

    if (!studentId || !universityId) return { error: 'Missing fields.' }

    // Upsert — safe to call multiple times
    await prisma.studentDiscoveryDismissal.upsert({
        where: { universityId_studentId: { universityId, studentId } },
        update: { dismissedAt: new Date() },
        create: { universityId, studentId },
    })

    revalidatePath('/university/dashboard')
    return { success: true }
}
