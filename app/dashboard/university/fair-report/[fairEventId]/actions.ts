'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'

// ── Auth guard ────────────────────────────────────────────────────────────────
// Verifies the calling session is a university/rep that owns `universityId`.
// Returns the verified universityId on success; throws on failure.
async function requireCallerOwnsUniversity(universityId: string): Promise<void> {
    const session = await auth()
    if (!session?.user?.id) throw new Error('Unauthorized')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, universityId: true },
    })

    if (!user || (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP')) {
        throw new Error('Forbidden')
    }
    if (user.universityId !== universityId) {
        throw new Error('Forbidden')
    }
}

function authError(err: unknown): { success: false; error: string } {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Forbidden')) {
        return { success: false, error: err.message }
    }
    return { success: false, error: 'Unexpected error' }
}

// ── 1. Update follow-up status ────────────────────────────────────────────────
export async function updateFollowUpStatus(
    attendanceId: string,
    status: 'PENDING' | 'CONTACTED' | 'APPLIED' | 'REJECTED',
): Promise<{ success: boolean; error?: string }> {
    if (!attendanceId || !status) return { success: false, error: 'Missing parameters' }

    try {
        // B3 fix: look up the attendance's owner BEFORE updating
        const attendance = await prisma.fairAttendance.findUnique({
            where: { id: attendanceId },
            select: { universityId: true },
        })
        if (!attendance) return { success: false, error: 'Record not found' }
        await requireCallerOwnsUniversity(attendance.universityId)

        await prisma.fairAttendance.update({
            where: { id: attendanceId },
            data: { followUpStatus: status },
        })
        return { success: true }
    } catch (error) {
        if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
            return { success: false, error: error.message }
        }
        console.error('[updateFollowUpStatus] Error:')
        return { success: false, error: 'Failed to update status' }
    }
}

// ── 2. Bulk follow-up email ───────────────────────────────────────────────────
export async function sendBulkFollowUp(
    fairEventId: string,
    universityId: string,
): Promise<{ sent: number; skipped: number; error?: string }> {
    try {
        await requireCallerOwnsUniversity(universityId)

        const university = await prisma.university.findUnique({
            where: { id: universityId },
            select: { institutionName: true, contactEmail: true },
        })
        const fairEvent = await prisma.fairEvent.findUnique({
            where: { id: fairEventId },
            select: { name: true },
        })

        if (!university || !fairEvent) {
            return { sent: 0, skipped: 0, error: 'University or fair event not found' }
        }

        // Find all consenting leads who haven't been contacted yet
        const leads = await prisma.fairAttendance.findMany({
            where: {
                universityId,
                fairEventId,
                pass: { emailConsent: true },
                followUpStatus: { not: 'REJECTED' },
            },
            include: { pass: { select: { email: true, fullName: true } } },
        })

        let sent = 0
        let skipped = 0

        for (const lead of leads) {
            if (!lead.pass.email) { skipped++; continue }

            const firstName = (lead.pass.fullName ?? 'there').split(' ')[0]
            const result = await sendEmail({
                to: lead.pass.email,
                subject: `Following up from ${university.institutionName} — EdUmeetup Fair`,
                html: generateEmailHtml(
                    `Great meeting you at ${fairEvent.name}!`,
                    `<p>Hi ${firstName},</p>
           <p>It was wonderful connecting with you at <strong>${fairEvent.name}</strong>.</p>
           <p>We at <strong>${university.institutionName}</strong> would love to continue the conversation about your academic goals.</p>
           <p>Please feel free to reach out or book a 1-on-1 session with our admissions team.</p>
           <p style="text-align:center;margin-top:24px;">
             <a href="https://edumeetup.com/universities/${universityId}" class="btn">Visit Our Profile →</a>
           </p>
           <p style="font-size:12px;color:#94a3b8;">You received this because you scanned your pass at the EdUmeetup Fair. Reply UNSUBSCRIBE to opt out.</p>`,
                ),
            })

            if (result.success || result.error === undefined) {
                sent++
                await prisma.fairAttendance.update({
                    where: { id: lead.id },
                    data: { followUpStatus: 'CONTACTED' },
                }).catch(() => null)
            } else {
                skipped++
            }
        }

        return { sent, skipped }
    } catch (error) {
        if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
            return { sent: 0, skipped: 0, error: error.message }
        }
        console.error('[sendBulkFollowUp] Error:')
        return { sent: 0, skipped: 0, error: 'Failed to send bulk follow-up emails' }
    }
}

