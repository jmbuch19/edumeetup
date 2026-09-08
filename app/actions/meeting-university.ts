'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { notifyStudent } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

export async function cancelUniversityMeeting(meetingId: string, reason = 'Cancelled by university') {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    if (!user?.id || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(user.role || '')) {
        return { error: 'Unauthorized' }
    }

    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
            university: { include: { user: true } },
            availabilitySlot: true,
        },
    })
    if (!meeting) return { error: 'Meeting not found' }

    const isOwner = meeting.university?.userId === user.id
    const isRep = meeting.repId === user.id && user.role === 'UNIVERSITY_REP'
    if (!isOwner && !isRep) return { error: 'Unauthorized' }

    if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(meeting.status)) {
        return { error: 'This meeting cannot be cancelled.' }
    }
    if (meeting.startTime <= new Date()) return { error: 'Past meetings cannot be cancelled.' }

    const safeReason = reason.trim().slice(0, 500) || 'Cancelled by university'

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.meeting.findUnique({
                where: { id: meetingId },
                select: { id: true, universityId: true, repId: true, status: true, availabilitySlotId: true },
            })
            if (!current || current.universityId !== meeting.universityId) throw new Error('UNAUTHORIZED')
            if (user.role === 'UNIVERSITY_REP' && current.repId !== user.id) throw new Error('UNAUTHORIZED')
            if (user.role === 'UNIVERSITY' && meeting.university?.userId !== user.id) throw new Error('UNAUTHORIZED')
            if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(current.status)) throw new Error('NOT_CANCELLABLE')

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

            if (current.availabilitySlotId) {
                await tx.availabilitySlot.updateMany({
                    where: { id: current.availabilitySlotId, meetingId },
                    data: { isBooked: false, meetingId: null },
                })
            }
        })

        if (meeting.studentId) {
            await notifyStudent(meeting.studentId, {
                title: 'Meeting Cancelled',
                message: `Your meeting with ${meeting.university?.institutionName || 'the university'} was cancelled. Reason: ${safeReason}`,
                type: 'WARNING',
                actionUrl: '/student/meetings',
            })
        }

        const studentUser = meeting.studentId
            ? await prisma.student.findUnique({ where: { id: meeting.studentId }, select: { userId: true, fullName: true } })
            : null
        if (studentUser?.userId) {
            await createNotification({
                userId: studentUser.userId,
                type: 'MEETING_CANCELLED',
                title: 'Meeting Cancelled',
                message: `Your meeting with ${meeting.university?.institutionName || 'the university'} was cancelled. Reason: ${safeReason}`,
                payload: { meetingId: meeting.id, cancelledBy: user.role },
            })

            const recipient = await prisma.user.findUnique({ where: { id: studentUser.userId }, select: { email: true } })
            if (recipient?.email) {
                await sendEmail({
                    to: recipient.email,
                    subject: `Meeting Cancelled: ${meeting.university?.institutionName || 'University'}`,
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
