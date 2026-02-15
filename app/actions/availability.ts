'use server'

import { prisma } from "@/lib/prisma"
import { requireRole, requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// --- Availability Actions ---

export async function setAvailability(slots: { startTime: Date, endTime: Date }[]) {
    const user = await requireRole('UNIVERSITY')
    const university = await prisma.universityProfile.findUnique({
        where: { userId: user.id }
    })

    if (!university) return { error: "University profile not found" }

    // Create slots
    // Ideally we should check for overlaps but for MVP we just create
    try {
        await prisma.availabilitySlot.createMany({
            data: slots.map(slot => ({
                universityId: university.id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isBooked: false
            }))
        })
        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Error setting availability:", error)
        return { error: "Failed to set availability" }
    }
}

export async function getAvailability(universityId: string) {
    // Public or protected? Maybe public for students to see?
    // For now, let's assume it's for the dashboard or booking flow
    const slots = await prisma.availabilitySlot.findMany({
        where: {
            universityId,
            startTime: { gte: new Date() } // Future slots only
        },
        orderBy: { startTime: 'asc' }
    })
    return slots
}

export async function deleteAvailabilitySlot(slotId: string) {
    const user = await requireRole('UNIVERSITY')
    const university = await prisma.universityProfile.findUnique({
        where: { userId: user.id }
    })

    if (!university) return { error: "Unauthorized" }

    const slot = await prisma.availabilitySlot.findUnique({
        where: { id: slotId }
    })

    if (!slot || slot.universityId !== university.id) {
        return { error: "Slot not found or unauthorized" }
    }

    if (slot.isBooked) {
        return { error: "Cannot delete a booked slot" }
    }

    await prisma.availabilitySlot.delete({
        where: { id: slotId }
    })

    revalidatePath('/university/dashboard')
    return { success: true }
}

// --- Follow-up Request Action ---

export async function requestFollowUp(meetingId: string) {
    const user = await requireRole('STUDENT')

    // 1. Verify the meeting exists and user was a participant
    const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { participants: true }
    })

    if (!meeting) return { error: "Meeting not found" }

    const isParticipant = meeting.participants.some(p => p.participantUserId === user.id)
    if (!isParticipant) return { error: "You were not a participant in this meeting" }

    if (meeting.meetingType !== 'GROUP') {
        return { error: "Follow-ups are typically for Group sessions. Contact university directly." }
    }

    // 2. Create a notification for the university
    const uniProfile = await prisma.universityProfile.findUnique({
        where: { id: meeting.createdByUniversityId }
    })

    if (!uniProfile) return { error: "University not found" }

    await prisma.notification.create({
        data: {
            userId: uniProfile.userId,
            type: "FOLLOW_UP_REQUEST",
            title: "Follow-up Requested",
            message: `Student ${user.email} requested a 1:1 follow-up from meeting "${meeting.title}"`,
            payload: { originalMeetingId: meeting.id, studentUserId: user.id }
        }
    })

    return { success: true }
}
