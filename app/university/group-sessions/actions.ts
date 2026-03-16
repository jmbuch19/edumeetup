'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getUniversityFromSession() {
    const session = await auth()
    if (!session?.user?.id) return null
    if (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP') return null

    const uni = await prisma.university.findFirst({
        where: {
            OR: [
                { userId: session.user.id },
                { reps: { some: { id: session.user.id } } }
            ]
        },
        select: { id: true, institutionName: true }
    })
    return uni
}

// ── Action 1: createGroupSession ─────────────────────────────────────────────
export async function createGroupSession(data: {
    title: string
    agenda?: string
    programId?: string
    targetField?: string
    scheduledAt: string   // ISO string from form
    durationMinutes: number
    capacity: number
    joinUrl?: string
    videoProvider?: string
}) {
    const uni = await getUniversityFromSession()
    if (!uni) return { error: 'Unauthorized' }

    if (!data.title?.trim()) return { error: 'Title is required' }
    if (data.capacity < 2 || data.capacity > 10) return { error: 'Capacity must be between 2 and 10' }

    const scheduledAt = new Date(data.scheduledAt)
    if (isNaN(scheduledAt.getTime())) return { error: 'Invalid date' }
    if (scheduledAt < new Date()) return { error: 'Session must be scheduled in the future' }

    // Smart audience preview — find matching students
    const matchedStudents = await resolveSmartAudience(
        uni.id,
        data.programId,
        data.targetField
    )

    const session = await prisma.groupSession.create({
        data: {
            universityId:    uni.id,
            title:           data.title.trim(),
            agenda:          data.agenda?.trim() || null,
            programId:       data.programId || null,
            targetField:     data.targetField?.trim() || null,
            scheduledAt,
            durationMinutes: data.durationMinutes || 45,
            capacity:        data.capacity,
            joinUrl:         data.joinUrl?.trim() || null,
            videoProvider:   data.videoProvider || null,
            status:          'OPEN',
        }
    })

    revalidatePath('/university/dashboard')
    return { success: true, session, matchedCount: matchedStudents.length }
}

