import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

export async function cancelMeetingLogic(user: { id: string }, meetingId: string) {
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                university: { include: { user: true } },
                participants: { include: { user: true } },
                availabilitySlot: true
            }
        })

        if (!meeting) return { error: "Meeting not found" }
        if (meeting.university.user.id !== user.id) return { error: "Unauthorized" }

        // 1. Update Status
        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'CANCELED' }
        })

        // 2. Free up slot if exists
        if (meeting.availabilitySlot) {
            await prisma.availabilitySlot.update({
                where: { id: meeting.availabilitySlot.id },
                data: { isBooked: false }
            })
        }

        // 3. Notify Participants
        const participantsToNotify = meeting.participants.filter(p => p.participantUserId !== user.id)

        // Batch DB Notifications
        if (participantsToNotify.length > 0) {
            await prisma.notification.createMany({
                data: participantsToNotify.map(p => ({
                    userId: p.participantUserId,
                    type: 'MEETING_CANCELED',
                    title: 'Meeting Canceled',
                    message: `The meeting "${meeting.title}" has been canceled by the university.`,
                    payload: { meetingId: meeting.id }
                }))
            })

            // Batch Emails (Parallel)
            await Promise.all(participantsToNotify.map(p =>
                sendEmail({
                    to: p.user.email,
                    subject: `Canceled: ${meeting.title}`,
                    html: `<p>The meeting <strong>${meeting.title}</strong> scheduled for ${new Date(meeting.startTime).toLocaleString()} has been canceled.</p>`
                })
            ))
        }

        return { success: true }

    } catch (error) {
        console.error("Failed to cancel meeting:", error)
        return { error: "Failed to cancel meeting" }
    }
}
