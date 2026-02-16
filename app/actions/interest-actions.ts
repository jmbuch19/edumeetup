'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email' // Assuming this exists

// Types for the UI
export type InterestStats = {
    total: number
    byCountry: { name: string; value: number }[]
    byStatus: { name: string; value: number }[]
}

export type InterestedStudent = {
    id: string
    fullName: string
    country: string | null
    currentStatus: string | null
    fieldOfInterest: string | null
    preferredDegree: string | null
    interestDate: Date
    hasMeeting: boolean
}

export async function getProgramInterestStats(programId: string): Promise<InterestStats> {
    const user = await requireUser()
    const uni = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
    if (!uni) throw new Error("Unauthorized")

    // Verify program belongs to uni
    const program = await prisma.program.findFirst({
        where: { id: programId, universityId: uni.id }
    })
    if (!program) throw new Error("Program not found or unauthorized")

    const interests = await prisma.interest.findMany({
        where: { programId },
        include: { student: true }
    })

    const total = interests.length

    // Aggregate by Country
    const countryMap = new Map<string, number>()
    interests.forEach(i => {
        const country = i.student.country || 'Unknown'
        countryMap.set(country, (countryMap.get(country) || 0) + 1)
    })
    const byCountry = Array.from(countryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // Top 5

    // Aggregate by Status
    const statusMap = new Map<string, number>()
    interests.forEach(i => {
        const status = i.student.currentStatus || 'Unknown'
        statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    const byStatus = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))

    return { total, byCountry, byStatus }
}

export async function getInterestedStudents(programId: string): Promise<InterestedStudent[]> {
    const user = await requireUser()
    const uni = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
    if (!uni) throw new Error("Unauthorized")

    // Verify program belongs to uni
    const program = await prisma.program.findFirst({
        where: { id: programId, universityId: uni.id }
    })
    if (!program) throw new Error("Program not found or unauthorized")

    const interests = await prisma.interest.findMany({
        where: { programId },
        include: {
            student: true
        },
        orderBy: { createdAt: 'desc' }
    })

    // Check for existing meetings to flag "hasMeeting"
    // This is a bit expensive in loop, maybe optimize later
    const students = await Promise.all(interests.map(async (i) => {
        const meeting = await prisma.meetingParticipant.findFirst({
            where: {
                participantUserId: i.student.userId,
                meeting: {
                    createdByUniversityId: uni.id
                }
            }
        })

        return {
            id: i.studentId,
            fullName: i.student.fullName,
            country: i.student.country,
            currentStatus: i.student.currentStatus,
            fieldOfInterest: i.student.fieldOfInterest,
            preferredDegree: i.student.preferredDegree,
            interestDate: i.createdAt,
            hasMeeting: !!meeting
        }
    }))

    return students
}

export async function sendBulkNotification(programId: string, subject: string, message: string) {
    const user = await requireUser()
    const uni = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
    if (!uni) throw new Error("Unauthorized")

    // Verify program belongs to uni
    const program = await prisma.program.findUnique({
        where: { id: programId, universityId: uni.id }
    })
    if (!program) throw new Error("Program not found or unauthorized")

    const interests = await prisma.interest.findMany({
        where: { programId },
        include: {
            student: {
                include: { user: true }
            }
        }
    })

    if (interests.length === 0) return { success: true, count: 0 }

    // Create Notifications
    await prisma.notification.createMany({
        data: interests.map(i => ({
            userId: i.student.userId,
            type: 'UNIVERSITY_MESSAGE',
            title: subject,
            message: message,
            payload: { universityId: uni.id, programId }
        }))
    })

    // Send Emails (Background or Batch)
    // For MVP, simplistic loop (careful with rate limits if real)
    for (const interest of interests) {
        await sendEmail({
            to: interest.student.user.email,
            subject: `Message from ${uni.institutionName}: ${subject}`,
            html: `<p>${message}</p><br/><p>Sent via EduMeetup regarding ${program.programName}</p>`
        })
    }

    return { success: true, count: interests.length }
}
