'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyStudent, notifyUniversity } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'] as const

export async function proposeMeetingReschedule(meetingId: string, proposedIso: string, reason: string) {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
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
            repId: meeting.repId || undefined,
            startTime: proposedTime,
            endTime: proposedEnd,
            isBooked: false,
            meetingId: null,
        },
        select: { id: true },
    })
    if (!slot) return { error: 'That time is not currently available. Please choose an open slot.' }

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.meeting.findUnique({
                where: { id: meetingId },
                select: { status: true },
            })
            if (!current || !ALLOWED_STATUSES.includes(current.status as (typeof ALLOWED_STATUSES)[number])) {
                throw new Error('NOT_RESCHEDULABLE')
            }

            await tx.meeting.update({
                where: { id: meetingId },
                data: {
                    status: 'RESCHEDULE_PROPOSED',
                    rescheduleProposedBy: proposedBy,
                    rescheduleProposedTime: proposedTime,
                },
            })
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
    } catch (error: any) {
        if (error?.message === 'NOT_RESCHEDULABLE') return { error: 'This meeting can no longer be rescheduled.' }
        console.error('[proposeMeetingReschedule] Failed')
        return { error: 'Failed to propose reschedule. Please try again.' }
    }
}
