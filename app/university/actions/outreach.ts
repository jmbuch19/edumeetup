'use server'

/**
 * app/university/actions/outreach.ts
 *
 * Proactive Outreach server action.
 * A university rep sends a personalised nudge to a student who hasn't
 * expressed interest yet.
 *
 * Rules:
 *  - Caller must be a UNIVERSITY user with a matching universityId
 *  - Target student must have consentMarketing: true + complete profile
 *  - Per-university cooldown (default 21 days, configurable per uni)
 *    — per (universityId, studentId) pair, NOT per repId
 *  - Cooldown resets if student bookmarked this uni or updated profile
 *    since the last nudge
 */

import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { maskName, maskScore } from '@/lib/outreach-utils'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── Main action ────────────────────────────────────────────────────────
export async function sendProactiveMessage(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {

    const session = await auth()
    if (!session?.user) redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            universityId: true,
        },
    })

    if (!user || user.role !== 'UNIVERSITY') {
        return { error: 'Only university accounts can send proactive messages.' }
    }

    // Load university (for cooldown + verification check)
    const uni = await prisma.university.findFirst({
        where: { userId: user.id },
        select: {
            id: true,
            institutionName: true,
            verificationStatus: true,
            proactiveCooldownDays: true,
        },
    })

    if (!uni) return { error: 'University profile not found.' }
    if (uni.verificationStatus !== 'VERIFIED') {
        return { error: 'Only verified universities can send proactive messages.' }
    }

    // Parse input
    const studentId = formData.get('studentId')?.toString().trim()
    const subject = formData.get('subject')?.toString().trim()
    const content = formData.get('content')?.toString().trim()

    if (!studentId) return { error: 'Student ID is required.' }
    if (!content || content.length < 20) return { error: 'Message must be at least 20 characters.' }
    if (content.length > 1000) return { error: 'Message must be under 1000 characters.' }

    // Load student — must be consenting + complete
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: { select: { id: true, name: true, email: true, consentMarketing: true, consentWithdrawnAt: true } },
            bookmarks: { where: { universityId: uni.id }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
    })

    if (!student) return { error: 'Student not found.' }
    if (!student.profileComplete) return { error: 'Student profile is incomplete.' }
    if (!student.user.consentMarketing || student.user.consentWithdrawnAt) {
        return { error: 'This student has not consented to marketing messages.' }
    }

    // ── Cooldown check (per universityId + studentId) ──────────────────
    const cooldownDays = uni.proactiveCooldownDays ?? 21
    const cooldownDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000)

    const recentNudge = await prisma.proactiveMessage.findFirst({
        where: {
            universityId: uni.id,
            studentId: student.id,
            sentAt: { gte: cooldownDate },
        },
        orderBy: { sentAt: 'desc' },
    })

    if (recentNudge) {
        // Check re-engagement override: student bookmarked this uni or updated profile after last nudge
        const newBookmark = student.bookmarks[0] && student.bookmarks[0].createdAt > recentNudge.sentAt
        const profileUpdated = student.updatedAt > recentNudge.sentAt

        if (!newBookmark && !profileUpdated) {
            const daysAgo = Math.floor((Date.now() - recentNudge.sentAt.getTime()) / (1000 * 60 * 60 * 24))
            const daysLeft = cooldownDays - daysAgo
            return { error: `This student was already nudged ${daysAgo} day${daysAgo > 1 ? 's' : ''} ago. ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining on cooldown.` }
        }
    }

    // ── Create ProactiveMessage ────────────────────────────────────────
    await prisma.proactiveMessage.create({
        data: {
            repId: user.id,
            studentId: student.id,
            universityId: uni.id,
            subject: subject || `A message from ${uni.institutionName}`,
            content,
            status: 'SENT',
        },
    })

    // ── In-app student notification ────────────────────────────────────
    await prisma.studentNotification.create({
        data: {
            studentId: student.id,
            title: `${uni.institutionName} reached out to you`,
            message: `A representative from ${uni.institutionName} sent you a message. Check it out!`,
            type: 'INFO',
            actionUrl: `/universities`,
        },
    })

    // ── Email to student ──────────────────────────────────────────────
    const repName = user.name || 'The Admissions Team'
    const greeting = student.user.name ? `Hi ${student.user.name.split(' ')[0]}` : 'Hi'

    const emailHtml = generateEmailHtml(
        `A message from ${uni.institutionName}`,
        `
    <p>${greeting},</p>
    <p>A representative from <strong>${uni.institutionName}</strong> noticed your profile on EdUmeetup
    and wanted to reach out personally.</p>

    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#3333cc;">Message from ${repName}:</p>
      <p style="margin:0;white-space:pre-wrap;">${content}</p>
    </div>

    <p>Interested? View their Official Profile and explore their programs directly.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/universities" class="btn">View ${uni.institutionName}'s Profile →</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:32px;">
      You received this because you opted in to university outreach on EdUmeetup.
      You can update your preferences in your student settings.
    </p>
    `
    )

    await sendEmail({
        to: student.user.email,
        subject: subject || `${uni.institutionName} would love to connect with you`,
        html: emailHtml,
    })

    revalidatePath('/university/dashboard')
    revalidatePath('/university/outreach')

    return { success: true }
}

