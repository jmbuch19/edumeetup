/**
 * Fair Mode Notification Triggers
 *
 * Three trigger functions:
 * 1. triggerFairCreatedNotifications  → on event creation
 * 2. triggerFairGoLiveNotifications   → when admin sets event LIVE
 * 3. triggerFairEndedNotifications    → when admin ends event
 *
 * All Prisma writes + emails run inside Promise.allSettled (non-blocking).
 * Caller does: triggerFair*().catch(console.error) — never blocks the response.
 */

import { prisma } from '@/lib/prisma'
import {
    sendFairInviteToUniversity,
    sendFairAnnouncementToStudent,
    sendFairGoLiveToUniversity,
    sendFairEndReportToUniversity,
} from '@/lib/email/fair-notifications'

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 1: Fair Created
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFairCreatedNotifications(fairEventId: string): Promise<{
    universitiesNotified: number
    studentsNotified: number
}> {
    // ── 1. Fetch the event ────────────────────────────────────────────────────
    const event = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
    if (!event) return { universitiesNotified: 0, studentsNotified: 0 }

    const dateStr = formatDate(event.startDate)

    // ── 2. Universities: VERIFIED + opt-in ────────────────────────────────────
    const universities = await prisma.university.findMany({
        where: { verificationStatus: 'VERIFIED', notifyFairOpportunities: true },
        select: {
            id: true, institutionName: true, repName: true,
            repEmail: true, contactEmail: true,
        },
    })

    // ── 3. Notify each university ─────────────────────────────────────────────
    const uniResults = await Promise.allSettled(
        universities.map((uni) =>
            Promise.allSettled([
                // a. In-app notification
                prisma.universityNotification.create({
                    data: {
                        universityId: uni.id,
                        title: `New fair event — ${event.name}`,
                        message: `${event.city ?? ''}${event.city ? ' · ' : ''}${dateStr} · Register your booth`,
                        type: 'FAIR_INVITE',
                        isRead: false,
                        actionUrl: `/event/${event.slug}`,
                    },
                }),
                // b. Email (only if an address exists)
                (uni.repEmail ?? uni.contactEmail)
                    ? sendFairInviteToUniversity(uni, event)
                    : Promise.resolve({ skipped: true }),
            ])
        )
    )

    // ── 4. Students with complete profiles ────────────────────────────────────
    const students = await prisma.student.findMany({
        where: { profileComplete: true },
        select: {
            id: true, fullName: true, notificationPrefs: true,
            user: { select: { email: true } },
        },
    })

    // ── 5. Notify each student ────────────────────────────────────────────────
    const studentResults = await Promise.allSettled(
        students.map((student) => {
            // Respect opt-out preferences
            const prefs = (student.notificationPrefs ?? {}) as Record<string, unknown>
            const emailEnabled = prefs['emailUniversityUpdates'] !== false // default true

            return Promise.allSettled([
                // a. In-app notification
                prisma.studentNotification.create({
                    data: {
                        studentId: student.id,
                        title: `Fair coming to ${event.city ?? 'your city'}`,
                        message: `${event.name} · ${dateStr} · Get your free QR pass`,
                        type: 'FAIR_ANNOUNCEMENT',
                        isRead: false,
                        actionUrl: `/fair?eventId=${event.id}`,
                    },
                }),
                // b. Email (only if prefs allow)
                emailEnabled
                    ? sendFairAnnouncementToStudent(student.user.email, student.fullName ?? '', event)
                    : Promise.resolve({ skipped: true }),
            ])
        })
    )

    return {
        universitiesNotified: uniResults.filter(r => r.status === 'fulfilled').length,
        studentsNotified: studentResults.filter(r => r.status === 'fulfilled').length,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 2: Fair Go Live
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFairGoLiveNotifications(fairEventId: string): Promise<{
    universitiesNotified: number
    studentsNotified: number
}> {
    const event = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
    if (!event) return { universitiesNotified: 0, studentsNotified: 0 }

    // ── Which universities participated? (at least 1 attendance OR invite was sent) ──
    // Strategy: try attendance first, fall back to all VERIFIED
    const attendingUniIds = await prisma.fairAttendance.findMany({
        where: { fairEventId },
        select: { universityId: true },
        distinct: ['universityId'],
    })

    const uniFilter = attendingUniIds.length > 0
        ? { id: { in: attendingUniIds.map(a => a.universityId) } }
        : { verificationStatus: 'VERIFIED' as const, notifyFairOpportunities: true }

    const universities = await prisma.university.findMany({
        where: uniFilter,
        select: { id: true, institutionName: true, repName: true, repEmail: true, contactEmail: true },
    })

    const uniResults = await Promise.allSettled(
        universities.map((uni) =>
            Promise.allSettled([
                prisma.universityNotification.create({
                    data: {
                        universityId: uni.id,
                        title: 'Fair is LIVE — open your scanner now',
                        message: 'Tap to open your booth scanner and start capturing leads',
                        type: 'FAIR_LIVE',
                        isRead: false,
                        actionUrl: `/event/${event.slug}/scan`,
                    },
                }),
                sendFairGoLiveToUniversity(uni, event),
            ])
        )
    )

    // ── Students in the same city ─────────────────────────────────────────────
    const cityStudents = event.city
        ? await prisma.student.findMany({
            where: { city: { equals: event.city, mode: 'insensitive' }, profileComplete: true },
            select: { id: true },
        })
        : []

    const studentResults = await Promise.allSettled(
        cityStudents.map((student) =>
            prisma.studentNotification.create({
                data: {
                    studentId: student.id,
                    title: `${event.name} is open now`,
                    message: 'Show your QR pass at the door. Free entry.',
                    type: 'FAIR_LIVE',
                    isRead: false,
                    actionUrl: `/fair?eventId=${event.id}`,
                },
            })
        )
    )

    return {
        universitiesNotified: uniResults.filter(r => r.status === 'fulfilled').length,
        studentsNotified: studentResults.filter(r => r.status === 'fulfilled').length,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 3: Fair Ended
// ─────────────────────────────────────────────────────────────────────────────
export async function triggerFairEndedNotifications(fairEventId: string): Promise<{
    universitiesNotified: number
    studentsNotified: number
}> {
    const event = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
    if (!event) return { universitiesNotified: 0, studentsNotified: 0 }

    // ── Lead counts per university ────────────────────────────────────────────
    const leadGroups = await prisma.fairAttendance.groupBy({
        by: ['universityId'],
        where: { fairEventId },
        _count: { id: true },
    })

    const uniIds = leadGroups.map(g => g.universityId)
    const universities = await prisma.university.findMany({
        where: { id: { in: uniIds } },
        select: { id: true, institutionName: true, repName: true, repEmail: true, contactEmail: true },
    })

    const uniResults = await Promise.allSettled(
        universities.map((uni) => {
            const count = leadGroups.find(g => g.universityId === uni.id)?._count.id ?? 0
            return Promise.allSettled([
                prisma.universityNotification.create({
                    data: {
                        universityId: uni.id,
                        title: `Your fair report is ready — ${count} lead${count !== 1 ? 's' : ''}`,
                        message: 'View leads, export CSV, and send follow-ups',
                        type: 'FAIR_ENDED',
                        isRead: false,
                        actionUrl: `/dashboard/university/fair-report/${event.id}`,
                    },
                }),
                sendFairEndReportToUniversity(uni, event, count),
            ])
        })
    )

    // ── Notify checked-in students ────────────────────────────────────────────
    const checkedInPasses = await prisma.fairStudentPass.findMany({
        where: { fairEventId, checkedIn: true, studentId: { not: null } },
        select: { studentId: true },
    })

    const studentResults = await Promise.allSettled(
        checkedInPasses
            .filter((p): p is typeof p & { studentId: string } => p.studentId !== null)
            .map((p) =>
                prisma.studentNotification.create({
                    data: {
                        studentId: p.studentId,
                        title: 'Review universities you visited today',
                        message: 'Your brochures and matched programs are ready',
                        type: 'FAIR_ENDED',
                        isRead: false,
                        actionUrl: '/dashboard/student/fair-visits',
                    },
                })
            )
    )

    return {
        universitiesNotified: uniResults.filter(r => r.status === 'fulfilled').length,
        studentsNotified: studentResults.filter(r => r.status === 'fulfilled').length,
    }
}
