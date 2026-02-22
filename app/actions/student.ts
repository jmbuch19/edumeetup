'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { interestRateLimiter } from '@/lib/ratelimit'
import { createNotification } from '@/lib/notifications'
import { EmailTemplates } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { studentProfileSchema } from '@/lib/schemas'

export async function expressInterest(universityId: string, studentEmail?: string, programId?: string) {
    const user = await requireUser()

    // RATE LIMIT
    if (!interestRateLimiter.check(user.id)) {
        return { error: "Too many interest requests. Please try again later." }
    }

    // Verify Student Role
    if (user.role !== 'STUDENT') return { error: "Only students can express interest" }

    const sessionEmail = user.email
    const emailToUse = sessionEmail || studentEmail
    // const ip = headers().get('x-forwarded-for') || 'unknown'

    try {
        const student = await prisma.studentProfile.findFirst({
            where: { user: { email: emailToUse } },
            include: { user: true }
        })

        if (!student) return { error: "Student profile not found" }

        const university = await prisma.universityProfile.findUnique({
            where: { id: universityId },
            include: { user: true }
        })

        if (!university) return { error: "University not found" }

        await prisma.interest.create({
            data: {
                studentId: student.id,
                universityId: universityId,
                programId: programId || null,
                status: 'INTERESTED',
                studentMessage: programId
                    ? `I am interested in a specific program.`
                    : "I am interested in your programs."
            }
        })

        // Notification for University
        // Notification for University
        await createNotification({
            userId: university.user.id,
            type: 'INTEREST_RECEIVED',
            title: 'New Student Interest',
            message: `${student.fullName} is interested in ${programId ? 'one of your programs' : 'your university'}.`,
            payload: { studentId: student.id, programId },
            emailTo: university.contactEmail || university.user.email,
            emailSubject: `New Interest from ${student.fullName}`,
            emailHtml: EmailTemplates.universityInterest(
                student.fullName,
                student.user.email,
                "I am interested in your programs."
            )
        })

        revalidatePath(`/universities/${universityId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to express interest:", error)
        return { error: "Failed to express interest" }
    }
}

export async function updateStudentProfile(formData: FormData) {
    const user = await requireUser()
    const student = await prisma.studentProfile.findFirst({ where: { userId: user.id } })

    if (!student) return { error: "Profile not found" }

    const rawData = Object.fromEntries(formData.entries())
    const validation = studentProfileSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    try {
        await prisma.studentProfile.update({
            where: { id: student.id },
            data: validation.data
        })

        revalidatePath('/student/profile')
        revalidatePath('/student/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update profile:", error)
        return { error: "Failed to update profile" }
    }
}
