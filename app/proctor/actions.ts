'use server'

import { sendEmail, generateEmailHtml } from '@/lib/email'
import { logSystemEvent } from '@/lib/system-log'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jaydeep@edumeetup.com'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── STUDENT ENQUIRY ───────────────────────────────────────────────────────────
export async function submitStudentProctorEnquiry(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {

    const fields = {
        fullName: (formData.get('fullName') as string)?.trim(),
        email: (formData.get('email') as string)?.trim().toLowerCase(),
        phone: (formData.get('phone') as string)?.trim(),
        city: (formData.get('city') as string)?.trim(),
        universityName: (formData.get('universityName') as string)?.trim(),
        subject: (formData.get('subject') as string)?.trim(),
        examType: (formData.get('examType') as string)?.trim(),
        examDate: (formData.get('examDate') as string)?.trim(),
        duration: (formData.get('duration') as string)?.trim(),
        notes: (formData.get('notes') as string)?.trim(),
    }

    if (!fields.fullName || !fields.email || !fields.universityName || !fields.examDate) {
        return { error: 'Please fill in all required fields.' }
    }

    const examDateFormatted = fields.examDate
        ? new Date(fields.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Not specified'

    const adminContent = `
    <p>A student has submitted a proctor site enquiry via <strong>edumeetup.com/proctor</strong>.</p>

    <div class="info-box" style="background:#f0fdf4;border-color:#bbf7d0;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#166534;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">🎓 Student Details</p>
      <div class="info-row"><span class="info-label">Name:</span> <strong>${fields.fullName}</strong></div>
      <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${fields.email}">${fields.email}</a></div>
      <div class="info-row"><span class="info-label">Phone:</span> ${fields.phone || 'Not provided'}</div>
      <div class="info-row"><span class="info-label">City:</span> ${fields.city || 'Not provided'}</div>
    </div>

    <div class="info-box" style="margin-top:16px;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">📋 Exam Details</p>
      <div class="info-row"><span class="info-label">University:</span> <strong>${fields.universityName}</strong></div>
      <div class="info-row"><span class="info-label">Subject:</span> ${fields.subject || 'Not specified'}</div>
      <div class="info-row"><span class="info-label">Exam Type:</span> ${fields.examType || 'Not specified'}</div>
      <div class="info-row"><span class="info-label">Exam Date:</span> <strong>${examDateFormatted}</strong></div>
      <div class="info-row"><span class="info-label">Duration:</span> ${fields.duration || 'Not specified'}</div>
    </div>

    ${fields.notes ? `
    <div class="info-box" style="margin-top:16px;background:#fefce8;border-color:#fef08a;">
      <p style="margin:0 0 8px 0;font-weight:700;color:#713f12;font-size:13px;">📝 Special Requirements / Notes</p>
      <p style="margin:0;color:#78350f;">${fields.notes}</p>
    </div>` : ''}

    <hr/>
    <p style="font-size:13px;color:#64748b;">
      <strong>Next steps:</strong> Contact the student, confirm availability,
      then submit the IAES proctor approval form to ${fields.universityName}.
    </p>
    <p><a href="mailto:${fields.email}" class="btn">Reply to Student →</a></p>
  `

    await sendEmail({
        to: ADMIN_EMAIL,
        subject: `📋 Proctor Enquiry — ${fields.fullName} · ${fields.universityName} · ${examDateFormatted}`,
        html: generateEmailHtml('New Student Proctor Enquiry', adminContent),
        replyTo: fields.email,
    })

    const studentContent = `
    <p>Hi ${fields.fullName},</p>
    <p>Thank you for reaching out to <strong>edUmeetup / IAES</strong> for your proctored exam arrangement.</p>
    <p>We've received your enquiry and our team will contact you within <strong>24 hours</strong> to confirm the arrangements and next steps.</p>

    <div class="info-box">
      <p style="margin:0 0 10px 0;font-weight:600;color:#0f172a;">Your Enquiry Summary</p>
      <div class="info-row"><span class="info-label">University:</span> ${fields.universityName}</div>
      <div class="info-row"><span class="info-label">Subject:</span> ${fields.subject || 'Not specified'}</div>
      <div class="info-row"><span class="info-label">Exam Date:</span> ${examDateFormatted}</div>
      <div class="info-row"><span class="info-label">Proctor Site:</span> edUmeetup / IAES, Ahmedabad, Gujarat</div>
    </div>

    <p>In the meantime, if your university requires a proctor approval form, please share this page with them:</p>
    <p style="text-align:center;">
      <a href="${BASE_URL}/proctor" class="btn">Share Proctor Page →</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      Questions? Reply to this email or contact us at proctor@edumeetup.com
    </p>
  `

    await sendEmail({
        to: fields.email,
        subject: `✅ Proctor Enquiry Received — edUmeetup / IAES`,
        html: generateEmailHtml('Proctor Enquiry Received', studentContent),
    })

    await logSystemEvent({
        level: 'INFO',
        type: 'SYSTEM_EVENT',
        message: `Student proctor enquiry: ${fields.fullName} · ${fields.universityName}`,
        metadata: { email: fields.email, examDate: fields.examDate, university: fields.universityName },
    })

    return { success: true }
}

// ── UNIVERSITY ENQUIRY ────────────────────────────────────────────────────────
export async function submitUniversityProctorEnquiry(
    formData: FormData
): Promise<{ success?: boolean; error?: string }> {

    const fields = {
        institutionName: (formData.get('institutionName') as string)?.trim(),
        country: (formData.get('country') as string)?.trim(),
        contactName: (formData.get('contactName') as string)?.trim(),
        contactTitle: (formData.get('contactTitle') as string)?.trim(),
        email: (formData.get('email') as string)?.trim().toLowerCase(),
        phone: (formData.get('phone') as string)?.trim(),
        examStart: (formData.get('examStart') as string)?.trim(),
        examEnd: (formData.get('examEnd') as string)?.trim(),
        studentCount: (formData.get('studentCount') as string)?.trim(),
        examType: (formData.get('examType') as string)?.trim(),
        subjects: (formData.get('subjects') as string)?.trim(),
        requirements: (formData.get('requirements') as string)?.trim(),
        policyUrl: (formData.get('policyUrl') as string)?.trim(),
    }

    if (!fields.institutionName || !fields.email || !fields.contactName || !fields.examStart) {
        return { error: 'Please fill in all required fields.' }
    }

    const fmt = (d: string) => d
        ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'Not specified'

    const adminContent = `
    <p>A university has submitted a proctor partnership enquiry via <strong>edumeetup.com/proctor</strong>.</p>

    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#3730a3;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">🏛️ University Details</p>
      <div class="info-row"><span class="info-label">Institution:</span> <strong>${fields.institutionName}</strong></div>
      <div class="info-row"><span class="info-label">Country:</span> ${fields.country}</div>
      <div class="info-row"><span class="info-label">Contact:</span> ${fields.contactName}${fields.contactTitle ? ` · ${fields.contactTitle}` : ''}</div>
      <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${fields.email}">${fields.email}</a></div>
      <div class="info-row"><span class="info-label">Phone:</span> ${fields.phone || 'Not provided'}</div>
    </div>

    <div class="info-box" style="margin-top:16px;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#0f172a;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">📋 Exam Details</p>
      <div class="info-row"><span class="info-label">Exam Period:</span> <strong>${fmt(fields.examStart)} – ${fmt(fields.examEnd)}</strong></div>
      <div class="info-row"><span class="info-label">Exam Type:</span> ${fields.examType || 'Not specified'}</div>
      <div class="info-row"><span class="info-label">Students:</span> <strong>${fields.studentCount || 'Not specified'}</strong> students in India</div>
      <div class="info-row"><span class="info-label">Subjects:</span> ${fields.subjects || 'Not specified'}</div>
      ${fields.policyUrl ? `<div class="info-row"><span class="info-label">Policy URL:</span> <a href="${fields.policyUrl}">${fields.policyUrl}</a></div>` : ''}
    </div>

    ${fields.requirements ? `
    <div class="info-box" style="margin-top:16px;background:#fefce8;border-color:#fef08a;">
      <p style="margin:0 0 8px 0;font-weight:700;color:#713f12;font-size:13px;">📝 Proctor Requirements</p>
      <p style="margin:0;color:#78350f;">${fields.requirements}</p>
    </div>` : ''}

    <hr/>
    <p style="font-size:13px;color:#64748b;">
      <strong>Next steps:</strong> Contact ${fields.contactName} at ${fields.institutionName},
      confirm IAES as official proctor site, and begin the approval process.
    </p>
    <p><a href="mailto:${fields.email}" class="btn">Reply to ${fields.contactName} →</a></p>
  `

    await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🏛️ University Proctor Enquiry — ${fields.institutionName} · ${fields.studentCount} students · ${fmt(fields.examStart)}`,
        html: generateEmailHtml('New University Proctor Partnership Enquiry', adminContent),
        replyTo: fields.email,
    })

    const uniContent = `
    <p>Dear ${fields.contactName},</p>
    <p>Thank you for reaching out to <strong>edUmeetup / IAES</strong> regarding exam proctoring for your students in India.</p>
    <p>We've received your enquiry and our team will contact you within <strong>24 hours</strong> to discuss next steps and begin the proctor registration process.</p>

    <div class="info-box">
      <p style="margin:0 0 10px 0;font-weight:600;color:#0f172a;">Our Proctor Site Details</p>
      <div class="info-row"><span class="info-label">Organisation:</span> Indo American Education Society (IAES)</div>
      <div class="info-row"><span class="info-label">Platform:</span> edUmeetup (edumeetup.com)</div>
      <div class="info-row"><span class="info-label">Location:</span> Ahmedabad, Gujarat, India</div>
      <div class="info-row"><span class="info-label">Contact:</span> proctor@edumeetup.com</div>
    </div>

    <p>You can share the page below with your students so they can also submit their individual enquiries:</p>
    <p style="text-align:center;">
      <a href="${BASE_URL}/proctor" class="btn">Share Proctor Page with Students →</a>
    </p>
    <p style="font-size:13px;color:#94a3b8;">
      Questions? Reply to this email or contact us at proctor@edumeetup.com<br/>
      Best regards,<br/>The edUmeetup / IAES Proctoring Team
    </p>
  `

    await sendEmail({
        to: fields.email,
        subject: `✅ Proctor Partnership Enquiry Received — edUmeetup / IAES`,
        html: generateEmailHtml('Proctor Partnership Enquiry Received', uniContent),
    })

    await logSystemEvent({
        level: 'INFO',
        type: 'SYSTEM_EVENT',
        message: `University proctor enquiry: ${fields.institutionName} · ${fields.studentCount} students`,
        metadata: { email: fields.email, institution: fields.institutionName, examStart: fields.examStart },
    })

    return { success: true }
}
