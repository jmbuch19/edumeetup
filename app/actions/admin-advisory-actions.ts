'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { AdvisoryStatus } from '@prisma/client'
import { Resend } from 'resend'

export async function updateAdvisoryStatus(requestId: string, status: AdvisoryStatus) {
    await requireRole('ADMIN')
    try {
        await prisma.advisoryRequest.update({ where: { id: requestId }, data: { status } })
        revalidatePath('/admin/advisory')
        revalidatePath(`/admin/advisory/${requestId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to update status" }
    }
}

export async function updateAdvisoryNotes(requestId: string, internalNotes: string) {
    await requireRole('ADMIN')
    try {
        await prisma.advisoryRequest.update({ where: { id: requestId }, data: { internalNotes } })
        revalidatePath(`/admin/advisory/${requestId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to update notes" }
    }
}

export async function assignAdviser(requestId: string, adviserId: string) {
    await requireRole('ADMIN')
    try {
        await prisma.advisoryRequest.update({
            where: { id: requestId },
            data: { adviserId, status: 'ASSIGNED' }
        })
        revalidatePath('/admin/advisory')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to assign adviser" }
    }
}

/**
 * Assigns an adviser, saves the session link, marks status SCHEDULED,
 * and emails the student with the session details via Resend.
 */
export async function scheduleAdvisorySession(
    requestId: string,
    adviserId: string,
    sessionLink: string
) {
    await requireRole('ADMIN')
    try {
        const request = await prisma.advisoryRequest.findUnique({
            where: { id: requestId },
            include: { student: { include: { user: true } } }
        })
        if (!request) return { success: false, error: 'Request not found' }

        // Update DB
        await prisma.advisoryRequest.update({
            where: { id: requestId },
            data: { adviserId, sessionLink, status: 'SCHEDULED' }
        })

        // Load adviser details for the email
        const adviserUser = adviserId
            ? await prisma.user.findUnique({ where: { id: adviserId }, select: { name: true, email: true } })
            : null

        const studentEmail = request.student.user.email
        const studentName = request.student.fullName ?? 'Student'

        // Send notification email to student
        const resend = new Resend(process.env.RESEND_API_KEY)
        const { error } = await resend.emails.send({
            from: process.env.EMAIL_FROM ?? 'EduMeetup <noreply@edumeetup.com>',
            to: studentEmail,
            subject: '✅ Your EduMeetup Advisory Session is Scheduled!',
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#374151;line-height:1.6}
  .container{max-width:600px;margin:0 auto;padding:40px 20px}
  .logo{font-size:22px;font-weight:bold;margin-bottom:24px}
  .logo span{color:#4F46E5}
  .badge{display:inline-block;background:#ECFDF5;color:#065F46;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;margin-bottom:16px}
  .card{background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:20px;margin:20px 0}
  .cta{display:inline-block;padding:12px 28px;background:#4F46E5;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;margin:20px 0}
  .footer{margin-top:40px;padding-top:16px;border-top:1px solid #E5E7EB;font-size:12px;color:#9CA3AF;text-align:center}
</style></head>
<body><div class="container">
  <div class="logo"><span>edU</span>meetup</div>
  <div class="badge">✅ Session Confirmed</div>
  <h2 style="margin-top:0">Your Advisory Session is Scheduled, ${studentName}!</h2>
  <p>Great news — an EduMeetup adviser has been assigned to help guide your study abroad journey.</p>
  <div class="card">
    <p style="margin:0 0 8px"><strong>Session Details</strong></p>
    ${adviserUser ? `<p style="margin:4px 0">👤 <strong>Adviser:</strong> ${adviserUser.name ?? adviserUser.email}</p>` : ''}
    <p style="margin:4px 0">🔗 <strong>Meeting Link:</strong> <a href="${sessionLink}">${sessionLink}</a></p>
    <p style="margin:4px 0;font-size:13px;color:#6B7280">Click the link at your scheduled time to join your session.</p>
  </div>
  <a href="${sessionLink}" class="cta">Join Session</a>
  <p style="font-size:14px;color:#6B7280">If you have questions before the session, simply reply to this email.</p>
  <div class="footer"><p>© ${new Date().getFullYear()} IAES — EduMeetup Advisory Service</p></div>
</div></body></html>`
        })

        if (error) {
            console.error('[SCHEDULE ADVISORY] Email error:', error)
            return { success: false, error: `Session saved but email failed: ${(error as any).message}` }
        }

        revalidatePath('/admin/advisory')
        revalidatePath(`/admin/advisory/${requestId}`)
        return { success: true }
    } catch (error) {
        console.error('[SCHEDULE ADVISORY]', error)
        return { success: false, error: (error as Error).message }
    }
}