// ── 3. Export leads CSV (returns raw CSV string) ──────────────────────────────
export async function exportLeadsCSV(
    fairEventId: string,
    universityId: string,
): Promise<{ csv?: string; error?: string }> {
    try {
        await requireCallerOwnsUniversity(universityId)

        const leads = await prisma.fairAttendance.findMany({
            where: { universityId, fairEventId },
            include: { pass: true },
            orderBy: { scannedAt: 'asc' },
        })

        const header = [
            'Name', 'Email', 'Phone', 'Institution', 'Course', 'Year of Passing',
            'Field of Interest', 'Budget', 'Matched Programs', 'Scanned At',
            'Email Consent', 'WhatsApp Consent', 'Follow Up Status',
        ]

        const escape = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`

        const rows = leads.map((l) => [
            escape(l.pass.fullName),
            escape(l.pass.email),
            escape(l.pass.phone),
            escape(l.pass.currentInstitution),
            escape(l.pass.currentCourse),
            escape(l.pass.yearOfPassing?.toString()),
            escape(l.pass.fieldOfInterest),
            escape(l.pass.budgetRange),
            escape(l.matchedPrograms.join('; ')),
            escape(l.scannedAt.toISOString()),
            escape(l.pass.emailConsent ? 'Yes' : 'No'),
            escape(l.pass.whatsappConsent ? 'Yes' : 'No'),
            escape(l.followUpStatus),
        ].join(','))

        const csv = [header.join(','), ...rows].join('\n')
        return { csv }
    } catch (error) {
        if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
            return { error: error.message }
        }
        console.error('[exportLeadsCSV] Error:')
        return { error: 'Failed to generate CSV' }
    }
}

// ── 4. Bulk-request meetings with selected leads ───────────────────────────────
export async function requestMeetingsWithLeads(
    attendanceIds: string[],
    universityId: string,
): Promise<{ created: number; error?: string }> {
    if (!attendanceIds.length) return { created: 0 }

    try {
        await requireCallerOwnsUniversity(universityId)

        const attendances = await prisma.fairAttendance.findMany({
            where: { id: { in: attendanceIds }, universityId },
            include: { pass: true },
        })

        const { nanoid } = await import('nanoid')

        const meetingStart = new Date()
        meetingStart.setDate(meetingStart.getDate() + 7) // 1 week out
        meetingStart.setHours(10, 0, 0, 0)
        const meetingEnd = new Date(meetingStart.getTime() + 30 * 60 * 1000)

        const repUser = await prisma.user.findFirst({
            where: { universityId, role: { in: ['UNIVERSITY', 'UNIVERSITY_REP'] } },
            select: { id: true },
        })

        let created = 0
        for (const att of attendances) {
            if (!att.pass.studentId) continue // skip walk-ins without accounts

            await prisma.meeting
                .create({
                    data: {
                        universityId,
                        studentId: att.pass.studentId,
                        repId: repUser?.id ?? null,
                        title: 'Fair Follow-up Meeting',
                        agenda: att.repNotes ?? 'Follow-up from the EdUmeetup Fair',
                        purpose: 'OTHER',
                        durationMinutes: 30,
                        startTime: meetingStart,
                        endTime: meetingEnd,
                        studentTimezone: 'Asia/Kolkata',
                        repTimezone: 'Asia/Kolkata',
                        status: 'DRAFT',
                        videoProvider: 'GOOGLE_MEET',
                        meetingCode: nanoid(8).toUpperCase(),
                    },
                })
                .then(() => created++)
                .catch(() => null) // skip if student not eligible
        }

        return { created }
    } catch (error) {
        if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
            return { created: 0, error: error.message }
        }
        console.error('[requestMeetingsWithLeads] Error:')
        return { created: 0, error: 'Failed to create meetings' }
    }
}

// ── 5. Export ALL fair registrations (data share agreement) ───────────────────
// Universities receive every gate-pass holder for the fair, not just booth scans.
// This fulfils the data share agreement: edumeetup provides full attendee list.
export async function exportAllPassesCSV(
    fairEventId: string,
): Promise<{ csv?: string; error?: string }> {
    const session = await auth()
    const role = session?.user?.role
    if (!session?.user || (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && role !== 'ADMIN')) {
        return { error: 'Unauthorized' }
    }

    try {
        const passes = await prisma.fairStudentPass.findMany({
            where: { fairEventId },
            orderBy: { createdAt: 'asc' },
            include: { _count: { select: { attendances: true } } },
        })

        const header = [
            'Name', 'Email', 'Phone', 'Institution', 'Course', 'Semester',
            'Field of Interest', 'Budget', 'Preferred Countries',
            'Email Consent', 'WhatsApp Consent', 'Profile Type',
            'Booth Visits', 'Registered At',
        ]

        const escape = (v: string | null | undefined) =>
            `"${String(v ?? '').replace(/"/g, '""')}"`

        const rows = passes.map((p) =>
            [
                escape(p.fullName),
                escape(p.email),
                escape(p.phone),
                escape(p.currentInstitution),
                escape(p.currentCourse),
                escape(p.currentSemester),
                escape(p.fieldOfInterest),
                escape(p.budgetRange),
                escape(p.preferredCountries),
                escape(p.emailConsent ? 'Yes' : 'No'),
                escape(p.whatsappConsent ? 'Yes' : 'No'),
                escape(p.isPartialProfile ? 'Walk-in' : 'Registered'),
                escape(p._count.attendances.toString()),
                escape(p.createdAt.toISOString()),
            ].join(','),
        )

        const csv = [header.join(','), ...rows].join('\n')
        return { csv }
    } catch (error) {
        console.error('[exportAllPassesCSV]')
        return { error: 'Failed to generate CSV' }
    }
}
