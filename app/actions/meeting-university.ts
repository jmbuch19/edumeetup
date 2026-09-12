'use server'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { notifyStudent } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

async function getUniversityActor() {
    const session = await auth()
    return session?.user as { id?: string; role?: string } | undefined
}

function canManageMeeting(user: { id?: string; role?: string }, meeting: { repId: string | null; university: { userId: string } }) {
    if (!user.id) return false
    if (user.role === 'UNIVERSITY') return meeting.university.userId === user.id
    if (user.role === 'UNIVERSITY_REP') return meeting.repId === user.id
    return false
}

export async function confirmUniversityMeeting(meetingId: string) {
    const user = await getUniversityActor()
    if (!user?.id || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(user.role || '')) return { error: 'Unauthorized' }
    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: true },
    })
    if (!meeting) return { error: 'Meeting not found' }
    if (!canManageMeeting(user, meeting)) return { error: 'Unauthorized' }
    if (meeting.status !== 'PENDING') return { error: 'Only pending meetings can be confirmed.' }
    if (meeting.startTime <= new Date()) return { error: 'Past meetings cannot be confirmed.' }

    let joinUrl = meeting.joinUrl
    let hostRoomUrl = meeting.hostRoomUrl

    if (!joinUrl) {
        try {
            const { createWherebyMeeting } = await import('@/lib/whereby')
            const room = await createWherebyMeeting(meeting.title || 'edumeetup-session', meeting.durationMinutes)
            joinUrl = room.roomUrl
            hostRoomUrl = room.hostRoomUrl
        } catch {
            console.error('[confirmUniversityMeeting] Whereby room creation failed')
            return { error: 'Could not create the meeting room. Please try again.' }
        }
    }

    await prisma.meeting.update({
        where: { id: meetingId },
        data: {
            status: 'CONFIRMED',
            joinUrl,
            hostRoomUrl,
            videoProvider: joinUrl ? 'EXTERNAL_LINK' : meeting.videoProvider,
        },
    })

    if (meeting.studentId) {
        await notifyStudent(meeting.studentId, {
            title: 'Meeting Confirmed',
            message: `Your meeting with ${meeting.university.institutionName} has been confirmed.`,
            type: 'INFO',
            actionUrl: '/student/meetings',
        })
    }

    revalidatePath('/university/meetings')
    revalidatePath('/student/meetings')
    return { success: true }
}

export async function cancelUniversityMeeting(meetingId: string, reason = 'Cancelled by university') {
    const user = await getUniversityActor()
    if (!user?.id || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(user.role || '')) {
        return { error: 'Unauthorized' }
    }
    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { university: { include: { user: true } } },
    })
    if (!meeting) return { error: 'Meeting not found' }
    if (!canManageMeeting(user, meeting)) return { error: 'Unauthorized' }
    if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(meeting.status)) {
        return { error: 'This meeting cannot be cancelled.' }
    }
    if (meeting.startTime <= new Date()) return { error: 'Past meetings cannot be cancelled.' }

    const safeReason = reason.trim().slice(0, 500) || 'Cancelled by university'

    try {
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const current = await tx.meeting.findUnique({
                where: { id: meetingId },
                select: { id: true, universityId: true, repId: true, status: true },
            })
            if (!current || current.universityId !== meeting.universityId) throw new Error('UNAUTHORIZED')
            if (user.role === 'UNIVERSITY_REP' && current.repId !== user.id) throw new Error('UNAUTHORIZED')
            if (user.role === 'UNIVERSITY' && meeting.university.userId !== user.id) throw new Error('UNAUTHORIZED')
            if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(current.status)) {
                throw new Error('NOT_CANCELLABLE')
            }

            await tx.meeting.update({
                where: { id: meetingId },
                data: {
                    status: 'CANCELLED',
                    cancellationReason: safeReason,
                    cancelledBy: user.role === 'UNIVERSITY_REP' ? 'UNIVERSITY_REP' : 'UNIVERSITY',
                    cancelledAt: new Date(),
                    isLateCancel: meeting.startTime.getTime() - Date.now() < 24 * 60 * 60 * 1000,
                },
            })

            await tx.availabilitySlot.updateMany({
                where: { meetingId },
                data: { isBooked: false, meetingId: null },
            })
        })

        if (meeting.studentId) {
            await notifyStudent(meeting.studentId, {
                title: 'Meeting Cancelled',
                message: `Your meeting with ${meeting.university.institutionName} was cancelled. Reason: ${safeReason}`,
                type: 'WARNING',
                actionUrl: '/student/meetings',
            })
        }

        const studentUser = meeting.studentId
            ? await prisma.student.findUnique({ where: { id: meeting.studentId }, select: { userId: true } })
            : null
        if (studentUser?.userId) {
            await createNotification({
                userId: studentUser.userId,
                type: 'MEETING_CANCELLED',
                title: 'Meeting Cancelled',
                message: `Your meeting with ${meeting.university.institutionName} was cancelled. Reason: ${safeReason}`,
                payload: { meetingId: meeting.id, cancelledBy: user.role },
            })

            const recipient = await prisma.user.findUnique({ where: { id: studentUser.userId }, select: { email: true } })
            if (recipient?.email) {
                await sendEmail({
                    to: recipient.email,
                    subject: `Meeting Cancelled: ${meeting.university.institutionName}`,
                    html: generateEmailHtml('Meeting Cancelled', `<p>Your meeting has been cancelled.</p><p><strong>Reason:</strong> ${safeReason}</p>`),
                })
            }
        }

        revalidatePath('/university/meetings')
        revalidatePath('/student/meetings')
        return { success: true }
    } catch (error: any) {
        if (error?.message === 'UNAUTHORIZED') return { error: 'Unauthorized' }
        if (error?.message === 'NOT_CANCELLABLE') return { error: 'This meeting cannot be cancelled.' }
        console.error('[cancelUniversityMeeting] Failed to cancel meeting')
        return { error: 'Failed to cancel meeting. Please try again.' }
    }
}
