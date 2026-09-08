'use server'

import { prisma } from '@/lib/prisma'
import { requireStudentUser } from '@/lib/auth/requireAuth'
import { createNotification, sendEmail, generateEmailHtml } from '@/lib/notifications'
import { notifyUniversity } from '@/lib/notify'
import { revalidatePath } from 'next/cache'

const cancellationReasonSchema = (reason: string) => reason.trim().slice(0, 500)

/**
 * Student-only cancellation for meetings owned by the authenticated student.
 * The meeting and its AvailabilitySlot are changed in one transaction so a
 * cancellation cannot leave a slot permanently marked as booked.
 */
export async function cancelStudentMeeting(meetingId: string, reason = 'Student requested cancellation') {
    const session = await requireStudentUser().catch(() => null)
    if (!session?.user?.id) return { error: 'Unauthorized' }

    if (!meetingId || meetingId.length > 100) return { error: 'Invalid meeting' }

    const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true, fullName: true },
    })
    if (!student) return { error: 'Student profile not found' }

    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
            university: { include: { user: true } },
            availabilitySlot: true,
            participants: { include: { user: true } },
        },
    })

    if (!meeting) return { error: 'Meeting not found' }
    if (meeting.studentId !== student.id) return { error: 'Unauthorized' }
    if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(meeting.status)) {
        return { error: 'This meeting cannot be cancelled.' }
    }
    if (meeting.startTime <= new Date()) return { error: 'Past meetings cannot be cancelled.' }

    const safeReason = cancellationReasonSchema(reason) || 'Student requested cancellation'

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.meeting.findUnique({
                where: { id: meetingId },
                select: { id: true, studentId: true, status: true, availabilitySlotId: true },
            })
            if (!current || current.studentId !== student.id) throw new Error('UNAUTHORIZED')
            if (!['DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED'].includes(current.status)) {
                throw new Error('NOT_CANCELLABLE')
            }

            await tx.meeting.update({
                where: { id: meetingId },
                data: {
                    status: 'CANCELLED',
                    cancellationReason: safeReason,
                    cancelledBy: 'STUDENT',
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

        const universityUserId = meeting.university?.user?.id
        if (universityUserId) {
            await createNotification({
                userId: universityUserId,
                type: 'MEETING_CANCELLED',
                title: 'Meeting Cancelled by Student',
                message: `${student.fullName || 'A student'} cancelled their meeting. Reason: ${safeReason}`,
                payload: { meetingId: meeting.id, cancelledBy: 'STUDENT' },
            })
        }

        await notifyUniversity(meeting.universityId, {
            title: 'Meeting Cancelled by Student',
            message: `${student.fullName || 'A student'} cancelled the meeting. Reason: ${safeReason}`,
            type: 'WARNING',
            actionUrl: '/university/meetings',
        })

        const universityEmail = meeting.university?.contactEmail || meeting.university?.user?.email
        if (universityEmail) {
            const title = meeting.title || `Meeting on ${meeting.startTime.toLocaleDateString()}`
            await sendEmail({
                to: universityEmail,
                subject: `Meeting Cancelled by Student: ${title}`,
                html: generateEmailHtml('Meeting Cancelled', `<p>${student.fullName || 'A student'} has cancelled the meeting.</p><p><strong>Reason:</strong> ${safeReason}</p>`),
            })
        }

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')
        return { success: true }
    } catch (error: any) {
        if (error?.message === 'UNAUTHORIZED') return { error: 'Unauthorized' }
        if (error?.message === 'NOT_CANCELLABLE') return { error: 'This meeting cannot be cancelled.' }
        console.error('[cancelStudentMeeting] Failed to cancel meeting')
        return { error: 'Failed to cancel meeting. Please try again.' }
    }
}
