'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { notifyStudent, notifyUniversity } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'] as const

type SessionUser = { id?: string; role?: string }
type MeetingActor = 'STUDENT' | 'UNIVERSITY' | 'UNIVERSITY_REP'
type RescheduleSlotRow = { id: string; startTime: Date; endTime: Date }

export type RescheduleSlotOption = {
    id: string
    startTime: string
    endTime: string
    durationMinutes: number
    repTimezone: string
}

async function getSessionUser() {
    const session = await auth()
    return session?.user as SessionUser | undefined
}

async function authorizeMeetingActor(
    user: SessionUser,
    meeting: { studentId: string | null; repId: string | null; university: { userId: string } }
): Promise<MeetingActor | null> {
    if (!user.id) return null

    if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({
            where: { userId: user.id },
            select: { id: true },
        })
        return student && meeting.studentId === student.id ? 'STUDENT' : null
    }

    if (user.role === 'UNIVERSITY') {
        return meeting.university.userId === user.id ? 'UNIVERSITY' : null
    }

    if (user.role === 'UNIVERSITY_REP') {
        return meeting.repId === user.id ? 'UNIVERSITY_REP' : null
    }

    return null
}

export async function getRescheduleAvailableSlots(meetingId: string) {
    const user = await getSessionUser()
    if (!user?.id) return { error: 'Unauthorized', slots: [] as RescheduleSlotOption[] }
    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting', slots: [] as RescheduleSlotOption[] }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: { select: { userId: true } } },
    })
    if (!meeting) return { error: 'Meeting not found', slots: [] as RescheduleSlotOption[] }
    if (!meeting.repId) return { error: 'This meeting does not have an assigned representative.', slots: [] as RescheduleSlotOption[] }
    if (!ALLOWED_STATUSES.includes(meeting.status as (typeof ALLOWED_STATUSES)[number])) {
        return { error: 'This meeting cannot be rescheduled.', slots: [] as RescheduleSlotOption[] }
    }

    const actor = await authorizeMeetingActor(user, meeting)
    if (!actor) return { error: 'Unauthorized', slots: [] as RescheduleSlotOption[] }

    const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime()
    const now = new Date()
    const slots: RescheduleSlotRow[] = await prisma.availabilitySlot.findMany({
        where: {
            universityId: meeting.universityId,
            repId: meeting.repId,
            startTime: { gt: now },
            isBooked: false,
            meetingId: null,
        },
        select: { id: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
        take: 120,
    })

    const repTimezone = meeting.repTimezone || 'UTC'
    const matchingSlots: RescheduleSlotOption[] = slots
        .filter((slot: RescheduleSlotRow) => slot.endTime.getTime() - slot.startTime.getTime() === durationMs)
        .slice(0, 60)
        .map((slot: RescheduleSlotRow) => ({
            id: slot.id,
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            durationMinutes: Math.round(durationMs / 60_000),
            repTimezone,
        }))

    return { slots: matchingSlots }
}

export async function proposeMeetingReschedule(meetingId: string, slotId: string, reason: string) {
    const user = await getSessionUser()
    if (!user?.id) return { error: 'Unauthorized' }
    if (!meetingId || meetingId.length > 100 || !slotId || slotId.length > 100) return { error: 'Invalid meeting or slot' }

    const safeReason = reason.trim().slice(0, 500)
    if (!safeReason) return { error: 'Please provide a reason for rescheduling.' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: true },
    })
    if (!meeting) return { error: 'Meeting not found' }
    if (!meeting.repId) return { error: 'This meeting does not have an assigned representative.' }
    if (!ALLOWED_STATUSES.includes(meeting.status as (typeof ALLOWED_STATUSES)[number])) {
        return { error: 'This meeting cannot be rescheduled.' }
    }

    const proposedBy = await authorizeMeetingActor(user, meeting)
    if (!proposedBy) return { error: 'Unauthorized' }

    const slot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId },
        select: {
            id: true,
            universityId: true,
            repId: true,
            startTime: true,
            endTime: true,
            isBooked: true,
            meetingId: true,
        },
    })
    if (!slot) return { error: 'That slot is no longer available. Please refresh and choose another.' }
    if (slot.universityId !== meeting.universityId || slot.repId !== meeting.repId) {
        return { error: 'Invalid slot selection.' }
    }
    if (slot.isBooked || slot.meetingId) return { error: 'That slot was just taken. Please choose another.' }
    if (slot.startTime <= new Date()) return { error: 'Please choose a future slot.' }

    const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime()
    if (slot.endTime.getTime() - slot.startTime.getTime() !== durationMs) {
        return { error: 'That slot does not match this meeting duration.' }
    }

    const proposedTime = slot.startTime

    try {
        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: 'RESCHEDULE_PROPOSED',
                rescheduleProposedBy: proposedBy,
                rescheduleProposedTime: proposedTime,
            },
        })

        if (proposedBy === 'STUDENT') {
            await notifyUniversity(meeting.universityId, {
                title: 'Reschedule Proposed',
                message: `A student proposed a new meeting time: ${proposedTime.toLocaleString()}. Reason: ${safeReason}`,
                type: 'INFO',
                actionUrl: '/university/meetings',
            })
        } else if (meeting.studentId) {
            await notifyStudent(meeting.studentId, {
                title: 'Reschedule Proposed',
                message: `${meeting.university.institutionName} proposed a new meeting time: ${proposedTime.toLocaleString()}. Reason: ${safeReason}`,
                type: 'INFO',
                actionUrl: '/student/meetings',
            })
        }

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')
        return { success: true }
    } catch {
        console.error('[proposeMeetingReschedule] Failed')
        return { error: 'Failed to propose reschedule. Please try again.' }
    }
}

