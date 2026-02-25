import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

interface NotificationPayload {
    userId: string
    type: string
    title: string
    message: string
    payload?: any
    emailTo?: string
    emailSubject?: string
    emailHtml?: string
    replyTo?: string
}

export async function createNotification(data: NotificationPayload) {
    try {
        // 1. DB notification
        await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                payload: data.payload || {}
            }
        })

        // 2. Email (optional)
        if (data.emailTo && data.emailSubject && data.emailHtml) {
            await sendEmail({
                to: data.emailTo,
                subject: data.emailSubject,
                html: data.emailHtml,
                replyTo: data.replyTo
            })
        }
    } catch (error) {
        // Don't throw — notifications must never break the main flow
        console.error(`Failed to send notification (${data.type}):`, error)
    }
}

// ─── Meeting: New Request → Rep ───────────────────────────────────────────────
export async function sendMeetingRequestEmail(
    repEmail: string,
    studentName: string,
    studentCountry: string,
    purpose: string,
    date: Date,
    duration: number,
    meetingId: string,
    note?: string
) {
    const subject = `New Meeting Request from ${studentName}`
    const html = generateEmailHtml('New Meeting Request', `
        <p>You have received a new meeting request from a student.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Student:</span> ${studentName} (${studentCountry})</div>
            <div class="info-row"><span class="info-label">Purpose:</span> ${purpose}</div>
            <div class="info-row"><span class="info-label">Date:</span> ${date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
            <div class="info-row"><span class="info-label">Duration:</span> ${duration} minutes</div>
            ${note ? `<div class="info-row"><span class="info-label">Note:</span> ${note}</div>` : ''}
        </div>
        <p>Please review and respond to this request promptly.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/meetings" class="btn">Review Request →</a></p>
    `)
    // Direct sendEmail — no valid university userId is available here
    await sendEmail({ to: repEmail, subject, html })
}

// ─── Meeting: Confirmed → Student ─────────────────────────────────────────────
export async function sendMeetingConfirmedEmailToStudent(
    studentEmail: string,
    universityName: string,
    repName: string,
    date: Date,
    duration: number,
    joinUrl: string,
    meetingCode: string,
    agenda?: string
) {
    const dateStr = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const isRealUrl = joinUrl && joinUrl.startsWith('http')

    // Build Google Calendar add link
    const startISO = date.toISOString().replace(/-|:|\.\d{3}/g, '')
    const endDate = new Date(date.getTime() + duration * 60000)
    const endISO = endDate.toISOString().replace(/-|:|\.\d{3}/g, '')
    const calTitle = encodeURIComponent(`Meeting with ${universityName}`)
    const calDetails = encodeURIComponent(`Meeting with ${repName} from ${universityName}\nCode: ${meetingCode}`)
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${calTitle}&dates=${startISO}/${endISO}&details=${calDetails}`

    const subject = `Meeting Confirmed: ${universityName} — ${dateStr}`
    const html = generateEmailHtml('Meeting Confirmed! 🎉', `
        <p>Your meeting with <strong>${universityName}</strong> has been confirmed. Your representative will be <strong>${repName}</strong>.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">University:</span> ${universityName}</div>
            <div class="info-row"><span class="info-label">Rep:</span> ${repName}</div>
            <div class="info-row"><span class="info-label">Date &amp; Time:</span> ${dateStr} IST</div>
            <div class="info-row"><span class="info-label">Duration:</span> ${duration} minutes</div>
            <div class="info-row"><span class="info-label">Meeting Code:</span> <strong>${meetingCode}</strong></div>
            ${isRealUrl ? `<div class="info-row"><span class="info-label">Join Link:</span> <a href="${joinUrl}">${joinUrl}</a></div>` : ''}
        </div>
        ${agenda ? `<p><strong>Agenda:</strong> ${agenda}</p>` : ''}
        ${isRealUrl ? `<p style="text-align:center;"><a href="${joinUrl}" class="btn">Join Meeting →</a></p>` : ''}
        <p style="text-align:center;margin-top:8px;"><a href="${gcalUrl}" style="color:#1B5E7E;font-size:14px;">📅 Add to Google Calendar</a></p>
        <p style="font-size:13px;color:#94a3b8;margin-top:24px;">Tip: Have your questions ready and join 2–3 minutes early. Good luck!</p>
    `)
    await sendEmail({ to: studentEmail, subject, html })
}

// ─── Meeting: Confirmed → Rep ─────────────────────────────────────────────────
export async function sendMeetingConfirmedEmailToRep(
    repEmail: string,
    studentName: string,
    date: Date,
    duration: number,
    joinUrl?: string
) {
    const dateStr = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const subject = `Meeting Scheduled: ${studentName} — ${dateStr}`
    const html = generateEmailHtml('Meeting Scheduled', `
        <p>Your meeting with <strong>${studentName}</strong> has been confirmed.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Student:</span> ${studentName}</div>
            <div class="info-row"><span class="info-label">Date &amp; Time:</span> ${dateStr} IST</div>
            <div class="info-row"><span class="info-label">Duration:</span> ${duration} minutes</div>
            ${joinUrl ? `<div class="info-row"><span class="info-label">Join Link:</span> <a href="${joinUrl}">${joinUrl}</a></div>` : ''}
        </div>
        ${joinUrl ? `<p style="text-align:center;"><a href="${joinUrl}" class="btn">Join Meeting →</a></p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/meetings" class="btn">View All Meetings →</a></p>
    `)
    await sendEmail({ to: repEmail, subject, html })
}

// ─── Meeting: Cancelled → Any party ──────────────────────────────────────────
export async function sendMeetingCancelledEmail(
    recipientEmail: string,
    counterpartName: string,
    date: Date,
    reason: string
) {
    const dateStr = date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    const subject = `Meeting Cancelled: ${counterpartName}`
    const html = generateEmailHtml('Meeting Cancelled', `
        <p>Your meeting with <strong>${counterpartName}</strong> has been cancelled.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Was scheduled:</span> ${dateStr} IST</div>
            <div class="info-row"><span class="info-label">Reason:</span> ${reason || 'Not specified'}</div>
        </div>
        <p>If you'd like to reschedule, you can book a new meeting from the dashboard.</p>
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard?tab=meetings" class="btn">Reschedule →</a></p>
    `)
    await sendEmail({ to: recipientEmail, subject, html })
}