// ── Load nudgeable students (for the dashboard tab) ────────────────────
export async function getNudgeableStudents(universityId: string) {
    const uni = await prisma.university.findUnique({
        where: { id: universityId },
        select: { country: true, programs: { select: { fieldCategory: true } } },
    })

    const programFields = [...new Set(uni?.programs.map(p => p.fieldCategory) ?? [])]

    // Students who: have a complete profile, consent to marketing, haven't expressed
    // interest in this university yet, and have a matching field of interest
    const students = await prisma.student.findMany({
        where: {
            profileComplete: true,
            user: { consentMarketing: true, consentWithdrawnAt: null, isActive: true },
            interests: { none: { universityId } },
            ...(programFields.length > 0 ? {
                fieldOfInterest: { in: programFields },
            } : {}),
        },
        select: {
            id: true,
            country: true,
            city: true,
            fieldOfInterest: true,
            preferredDegree: true,
            preferredIntake: true,
            budgetRange: true,
            englishTestType: true,
            englishScore: true,
            updatedAt: true,
            user: { select: { name: true } },
            bookmarks: { where: { universityId }, select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        take: 30,
    })

    // Fetch last nudge per student for this university (for cooldown display)
    const studentIds = students.map(s => s.id)
    const lastNudges = await prisma.proactiveMessage.findMany({
        where: { universityId, studentId: { in: studentIds } },
        orderBy: { sentAt: 'desc' },
        select: { studentId: true, sentAt: true },
    })
    const nudgeMap = new Map<string, Date>()
    for (const n of lastNudges) {
        if (!nudgeMap.has(n.studentId)) nudgeMap.set(n.studentId, n.sentAt)
    }

    const cooldownDays = (await prisma.university.findUnique({
        where: { id: universityId },
        select: { proactiveCooldownDays: true },
    }))?.proactiveCooldownDays ?? 21

    return students.map(s => ({
        id: s.id,
        maskedName: maskName(s.user.name),
        country: s.country ?? 'Unknown',
        city: s.city ?? '',
        fieldOfInterest: s.fieldOfInterest ?? '',
        preferredDegree: s.preferredDegree ?? '',
        preferredIntake: s.preferredIntake ?? '',
        budgetRange: s.budgetRange ?? '',
        scoreLabel: maskScore(s.englishScore, s.englishTestType),
        lastNudgedAt: nudgeMap.get(s.id) ?? null,
        cooldownDays,
        // Re-engagement signals
        bookmarkedAfterNudge: s.bookmarks[0]
            ? nudgeMap.has(s.id) && s.bookmarks[0].createdAt > nudgeMap.get(s.id)!
            : false,
        profileUpdatedAfterNudge: nudgeMap.has(s.id)
            ? s.updatedAt > nudgeMap.get(s.id)!
            : false,
    }))
}
