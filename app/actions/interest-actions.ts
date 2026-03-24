'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { notifyStudent } from '@/lib/notify'

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
    const uni = await prisma.university.findUnique({ where: { userId: user.id } })
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
    interests.filter((i: any) => i.student !== null).forEach((i: any) => {
        const country = i.student?.country || 'Unknown'
        countryMap.set(country, (countryMap.get(country) || 0) + 1)
    })
    const byCountry = Array.from(countryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // Top 5

    // Aggregate by Status
    const statusMap = new Map<string, number>()
    interests.filter((i: any) => i.student !== null).forEach((i: any) => {
        const status = i.student?.currentStatus || 'Unknown'
        statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    const byStatus = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))

    return { total, byCountry, byStatus }
}

export async function getInterestedStudents(programId: string): Promise<InterestedStudent[]> {
    const user = await requireUser()
    const uni = await prisma.university.findUnique({ where: { userId: user.id } })
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
    const students = await Promise.all(interests.filter((i: any) => i.student !== null).map(async (i: any) => {
        const meeting = await prisma.meetingParticipant.findFirst({
            where: {
                participantUserId: i.student!.userId,
                meeting: {
                    universityId: uni.id
                }
            }
        })

        return {
            id: i.studentId,
            fullName: i.student?.fullName || 'Unknown Student',
            country: i.student?.country ?? null,
            currentStatus: i.student?.currentStatus ?? null,
            fieldOfInterest: i.student?.fieldOfInterest ?? null,
            preferredDegree: i.student?.preferredDegree ?? null,
            interestDate: i.createdAt,
            hasMeeting: !!meeting
        }
    }))

    return students
}

export async function sendBulkNotification(
    programId: string, 
    subject: string, 
    message: string
): Promise<{ success?: boolean; count?: number; error?: string }> {
    const user = await requireUser()
    const uni = await prisma.university.findUnique({ where: { userId: user.id } })
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

    // Create Notifications (generic table + role-specific bell)
    await prisma.notification.createMany({
        data: interests.filter((i: any) => i.student !== null).map((i: any) => ({
            userId: i.student.userId,
            type: 'UNIVERSITY_MESSAGE',
            title: subject,
            message: message,
            payload: { universityId: uni.id, programId }
        }))
    })

    // Role-specific StudentNotification (dashboard bell)
    for (const interest of interests) {
        await notifyStudent(interest.studentId, {
            title: subject,
            message: message,
            type: 'INFO',
            actionUrl: `/universities/${uni.id}`
        })
    }

    // Send Emails
    for (const interest of interests) {
        if (!interest.student?.user?.email) continue
        await sendEmail({
            to: interest.student.user.email,
            subject: `Message from ${uni.institutionName}: ${subject}`,
            html: `<p>${message}</p><br/><p>Sent via EdUmeetup regarding ${program.programName}</p>`
        })
    }

    return { success: true, count: interests.length }
}
