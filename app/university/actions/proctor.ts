'use server'

/**
 * app/university/actions/proctor.ts
 *
 * Server action for university proctor request submission.
 * 1. Validates input
 * 2. Creates ProctorRequest in DB
 * 3. Creates UniversityNotification (in-app)
 * 4. Emails Jaydeep with full details
 * 5. Emails university with confirmation
 */

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { logSystemEvent } from '@/lib/system-log'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jaydeep@edumeetup.com'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

export async function submitProctorRequest(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {

  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  // Verify university ownership
  const university = await prisma.university.findFirst({
    where: { userId },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!university) return { error: 'University profile not found.' }
  if (university.verificationStatus !== 'VERIFIED') {
    return { error: 'Only official EdUmeetup partner universities can submit proctor requests.' }
  }

  // Parse form data
  const examType = (formData.get('examType') as string)?.trim()
  const subjects = (formData.get('subjects') as string)?.trim()
  const examStartDate = formData.get('examStartDate') as string
  const examEndDate = formData.get('examEndDate') as string
  const studentCount = parseInt(formData.get('studentCount') as string)
  const durationMinutes = parseInt(formData.get('durationMinutes') as string)
  const requirements = (formData.get('requirements') as string)?.trim() || null
  const policyUrl = (formData.get('policyUrl') as string)?.trim() || null

  // Validate
  if (!examType || !subjects || !examStartDate || !examEndDate) {
    return { error: 'Please fill in all required fields.' }
  }
  if (isNaN(studentCount) || studentCount < 1) {
    return { error: 'Please enter a valid number of students.' }
  }
  if (isNaN(durationMinutes) || durationMinutes < 30) {
    return { error: 'Please enter a valid exam duration (minimum 30 minutes).' }
  }

  const startDate = new Date(examStartDate)
  const endDate = new Date(examEndDate)
  if (endDate < startDate) {
    return { error: 'Exam end date must be after start date.' }
  }

  // ── 1. Create ProctorRequest ──────────────────────────────────────────────
  const request = await prisma.proctorRequest.create({
    data: {
      universityId: university.id,
      examType,
      subjects,
      examStartDate: startDate,
      examEndDate: endDate,
      studentCount,
      durationMinutes,
      requirements,
      policyUrl,
      status: 'PENDING',
    },
  })

  // ── 2. In-app notification for university ─────────────────────────────────
  await prisma.universityNotification.create({
    data: {
      universityId: university.id,
      title: '🛡️ Proctor Request Submitted',
      message: `Your proctor request for "${subjects}" (${examType}) has been received. We'll confirm within 24 hours.`,
      type: 'INFO',
      actionUrl: '/university/proctor',
    },
  })

  const fmt = (d: Date) => d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // ── 3. Email to Jaydeep ───────────────────────────────────────────────────
  const adminContent = `
    <p>An official EdUmeetup partner university has submitted a proctor services request via the dashboard.</p>

    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#3730a3;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">🏛️ University</p>
      <div class="info-row"><span class="info-label">Institution:</span> <strong>${university.institutionName}</strong></div>
      <div class="info-row"><span class="info-label">Contact:</span> ${university.user.name || 'Not set'}</div>
      <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${university.user.email}">${university.user.email}</a></div>
    </div>

    <div class="info-box" style="margin-top:16px;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">📋 Exam Details</p>
      <div class="info-row"><span class="info-label">Subject(s):</span> <strong>${subjects}</strong></div>
      <div class="info-row"><span class="info-label">Type:</span> ${examType}</div>
      <div class="info-row"><span class="info-label">Exam Period:</span> <strong>${fmt(startDate)} – ${fmt(endDate)}</strong></div>
      <div class="info-row"><span class="info-label">Students:</span> <strong>${studentCount}</strong></div>
      <div class="info-row"><span class="info-label">Duration:</span> ${durationMinutes} minutes</div>
      ${policyUrl ? `<div class="info-row"><span class="info-label">Policy URL:</span> <a href="${policyUrl}">${policyUrl}</a></div>` : ''}
    </div>

    ${requirements ? `
    <div class="info-box" style="margin-top:16px;background:#fefce8;border-color:#fef08a;">
      <p style="margin:0 0 8px 0;font-weight:700;color:#713f12;font-size:13px;">📝 Requirements</p>
      <p style="margin:0;color:#78350f;">${requirements}</p>
    </div>` : ''}

    <hr/>
    <p style="font-size:13px;color:#64748b;">
      <strong>Next steps:</strong> Review the request, confirm availability,
      then update the status in the admin dashboard and notify the university.
    </p>
    <div style="display:flex;gap:12px;margin-top:16px;">
      <a href="${BASE_URL}/admin/proctor" class="btn">Manage in Admin Dashboard →</a>
    </div>
  `

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `🛡️ Proctor Request — ${university.institutionName} · ${subjects} · ${fmt(startDate)}`,
    html: generateEmailHtml('New Proctor Services Request', adminContent),
    replyTo: university.user.email,
  })

  // ── 4. Confirmation email to university ───────────────────────────────────
  const uniContent = `
    <p>Hi ${university.user.name || university.institutionName} team,</p>
    <p>Your proctor services request has been received by <strong>EdUmeetup / IAES</strong>. Our team will review it and contact you within <strong>24 hours</strong>.</p>

    <div class="info-box">
      <p style="margin:0 0 10px 0;font-weight:600;color:#0f172a;">Request Summary</p>
      <div class="info-row"><span class="info-label">Subject(s):</span> ${subjects}</div>
      <div class="info-row"><span class="info-label">Type:</span> ${examType}</div>
      <div class="info-row"><span class="info-label">Exam Period:</span> ${fmt(startDate)} – ${fmt(endDate)}</div>
      <div class="info-row"><span class="info-label">Students:</span> ${studentCount}</div>
      <div class="info-row"><span class="info-label">Duration:</span> ${durationMinutes} minutes</div>
      <div class="info-row"><span class="info-label">Proctor Site:</span> EdUmeetup / IAES, Ahmedabad, Gujarat, India</div>
      <div class="info-row"><span class="info-label">Status:</span> <span style="color:#d97706;font-weight:600;">Pending Review</span></div>
    </div>

    <p>You can track the status of this request in your university dashboard under the <strong>Proctor Services</strong> tab.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/university/proctor" class="btn">View Request Status →</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      Questions? Reply to this email or contact proctor@edumeetup.com
    </p>
  `

  await sendEmail({
    to: university.user.email,
    subject: `✅ Proctor Request Received — ${subjects} · ${fmt(startDate)}`,
    html: generateEmailHtml('Proctor Request Received', uniContent),
  })

  await logSystemEvent({
    level: 'INFO',
    type: 'SYSTEM_EVENT',
    message: `Proctor request submitted: ${university.institutionName} · ${subjects}`,
    metadata: {
      requestId: request.id,
      universityId: university.id,
      examStartDate,
      studentCount,
    },
  })

  revalidatePath('/university/proctor')
  revalidatePath('/university/dashboard')
  return { success: true }
}
