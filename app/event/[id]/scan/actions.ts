'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendEmail, generateEmailHtml } from '@/lib/email'

// ── Types ────────────────────────────────────────────────────────────────────
export type StudentPreview = {
    fullName: string | null
    currentCourse: string | null
    yearOfPassing: number | null
    matchedPrograms: string[]
}

export type ScanResult =
    | { success: true; studentPreview: StudentPreview; attendanceId: string }
    | { alreadyScanned: true; studentPreview: StudentPreview }
    | { error: string }

// ── Email stubs (non-blocking, fire-and-forget) ───────────────────────────────
async function sendFairBrochureEmail(
    pass: { email: string; fullName: string | null },
    university: { institutionName: string; contactEmail: string | null },
    matchedProgramNames: string[],
): Promise<void> {
    const to = pass.email
    const uniName = university.institutionName
    const programs = matchedProgramNames.length
        ? matchedProgramNames.map((p) => `<li>${p}</li>`).join('')
        : '<li>General Programs Brochure</li>'

    await sendEmail({
        to,
        subject: `Your brochure from ${uniName} — EdUmeetup Fair`,
        html: generateEmailHtml(
            `Brochure from ${uniName}`,
            `<p>Hi ${pass.fullName ?? 'there'},</p>
       <p><strong>${uniName}</strong> scanned your fair pass and would like to share information about the following programs:</p>
       <ul style="padding-left:20px;">${programs}</ul>
       <p>Visit your <a href="https://edumeetup.com/student/dashboard/?tab=fair-visits">Fair Visits dashboard</a> to learn more.</p>`,
        ),
    })
}

async function sendWhatsAppBrochure(
    _pass: { phone: string | null; fullName: string | null },
    _university: { institutionName: string },
): Promise<void> {
    // WhatsApp integration stub — plug in Twilio/360dialog when ready
    console.log(`[WhatsApp stub] Would send brochure to ${_pass.phone} from ${_university.institutionName}`)
}