export async function acceptMeetingReschedule(meetingId: string) {
    const user = await getSessionUser()
    if (!user?.id) return { error: 'Unauthorized' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: true },
    })
    if (!meeting || meeting.status !== 'RESCHEDULE_PROPOSED' || !meeting.rescheduleProposedTime || !meeting.repId) {
        return { error: 'No active reschedule proposal found.' }
    }

    const proposedBy = meeting.rescheduleProposedBy
    if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } })
        if (!student || meeting.studentId !== student.id || proposedBy === 'STUDENT') return { error: 'Unauthorized' }
    } else if (user.role === 'UNIVERSITY') {
        if (meeting.university.userId !== user.id || proposedBy !== 'STUDENT') return { error: 'Unauthorized' }
    } else if (user.role === 'UNIVERSITY_REP') {
        if (meeting.repId !== user.id || proposedBy !== 'STUDENT') return { error: 'Unauthorized' }
    } else {
        return { error: 'Unauthorized' }
    }

    const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime()
    const newStart = meeting.rescheduleProposedTime
    const newEnd = new Date(newStart.getTime() + durationMs)

    try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const current = await tx.meeting.findUnique({
                where: { id: meetingId },
                select: { status: true, rescheduleProposedTime: true, repId: true, universityId: true, joinUrl: true, hostRoomUrl: true },
            })
            if (!current || current.status !== 'RESCHEDULE_PROPOSED' || !current.rescheduleProposedTime || !current.repId) {
                throw new Error('STALE_PROPOSAL')
            }

            const targetSlot = await tx.availabilitySlot.findFirst({
                where: {
                    universityId: current.universityId,
                    repId: current.repId,
                    startTime: current.rescheduleProposedTime,
                    endTime: newEnd,
                    isBooked: false,
                    meetingId: null,
                },
                select: { id: true },
            })
            if (!targetSlot) throw new Error('SLOT_TAKEN')

            await tx.availabilitySlot.updateMany({
                where: { meetingId },
                data: { isBooked: false, meetingId: null },
            })

            const reserved = await tx.availabilitySlot.updateMany({
                where: { id: targetSlot.id, isBooked: false, meetingId: null },
                data: { isBooked: true, meetingId },
            })
            if (reserved.count !== 1) throw new Error('SLOT_TAKEN')

            await tx.meeting.update({
                where: { id: meetingId },
                data: {
                    startTime: current.rescheduleProposedTime,
                    endTime: newEnd,
                    status: current.joinUrl || current.hostRoomUrl ? 'CONFIRMED' : 'PENDING',
                    rescheduleProposedBy: null,
                    rescheduleProposedTime: null,
                },
            })
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

        if (meeting.studentId) {
            await notifyStudent(meeting.studentId, {
                title: 'Reschedule Accepted',
                message: `Your meeting with ${meeting.university.institutionName} has been moved to ${newStart.toLocaleString()}.`,
                type: 'INFO',
                actionUrl: '/student/meetings',
            })
        }
        await notifyUniversity(meeting.universityId, {
            title: 'Reschedule Accepted',
            message: `The meeting has been moved to ${newStart.toLocaleString()}.`,
            type: 'INFO',
            actionUrl: '/university/meetings',
        })

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')
        return { success: true }
    } catch (error: any) {
        if (error?.message === 'SLOT_TAKEN') return { error: 'That proposed slot is no longer available.' }
        if (error?.message === 'STALE_PROPOSAL') return { error: 'This reschedule proposal is no longer active.' }
        return { error: 'Failed to accept reschedule. Please try again.' }
    }
}

export async function declineMeetingReschedule(meetingId: string) {
    const user = await getSessionUser()
    if (!user?.id) return { error: 'Unauthorized' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: true },
    })
    if (!meeting || meeting.status !== 'RESCHEDULE_PROPOSED') return { error: 'No active reschedule proposal found.' }

    const proposedBy = meeting.rescheduleProposedBy
    if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } })
        if (!student || meeting.studentId !== student.id || proposedBy === 'STUDENT') return { error: 'Unauthorized' }
    } else if (user.role === 'UNIVERSITY') {
        if (meeting.university.userId !== user.id || proposedBy !== 'STUDENT') return { error: 'Unauthorized' }
    } else if (user.role === 'UNIVERSITY_REP') {
        if (meeting.repId !== user.id || proposedBy !== 'STUDENT') return { error: 'Unauthorized' }
    } else {
        return { error: 'Unauthorized' }
    }

    const restoredStatus = meeting.joinUrl || meeting.hostRoomUrl ? 'CONFIRMED' : 'PENDING'
    await prisma.meeting.update({
        where: { id: meetingId },
        data: {
            status: restoredStatus,
            rescheduleProposedBy: null,
            rescheduleProposedTime: null,
        },
    })

    revalidatePath('/student/meetings')
    revalidatePath('/university/meetings')
    return { success: true }
}
