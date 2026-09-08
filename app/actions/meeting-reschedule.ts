'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { notifyStudent, notifyUniversity } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'] as const

async function getSessionUser() {
    const session = await auth()
    return session?.user as { id?: string; role?: string } | undefined
}

export async function proposeMeetingReschedule(meetingId: string, proposedIso: string, reason: string) {
    const user = await getSessionUser()
    if (!user?.id) return { error: 'Unauthorized' }
    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting' }

    const proposedTime = new Date(proposedIso)
    if (Number.isNaN(proposedTime.getTime())) return { error: 'Invalid date or time' }
    if (proposedTime <= new Date()) return { error: 'Please choose a future time.' }

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

    let proposedBy: 'STUDENT' | 'UNIVERSITY' | 'UNIVERSITY_REP'
    if (user.role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: user.id }, select: { id: true } })
        if (!student || meeting.studentId !== student.id) return { error: 'Unauthorized' }
        proposedBy = 'STUDENT'
    } else if (user.role === 'UNIVERSITY') {
        if (meeting.university.userId !== user.id) return { error: 'Unauthorized' }
        proposedBy = 'UNIVERSITY'
    } else if (user.role === 'UNIVERSITY_REP') {
        if (meeting.repId !== user.id) return { error: 'Unauthorized' }
        proposedBy = 'UNIVERSITY_REP'
    } else {
        return { error: 'Unauthorized' }
    }

    const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime()
    const proposedEnd = new Date(proposedTime.getTime() + durationMs)

    const slot = await prisma.availabilitySlot.findFirst({
        where: {
            universityId: meeting.universityId,
            repId: meeting.repId,
            startTime: proposedTime,
            endTime: proposedEnd,
            isBooked: false,
            meetingId: null,
        },
        select: { id: true },
    })
    if (!slot) return { error: 'That time is not currently available. Please choose an open slot.' }

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
