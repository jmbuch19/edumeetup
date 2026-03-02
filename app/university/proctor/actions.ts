'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { logSystemEvent } from '@/lib/system-log'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jaydeep@edumeetup.com'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── Submit a proctor request (university side) ─────────────────────────────────
export async function submitProctorRequest(
    prevState: { error?: string; success?: boolean },
    formData: FormData
): Promise<{ error?: string; success?: boolean }> {
    const session = await auth()
    if (!session?.user?.id) return { error: 'Unauthorised' }

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id },
        select: { id: true, institutionName: true, repName: true, repEmail: true, contactEmail: true },
    })
    if (!university) return { error: 'University profile not found' }

    const examStartDate = formData.get('examStartDate') as string
    const examEndDate = formData.get('examEndDate') as string
    const subjects = (formData.get('subjects') as string)?.trim()
    const studentCount = parseInt(formData.get('studentCount') as string, 10)
    const examType = formData.get('examType') as string
    const durationMinutes = parseInt(formData.get('durationMinutes') as string, 10) || 120
    const requirements = (formData.get('requirements') as string)?.trim() || null
    const policyUrl = (formData.get('policyUrl') as string)?.trim() || null

    if (!examStartDate || !examEndDate || !subjects || !studentCount || !examType) {
        return { error: 'Please fill in all required fields.' }
    }

    const request = await prisma.proctorRequest.create({
        data: {
            universityId: university.id,
            examStartDate: new Date(examStartDate),
            examEndDate: new Date(examEndDate),
            subjects,
            studentCount,
            examType,
            durationMinutes,
            requirements,
            policyUrl,
        },
    })

    const fmt = (d: string) =>
        new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    // ── Notify admin ──────────────────────────────────────────────────────────
    const adminHtml = `
    <p>A verified university has submitted a proctor service request.</p>
    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#3730a3;font-size:13px;text-transform:uppercase;">🏛️ University</p>
      <div class="info-row"><span class="info-label">Institution:</span> <strong>${university.institutionName}</strong></div>
      <div class="info-row"><span class="info-label">Contact:</span> ${university.repName || 'N/A'}</div>
      <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${university.repEmail || university.contactEmail}">${university.repEmail || university.contactEmail}</a></div>
    </div>
    <div class="info-box" style="margin-top:16px;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#0f172a;font-size:13px;text-transform:uppercase;">📋 Exam Details</p>
      <div class="info-row"><span class="info-label">Start:</span> <strong>${fmt(examStartDate)}</strong></div>
      <div class="info-row"><span class="info-label">End:</span> ${fmt(examEndDate)}</div>
      <div class="info-row"><span class="info-label">Duration:</span> ${durationMinutes} minutes</div>
      <div class="info-row"><span class="info-label">Subjects:</span> ${subjects}</div>
      <div class="info-row"><span class="info-label">Students:</span> <strong>${studentCount}</strong></div>
      <div class="info-row"><span class="info-label">Type:</span> ${examType}</div>
      ${policyUrl ? `<div class="info-row"><span class="info-label">Policy URL:</span> <a href="${policyUrl}">${policyUrl}</a></div>` : ''}
    </div>
    ${requirements ? `
    <div class="info-box" style="margin-top:16px;background:#fefce8;border-color:#fef08a;">
      <p style="margin:0 0 8px 0;font-weight:700;color:#713f12;font-size:13px;">📝 Special Requirements</p>
      <p style="margin:0;color:#78350f;">${requirements}</p>
    </div>` : ''}
    <hr/>
    <p><a href="${BASE_URL}/admin/proctor" class="btn">Manage in Admin Dashboard →</a></p>
  `

    await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🛡️ Proctor Request — ${university.institutionName} · ${studentCount} students · ${fmt(examStartDate)}`,
        html: generateEmailHtml('New Proctor Service Request', adminHtml),
        replyTo: university.repEmail || university.contactEmail || undefined,
    })

    // ── Confirmation to university ────────────────────────────────────────────
    const uniEmail = university.repEmail || university.contactEmail
    if (uniEmail) {
        const uniHtml = `
      <p>Dear ${university.repName || 'Team'},</p>
      <p>Your proctor service request has been received and is pending review.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Exam Start:</span> ${fmt(examStartDate)}</div>
        <div class="info-row"><span class="info-label">Exam End:</span> ${fmt(examEndDate)}</div>
        <div class="info-row"><span class="info-label">Subjects:</span> ${subjects}</div>
        <div class="info-row"><span class="info-label">Students:</span> ${studentCount}</div>
        <div class="info-row"><span class="info-label">Status:</span> <strong>Pending Review</strong></div>
      </div>
      <p>We'll notify you at each stage. Track your requests from the dashboard.</p>
      <p><a href="${BASE_URL}/university/proctor" class="btn">View My Requests →</a></p>
    `
        await sendEmail({
            to: uniEmail,
            subject: `✅ Proctor Request Received — edUmeetup / IAES`,
            html: generateEmailHtml('Proctor Request Received', uniHtml),
        })
    }

    // ── In-app notification ───────────────────────────────────────────────────
    await prisma.universityNotification.create({
        data: {
            universityId: university.id,
            type: 'INFO',
            title: 'Proctor Request Submitted',
            message: `Your proctor request for ${studentCount} students (${fmt(examStartDate)}) has been received and is pending review.`,
        },
    })

    await logSystemEvent({
        level: 'INFO',
        type: 'SYSTEM_EVENT',
        message: `Proctor request submitted: ${university.institutionName} · ${studentCount} students · ${examStartDate}`,
        metadata: { requestId: request.id, universityId: university.id },
    })

    revalidatePath('/university/proctor')
    return { success: true }
}

// ── Fetch university's own requests ──────────────────────────────────────────
export async function getMyProctorRequests() {
    const session = await auth()
    if (!session?.user?.id) return []

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!university) return []

    return prisma.proctorRequest.findMany({
        where: { universityId: university.id },
        orderBy: { createdAt: 'desc' },
    })
}
