'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { ProctorRequestStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { logSystemEvent } from '@/lib/system-log'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'jaydeep@edumeetup.com'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── Fetch all requests (admin) ────────────────────────────────────────────────
export async function getAllProctorRequests() {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') return []

    return prisma.proctorRequest.findMany({
        orderBy: [{ status: 'asc' }, { examStartDate: 'asc' }],
        include: {
            university: {
                select: { institutionName: true, country: true, repName: true, repEmail: true, contactEmail: true },
            },
        },
    })
}

// ── Update status + optional notes + fees (admin) ─────────────────────────────
export async function updateProctorStatus(
    id: string,
    status: ProctorRequestStatus,
    adminNotes?: string,
    fees?: string
): Promise<{ error?: string; success?: boolean }> {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') return { error: 'Unauthorised' }

    const existing = await prisma.proctorRequest.findUnique({
        where: { id },
        include: {
            university: {
                select: { institutionName: true, repName: true, repEmail: true, contactEmail: true, id: true },
            },
        },
    })
    if (!existing) return { error: 'Request not found' }

    await prisma.proctorRequest.update({
        where: { id },
        data: {
            status,
            adminNotes: adminNotes || null,
            fees: fees ? parseFloat(fees) : null,
            ...(status === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
            ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
    })

    const uniEmail = existing.university.repEmail || existing.university.contactEmail
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

    // ── Status-change email to university ─────────────────────────────────────
    const statusMessages: Partial<Record<ProctorRequestStatus, { subject: string; headline: string; body: string }>> = {
        UNDER_REVIEW: {
            subject: `📋 Proctor Request Under Review — ${existing.university.institutionName}`,
            headline: 'Your Request is Under Review',
            body: `<p>We've received your request for <strong>${existing.subjects}</strong> (${fmt(existing.examStartDate)}) and our team is reviewing it.</p><p>We'll confirm within 24 hours.</p>`,
        },
        CONFIRMED: {
            subject: `✅ Proctor Request Confirmed — ${existing.university.institutionName}`,
            headline: 'Proctoring Confirmed!',
            body: `<p>Great news! Your proctor request for <strong>${existing.subjects}</strong> on <strong>${fmt(existing.examStartDate)}</strong> is confirmed.</p>
        ${fees ? `<div class="info-box" style="background:#f0fdf4;border-color:#bbf7d0;"><p style="margin:0 0 8px 0;font-weight:600;color:#166534;">Service Fee</p><p style="margin:0;">$${parseFloat(fees).toFixed(2)} USD — our team will be in touch with payment details.</p></div>` : ''}
        ${adminNotes ? `<p><strong>Note:</strong> ${adminNotes}</p>` : ''}`,
        },
        COMPLETED: {
            subject: `🎓 Exam Completed — Thank You! — ${existing.university.institutionName}`,
            headline: 'Exam Successfully Proctored',
            body: `<p>The proctored exam for <strong>${existing.subjects}</strong> has been completed successfully.</p><p>Thank you for partnering with edUmeetup / IAES.</p>`,
        },
        CANCELLED: {
            subject: `❌ Proctor Request Update — ${existing.university.institutionName}`,
            headline: 'Proctor Request Cancelled',
            body: `<p>Unfortunately your request for <strong>${existing.subjects}</strong> (${fmt(existing.examStartDate)}) could not be fulfilled.</p>
        ${adminNotes ? `<div class="info-box" style="background:#fef2f2;border-color:#fecaca;"><p style="margin:0 0 6px 0;font-weight:600;color:#991b1b;">Reason</p><p style="margin:0;">${adminNotes}</p></div>` : ''}`,
        },
    }

    const msg = statusMessages[status]
    if (msg && uniEmail) {
        const content = `${msg.body}<hr/><p><a href="${BASE_URL}/university/proctor" class="btn">View My Requests →</a></p>`
        await sendEmail({ to: uniEmail, subject: msg.subject, html: generateEmailHtml(msg.headline, content) })
    }

    // ── In-app notification ───────────────────────────────────────────────────
    const inApp: Partial<Record<ProctorRequestStatus, { title: string; message: string }>> = {
        UNDER_REVIEW: { title: 'Proctor Request Under Review', message: `Your request for ${existing.subjects} (${fmt(existing.examStartDate)}) is under review.` },
        CONFIRMED: { title: '✅ Proctor Request Confirmed!', message: `Proctoring confirmed for ${existing.subjects} on ${fmt(existing.examStartDate)}.${fees ? ` Fee: $${parseFloat(fees).toFixed(2)}` : ''}` },
        COMPLETED: { title: 'Exam Completed', message: `Your proctored exam for ${existing.subjects} is marked complete.` },
        CANCELLED: { title: 'Proctor Request Cancelled', message: `Your request for ${existing.subjects} could not be fulfilled.${adminNotes ? ` Reason: ${adminNotes}` : ''}` },
    }

    const notif = inApp[status]
    if (notif) {
        await prisma.universityNotification.create({
            data: {
                universityId: existing.university.id,
                type: status === 'CANCELLED' ? 'WARNING' : 'INFO',
                title: notif.title,
                message: notif.message,
            },
        })
    }

    await logSystemEvent({ level: 'INFO', type: 'SYSTEM_EVENT', message: `Proctor request ${id} → ${status}`, metadata: { requestId: id, status, adminNotes } })
    revalidatePath('/admin/proctor')
    return { success: true }
}