// ── Main server action ────────────────────────────────────────────────────────
export async function processQRScan(
    uuid: string,
    universityId: string,
    fairEventId: string,
    repNotes?: string,
): Promise<ScanResult> {
    if (!uuid || !universityId || !fairEventId) {
        return { error: 'Missing required parameters' }
    }

    // A3 fix: verify the scanning rep belongs to the university they are scanning for
    const session = await auth()
    if (!session?.user?.id) return { error: 'Authentication required to scan' }
    const callerUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true, universityId: true },
    })
    if (
        !callerUser ||
        (callerUser.role !== 'UNIVERSITY' && callerUser.role !== 'UNIVERSITY_REP') ||
        callerUser.universityId !== universityId
    ) {
        return { error: 'Unauthorized — you may only scan for your own university' }
    }

    try {
        // A2 fix: fetch fairEvent first and reject scans > 24h after fair ends
        const fairEvent = await prisma.fairEvent.findUnique({
            where: { id: fairEventId },
            select: { name: true, endDate: true, endedAt: true, status: true },
        })
        if (!fairEvent) {
            return { error: 'Fair event not found' }
        }
        const fairEndMs = (fairEvent.endedAt ?? fairEvent.endDate)?.getTime()
        if (fairEndMs && Date.now() > fairEndMs + 24 * 60 * 60 * 1000) {
            return { error: 'QR scanning window has closed — this fair ended more than 24 hours ago' }
        }

        // ── 1. Find pass by uuid ──────────────────────────────────────────────
        const pass = await prisma.fairStudentPass.findUnique({
            where: { uuid },
        })

        if (!pass) {
            return { error: 'Invalid QR code — pass not found' }
        }

        // ── 2. Validate fairEventId matches ──────────────────────────────────
        if (pass.fairEventId !== fairEventId) {
            return { error: 'This pass was issued for a different fair event' }
        }

        // ── 3. Idempotency — already scanned? ────────────────────────────────
        const existing = await prisma.fairAttendance.findUnique({
            where: {
                passId_universityId_fairEventId: {
                    passId: pass.id,
                    universityId,
                    fairEventId,
                },
            },
        })

        if (existing) {
            return {
                alreadyScanned: true,
                studentPreview: {
                    fullName: pass.fullName,
                    currentCourse: pass.currentCourse,
                    yearOfPassing: pass.yearOfPassing,
                    matchedPrograms: existing.matchedPrograms,
                },
            }
        }

        // ── 4. Fetch university + programs for matching ───────────────────────
        const university = await prisma.university.findUnique({
            where: { id: universityId },
            include: { programs: { where: { status: 'ACTIVE' } } },
        })

        if (!university) {
            return { error: 'University not found' }
        }
        // fairEvent was already fetched above for expiry check, reuse its name

        // Match programs by fieldOfInterest (simple substring check)
        const interestLower = (pass.fieldOfInterest ?? '').toLowerCase()
        const matchedPrograms = university.programs.filter((p) => {
            if (!interestLower) return true // no filter — include all
            return (
                p.fieldCategory.toLowerCase().includes(interestLower) ||
                p.programName.toLowerCase().includes(interestLower) ||
                interestLower.includes(p.fieldCategory.toLowerCase())
            )
        })
        const matchedProgramIds = matchedPrograms.map((p) => p.id)
        const matchedProgramNames = matchedPrograms.map((p) => p.programName)

        // ── 5. Transaction: attendance + notifications ────────────────────────
        const studentName = pass.fullName ?? 'Unknown Student'
        const courseStr = pass.currentCourse ?? 'Unknown Course'
        const yearStr = pass.yearOfPassing ? String(pass.yearOfPassing) : 'N/A'

        const [attendance] = await prisma.$transaction([
            // a. Create FairAttendance record
            prisma.fairAttendance.create({
                data: {
                    universityId,
                    fairEventId,
                    passId: pass.id,
                    status: 'SCANNED',
                    repNotes: repNotes ?? null,
                    matchedPrograms: matchedProgramIds,
                },
            }),

            // b. Student notification (only if registered user)
            ...(pass.studentId
                ? [
                    prisma.studentNotification.create({
                        data: {
                            studentId: pass.studentId,
                            title: `${university.institutionName} shared their brochure with you`,
                            message: 'Visit your Fair Visits dashboard to view matched programs',
                            type: 'FAIR_SCAN',
                            actionUrl: '/dashboard/student/fair-visits',
                        },
                    }),
                ]
                : []),

            // c. University notification
            prisma.universityNotification.create({
                data: {
                    universityId,
                    title: `New lead scanned at ${fairEvent?.name ?? 'Fair'}`,
                    message: `${studentName} — ${courseStr}, graduating ${yearStr}`,
                    type: 'FAIR_LEAD',
                    actionUrl: `/dashboard/university/fair-report/${fairEventId}`,
                },
            }),
        ])

        // ── 6. Non-blocking email dispatch ──────────────────────────────────────
        const passForEmail = { email: pass.email, fullName: pass.fullName, phone: pass.phone }
        Promise.allSettled([
            sendFairBrochureEmail(passForEmail, university, matchedProgramNames),
            pass.whatsappConsent
                ? sendWhatsAppBrochure(passForEmail, university)
                : Promise.resolve(),
        ])
            .then(async (results) => {
                const emailOk = results[0].status === 'fulfilled'
                const waOk = results[1].status === 'fulfilled'
                if (emailOk || waOk) {
                    // best-effort flag update — ignore errors
                    await prisma.fairAttendance
                        .updateMany({
                            where: { passId: pass.id, universityId, fairEventId },
                            data: {
                                emailSent: emailOk,
                                whatsappSent: waOk && pass.whatsappConsent,
                            },
                        })
                        .catch(() => null)
                }
            })
            .catch(() => null)

        // ── 7. Return student preview ────────────────────────────────────────────
        return {
            success: true,
            attendanceId: attendance.id,
            studentPreview: {
                fullName: pass.fullName,
                currentCourse: pass.currentCourse,
                yearOfPassing: pass.yearOfPassing,
                matchedPrograms: matchedProgramNames,
            },
        }
    } catch (error) {
        console.error('[processQRScan] Error:', error)
        return { error: 'Failed to process scan. Please try again.' }
    }
}

// ── Update rep notes on an existing attendance record ────────────────────────
export async function updateRepNotes(
    attendanceId: string,
    repNotes: string,
): Promise<{ ok: boolean }> {
    try {
        await prisma.fairAttendance.update({
            where: { id: attendanceId },
            data: { repNotes: repNotes.trim() || null },
        })
        return { ok: true }
    } catch (err) {
        console.error('[updateRepNotes]', err)
        return { ok: false }
    }
}

// ── Helper: get today's scan count for a university at a fair ─────────────────
export async function getTodayScanCount(
    universityId: string,
    fairEventId: string,
): Promise<number> {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    return prisma.fairAttendance.count({
        where: {
            universityId,
            fairEventId,
            scannedAt: { gte: todayStart },
        },
    })
}
