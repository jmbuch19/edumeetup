'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { inviteRateLimiter } from '@/lib/ratelimit'
import { createMeetingSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notifications'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'

export async function createMeeting(formData: FormData) {
    const user = await requireUser()

    // RATE LIMIT
    if (!inviteRateLimiter.check(user.id)) {
        return { error: "You are sending too many meeting invites. Please slow down." }
    }

    const rawData = {
        title: formData.get('title'),
        startTime: formData.get('startTime'),
        duration: formData.get('duration'),
        type: formData.get('type'),
        joinUrl: formData.get('joinUrl'),
        participants: formData.getAll('participants'),
        availabilitySlotId: formData.get('availabilitySlotId') || undefined
    }

    const validation = createMeetingSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { title, startTime, duration, type, joinUrl, participants, availabilitySlotId } = validation.data

    try {
        if (user.role !== 'UNIVERSITY') return { error: "Unauthorized" }

        // Get university profile (DERIVED)
        const uniProfile = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
        if (!uniProfile) return { error: "Profile not found" }

        const start = new Date(startTime)
        const end = new Date(start.getTime() + duration * 60000)

        // Create Meeting
        const meeting = await prisma.meeting.create({
            data: {
                title,
                startTime: start,
                endTime: end,
                meetingType: type,
                joinUrl,
                createdByUniversityId: uniProfile.id, // Derived
                participants: {
                    create: participants.map(uid => ({
                        participantUserId: uid,
                        rsvpStatus: 'INVITED'
                    }))
                },
                // Link slot if provided
                availabilitySlot: availabilitySlotId ? {
                    connect: { id: availabilitySlotId }
                } : undefined
            },
            include: { participants: { include: { user: true } } }
        })

        // If slot used, mark as booked
        if (availabilitySlotId) {
            await prisma.availabilitySlot.update({
                where: { id: availabilitySlotId },
                data: { isBooked: true }
            })
        }

        // Send Notifications (Email + DB)
        for (const p of meeting.participants) {
            // DB Notification
            // DB & Email Notification
            await createNotification({
                userId: p.participantUserId,
                type: 'MEETING_INVITE',
                title: 'New Meeting Invitation',
                message: `You have been invited to: ${title} `,
                payload: { meetingId: meeting.id },
                emailTo: p.user.email,
                emailSubject: `Invitation: ${title} `,
                emailHtml: `<p>You have been invited to a meeting with ${uniProfile.institutionName}.</p>
        <p><strong>Topic: </strong> ${title}</p>
            <p><strong>Time: </strong> ${start.toLocaleString()}</p>
                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/student/dashboard?tab=meetings" > View Details & RSVP </a></p> `
            })
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to create meeting:", error)
        return { error: "Failed to create meeting" }
    }
}

export async function updateRSVP(formData: FormData) {
    const meetingId = formData.get('meetingId') as string
    const status = formData.get('status') as string

    try {
        const user = await requireUser()

        // Find participant record
        const participant = await prisma.meetingParticipant.findFirst({
            where: {
                meetingId,
                participantUserId: user.id
            }
        })

        if (!participant) return { error: "Participant not found" }

        await prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: { rsvpStatus: status }
        })

        // Notify University
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { university: { include: { user: true } } }
        })

        if (meeting?.university?.user) {
            const studentProfile = await prisma.studentProfile.findFirst({ where: { userId: user.id } })
            const studentName = studentProfile?.fullName || user.email

            await prisma.notification.create({
                data: {
                    userId: meeting.university.user.id,
                    type: 'MEETING_RSVP',
                    title: 'Meeting RSVP Update',
                    message: `${studentName} has responded: ${status} for "${meeting.title}"`,
                    payload: { meetingId, studentId: user.id, status }
                }
            })
        }

        revalidatePath('/student/dashboard')
        return { success: true }

    } catch (error) {
        console.error("Failed to update RSVP:", error)
        return { error: "Failed to update RSVP" }
    }
}

export async function cancelMeeting(meetingId: string) {
    try {
        const user = await requireUser()

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
        for (const p of meeting.participants) {
            if (p.participantUserId === user.id) continue

            // DB Notification
            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_CANCELED',
                    title: 'Meeting Canceled',
                    message: `The meeting "${meeting.title}" has been canceled by the university.`,
                    payload: { meetingId: meeting.id }
                }
            })

            // Email
            await sendEmail({
                to: p.user.email,
                subject: `Canceled: ${meeting.title}`,
                html: `<p>The meeting <strong>${meeting.title}</strong> scheduled for ${new Date(meeting.startTime).toLocaleString()} has been canceled.</p>`
            })
        }

        revalidatePath('/university/dashboard')
        revalidatePath('/student/dashboard')
        return { success: true }

    } catch (error) {
        console.error("Failed to cancel meeting:", error)
        return { error: "Failed to cancel meeting" }
    }
}

export async function updateMeeting(meetingId: string, formData: FormData) {
    try {
        const user = await requireUser()

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { university: { include: { user: true } } }
        })

        if (!meeting) return { error: "Meeting not found" }
        if (meeting.university.user.id !== user.id) return { error: "Unauthorized" }

        const title = formData.get('title') as string
        const joinUrl = formData.get('joinUrl') as string
        const agenda = formData.get('agenda') as string

        // Simple update
        const updatedMeeting = await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                title,
                joinUrl,
                agenda
            },
            include: { participants: { include: { user: true } } }
        })

        // Notify
        for (const p of updatedMeeting.participants) {
            if (p.participantUserId === user.id) continue

            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_UPDATED',
                    title: 'Meeting Updated',
                    message: `Details for "${title}" have been updated.`,
                    payload: { meetingId: meeting.id }
                }
            })
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update meeting:", error)
        return { error: "Failed to update meeting" }
    }
}