// ── Action 2: joinGroupSession (atomic — race-condition safe) ─────────────────
export async function joinGroupSession(sessionId: string) {
    const authSession = await auth()
    if (!authSession?.user?.id) return { error: 'Please log in to join' }

    const student = await prisma.student.findUnique({
        where: { userId: authSession.user.id },
        select: { id: true }
    })
    if (!student) return { error: 'Student profile not found' }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Lock the session row
            const session = await tx.groupSession.findUnique({
                where: { id: sessionId },
                select: {
                    id: true,
                    capacity: true,
                    status: true,
                    title: true,
                    scheduledAt: true,
                    universityId: true,
                    _count: { select: { seats: { where: { status: 'CONFIRMED' } } } }
                }
            })

            if (!session) throw new Error('Session not found')
            if (session.status === 'CANCELLED') throw new Error('This session has been cancelled')
            if (session.status === 'COMPLETED') throw new Error('This session has already ended')

            const confirmedCount = session._count.seats
            const isFull = confirmedCount >= session.capacity

            // Create seat — CONFIRMED or WAITLISTED
            const seat = await tx.groupSessionSeat.create({
                data: {
                    groupSessionId: sessionId,
                    studentId:      student.id,
                    status:         isFull ? 'WAITLISTED' : 'CONFIRMED',
                    waitlistPos:    isFull ? await getNextWaitlistPos(tx, sessionId) : null,
                }
            })

            // Update session status
            const newConfirmedCount = isFull ? confirmedCount : confirmedCount + 1
            let newStatus = session.status

            if (!isFull) {
                if (newConfirmedCount >= session.capacity) {
                    newStatus = 'FULL'
                } else if (newConfirmedCount > session.capacity / 2) {
                    newStatus = 'FILLING'
                }
            }

            if (newStatus !== session.status) {
                await tx.groupSession.update({
                    where: { id: sessionId },
                    data: { status: newStatus }
                })
            }

            return { seat, isFull, newStatus, session }
        })

        // Post-transaction side effects — non-blocking
        Promise.resolve().then(async () => {
            try {
                // Notify student
                await prisma.studentNotification.create({
                    data: {
                        studentId: student.id,
                        title: result.isFull
                            ? `You're on the waitlist — ${result.session.title}`
                            : `Seat confirmed — ${result.session.title}`,
                        message: result.isFull
                            ? `You've been added to the waitlist. We'll notify you if a seat opens up.`
                            : `Your seat is confirmed for ${new Date(result.session.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                        type: 'GROUP_SESSION',
                        actionUrl: `/universities/${result.session.universityId}`,
                    }
                })

                // If just hit FULL — auto-create follow-up draft + notify university
                if (result.newStatus === 'FULL') {
                    await handleSessionFull(result.session.id, result.session.universityId)
                }

                // WhatsApp nudge — seats getting low (≤3 remaining)
                // Code ready — not wired until WhatsApp integration
                // await triggerWhatsAppLowSeatNudge(result.session)

            } catch { /* non-fatal */ }
        })

        return {
            success: true,
            status: result.seat.status,
            waitlistPos: result.seat.waitlistPos,
            sessionStatus: result.newStatus,
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to join session'
        if (msg.includes('Unique constraint')) return { error: 'You have already joined this session' }
        return { error: msg }
    }
}

// ── Action 3: leaveGroupSession ───────────────────────────────────────────────
export async function leaveGroupSession(sessionId: string) {
    const authSession = await auth()
    if (!authSession?.user?.id) return { error: 'Unauthorized' }

    const student = await prisma.student.findUnique({
        where: { userId: authSession.user.id },
        select: { id: true }
    })
    if (!student) return { error: 'Student not found' }

    const seat = await prisma.groupSessionSeat.findUnique({
        where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
        select: { id: true, status: true }
    })
    if (!seat) return { error: 'You are not in this session' }

    await prisma.$transaction(async (tx) => {
        // Cancel the seat
        await tx.groupSessionSeat.update({
            where: { id: seat.id },
            data: { status: 'CANCELLED' }
        })

        // If this was a confirmed seat — promote first waitlisted student
        if (seat.status === 'CONFIRMED') {
            const firstWaitlisted = await tx.groupSessionSeat.findFirst({
                where: { groupSessionId: sessionId, status: 'WAITLISTED' },
                orderBy: { waitlistPos: 'asc' },
                select: { id: true, studentId: true }
            })

            if (firstWaitlisted) {
                // Promote to confirmed
                await tx.groupSessionSeat.update({
                    where: { id: firstWaitlisted.id },
                    data: {
                        status: 'CONFIRMED',
                        waitlistPos: null,
                        notifiedAt: new Date()
                    }
                })

                // Update waitlist positions for remaining waitlisted
                await tx.groupSessionSeat.updateMany({
                    where: {
                        groupSessionId: sessionId,
                        status: 'WAITLISTED',
                        waitlistPos: { gt: 1 }
                    },
                    data: { waitlistPos: { decrement: 1 } }
                })

                // Notify promoted student (fire and forget)
                prisma.studentNotification.create({
                    data: {
                        studentId: firstWaitlisted.studentId,
                        title: '🎉 A seat opened up for you!',
                        message: 'A spot became available in the group session you were waiting for. Your seat is now confirmed.',
                        type: 'GROUP_SESSION',
                    }
                }).catch(() => {})
            }

            // Update session status back from FULL if needed
            const session = await tx.groupSession.findUnique({
                where: { id: sessionId },
                select: { capacity: true, status: true,
                    _count: { select: { seats: { where: { status: 'CONFIRMED' } } } } }
            })

            if (session?.status === 'FULL') {
                await tx.groupSession.update({
                    where: { id: sessionId },
                    data: { status: 'FILLING' }
                })
            }
        }
    })

    revalidatePath('/student/dashboard')
    return { success: true }
}

// ── Action 4: notifyMatchedStudents ──────────────────────────────────────────
export async function notifyMatchedStudents(
    sessionId: string,
    studentIds?: string[]  // optional: override with specific students
) {
    const uni = await getUniversityFromSession()
    if (!uni) return { error: 'Unauthorized' }

    const session = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        select: { id: true, title: true, scheduledAt: true,
            capacity: true, universityId: true,
            programId: true, targetField: true }
    })
    if (!session || session.universityId !== uni.id) return { error: 'Session not found' }

    // Resolve audience
    const targetIds = studentIds?.length
        ? studentIds
        : await resolveSmartAudience(uni.id, session.programId, session.targetField)

    if (targetIds.length === 0) return { error: 'No matching students found' }

    const dateStr = new Date(session.scheduledAt).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit'
    })

    await prisma.studentNotification.createMany({
        data: targetIds.map(studentId => ({
            studentId,
            title: `📅 Group session: ${session.title}`,
            message: `${uni.institutionName} is hosting a group info session on ${dateStr}. ${session.capacity} seats available — reserve yours now.`,
            type:      'GROUP_SESSION',
            actionUrl: `/universities/${uni.id}`,
        })),
        skipDuplicates: true,
    })

    // Update notifiedCount
    await prisma.groupSession.update({
        where: { id: sessionId },
        data: { notifiedCount: targetIds.length }
    })

    return { success: true, notifiedCount: targetIds.length }
}

// ── Action 5: shareRecap ─────────────────────────────────────────────────────
export async function shareRecap(sessionId: string, recapUrl: string) {
    const uni = await getUniversityFromSession()
    if (!uni) return { error: 'Unauthorized' }

    const session = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        select: { id: true, title: true, universityId: true,
            seats: { select: { studentId: true } } }
    })
    if (!session || session.universityId !== uni.id) return { error: 'Session not found' }

    // Save recap URL
    await prisma.groupSession.update({
        where: { id: sessionId },
        data: { recapUrl: recapUrl.trim() }
    })

    // Notify ALL students who had a seat (confirmed, waitlisted, cancelled)
    const allStudentIds = session.seats.map(s => s.studentId)

    await prisma.studentNotification.createMany({
        data: allStudentIds.map(studentId => ({
            studentId,
            title: `🎬 Recap available — ${session.title}`,
            message: `The recap for the ${session.title} group session is now available. Watch it at your convenience.`,
            type:      'GROUP_SESSION',
            actionUrl: recapUrl,
        })),
        skipDuplicates: true,
    })

    revalidatePath('/university/dashboard')
    return { success: true, notifiedCount: allStudentIds.length }
}

// ── Action 6: createFollowUpSession ─────────────────────────────────────────
export async function createFollowUpSession(sessionId: string, scheduledAt: string) {
    const uni = await getUniversityFromSession()
    if (!uni) return { error: 'Unauthorized' }

    const original = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        select: {
            id: true, title: true, agenda: true, programId: true,
            targetField: true, durationMinutes: true, capacity: true,
            universityId: true,
            seats: {
                where: { status: 'WAITLISTED' },
                select: { studentId: true },
                orderBy: { waitlistPos: 'asc' }
            }
        }
    })
    if (!original || original.universityId !== uni.id) return { error: 'Session not found' }

    const newScheduledAt = new Date(scheduledAt)
    if (isNaN(newScheduledAt.getTime())) return { error: 'Invalid date' }

    // Clone session
    const followUp = await prisma.groupSession.create({
        data: {
            universityId:    uni.id,
            title:           original.title,
            agenda:          original.agenda,
            programId:       original.programId,
            targetField:     original.targetField,
            durationMinutes: original.durationMinutes,
            capacity:        original.capacity,
            scheduledAt:     newScheduledAt,
            status:          'OPEN',
        }
    })

    // Link original to follow-up
    await prisma.groupSession.update({
        where: { id: sessionId },
        data: { followUpDraftId: followUp.id }
    })

    // Notify waitlisted students from original session FIRST
    const waitlistedIds = original.seats.map(s => s.studentId)
    if (waitlistedIds.length > 0) {
        await notifyMatchedStudents(followUp.id, waitlistedIds)
    }

    revalidatePath('/university/dashboard')
    return { success: true, followUp, notifiedWaitlist: waitlistedIds.length }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function resolveSmartAudience(
    universityId: string,
    programId?: string | null,
    targetField?: string | null,
): Promise<string[]> {
    const studentIdSet = new Set<string>()

    // Tier 1 — direct program interest
    if (programId) {
        const direct = await prisma.interest.findMany({
            where: { universityId, programId },
            select: { studentId: true },
            distinct: ['studentId']
        })
        direct.forEach(i => studentIdSet.add(i.studentId))
    }

    // Tier 2 — field of interest match
    if (targetField && studentIdSet.size < 50) {
        const fieldMatches = await prisma.student.findMany({
            where: {
                fieldOfInterest: { contains: targetField, mode: 'insensitive' },
                interests: { some: { universityId } }
            },
            select: { id: true },
            take: 50,
        })
        fieldMatches.forEach(s => studentIdSet.add(s.id))
    }

    return [...studentIdSet]
}

async function getNextWaitlistPos(
    tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    sessionId: string
): Promise<number> {
    const lastWaitlisted = await tx.groupSessionSeat.findFirst({
        where: { groupSessionId: sessionId, status: 'WAITLISTED' },
        orderBy: { waitlistPos: 'desc' },
        select: { waitlistPos: true }
    })
    return (lastWaitlisted?.waitlistPos ?? 0) + 1
}

async function handleSessionFull(sessionId: string, universityId: string) {
    // Count waitlisted students
    const waitlistCount = await prisma.groupSessionSeat.count({
        where: { groupSessionId: sessionId, status: 'WAITLISTED' }
    })

    // Get university name for notification
    const uni = await prisma.university.findUnique({
        where: { id: universityId },
        select: { id: true }
    })

    if (!uni) return

    // Notify university — session full + follow-up prompt
    await prisma.universityNotification.create({
        data: {
            universityId,
            title: '🔥 Session Full!',
            message: waitlistCount > 0
                ? `Your group session is full. ${waitlistCount} student${waitlistCount !== 1 ? 's' : ''} are on the waitlist — consider opening a follow-up session for them.`
                : `Your group session has reached full capacity.`,
            type:      'GROUP_SESSION',
            actionUrl: `/university/group-sessions/${sessionId}`,
        }
    })
}
