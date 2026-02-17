import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

interface NotificationPayload {
    userId: string
    type: string
    title: string
    message: string
    payload?: any
    emailTo?: string
    emailSubject?: string
    emailHtml?: string
}

export async function createNotification(data: NotificationPayload) {
    try {
        // 1. DB Notification
        await prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                payload: data.payload || {}
            }
        })

        // 2. Email Notification (Optional)
        if (data.emailTo && data.emailSubject && data.emailHtml) {
            await sendEmail({
                to: data.emailTo,
                subject: data.emailSubject,
                html: data.emailHtml
            })
        }
    } catch (error) {
        console.error(`Failed to send notification (${data.type}):`, error)
        // Don't throw, just log. Notifications shouldn't break the main flow.
    }
}

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
    const subject = `New Meeting Request: ${studentName}`
    const html = `
        <h2>New Meeting Request</h2>
        <p><strong>Student:</strong> ${studentName} (${studentCountry})</p>
        <p><strong>Purpose:</strong> ${purpose}</p>
        <p><strong>Date:</strong> ${date.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${duration} mins</p>
        ${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}
        <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/university/meetings">View Request</a></p>
    `
    await createNotification({
        userId: 'system', // or specific rep ID if available context
        type: 'MEETING_REQUEST',
        title: 'New Meeting Request',
        message: `from ${studentName}`,
        emailTo: repEmail,
        emailSubject: subject,
        emailHtml: html
    })
}

export async function sendMeetingConfirmedEmailToStudent(
    studentEmail: string,
    universityName: string,
    repName: string,
    date: Date,
    duration: number,
    location: string,
    meetingCode: string,
    questions?: string
) {
    const subject = `Meeting Confirmed: ${universityName}`
    const html = `
        <h2>Meeting Confirmed!</h2>
        <p>Your meeting with <strong>${universityName}</strong> (${repName}) is confirmed.</p>
        <p><strong>Date:</strong> ${date.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${duration} mins</p>
        <p><strong>Location/Link:</strong> ${location}</p>
        <p><strong>Meeting Code:</strong> ${meetingCode}</p>
        ${questions ? `<p><strong>Your Questions:</strong> ${questions}</p>` : ''}
        <p>Add to your calendar!</p>
    `
    await sendEmail({ to: studentEmail, subject, html })
}

export async function sendMeetingConfirmedEmailToRep(
    repEmail: string,
    studentName: string,
    date: Date,
    duration: number
) {
    const subject = `Meeting Confirmed: ${studentName}`
    const html = `
        <h2>Meeting Confirmed</h2>
        <p>Meeting with <strong>${studentName}</strong> is now CONFIRMED.</p>
        <p><strong>Date:</strong> ${date.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${duration} mins</p>
        <p>Check dashboard for details.</p>
    `
    await sendEmail({ to: repEmail, subject, html })
}

export async function sendMeetingCancelledEmail(
    recipientEmail: string,
    recipientRole: string,
    counterpartName: string,
    date: Date,
    reason: string
) {
    const subject = `Meeting Cancelled: ${counterpartName}`
    const html = `
        <h2>Meeting Cancelled</h2>
        <p>Your meeting with <strong>${counterpartName}</strong> on ${date.toLocaleString()} has been cancelled.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please reschedule if needed.</p>
    `
    await sendEmail({ to: recipientEmail, subject, html })
}
