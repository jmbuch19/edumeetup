'use server'

import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { createProgramSchema } from '@/lib/schemas'

export async function createProgram(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = createProgramSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const {
        programName, degreeLevel, fieldCategory, tuitionFee,
        durationMonths, intakes, currency, englishTests, minEnglishScore, stemDesignated
    } = validation.data

    try {
        const user = await requireUser()

        const uniProfile = await prisma.universityProfile.findUnique({
            where: { userId: user.id }
        })

        if (!uniProfile) {
            return { error: "Unauthorized: No university profile found" }
        }

        await prisma.program.create({
            data: {
                universityId: uniProfile.id, // Derived from session
                programName,
                degreeLevel,
                fieldCategory: fieldCategory as FieldCategory,
                tuitionFee,
                durationMonths,
                currency,
                intakes,
                englishTests,
                minEnglishScore: minEnglishScore ? parseFloat(minEnglishScore) : null,
                stemDesignated,
                status: 'ACTIVE'
            }
        })
        revalidatePath('/university/dashboard')
    } catch (error) {
        console.error("Failed to create program:", error)
        return { error: "Failed to create program" }
    }
}

export async function deleteProgram(programId: string) {
    try {
        const user = await requireUser()

        const program = await prisma.program.findUnique({
            where: { id: programId },
            include: { university: true }
        })

        if (!program) return { error: "Program not found" }

        if (program.university.userId !== user.id) {
            return { error: "Unauthorized" }
        }

        await prisma.program.delete({
            where: { id: programId }
        })

        await logAudit({
            action: 'DELETE_PROGRAM',
            entityType: 'PROGRAM',
            entityId: programId,
            actorId: user.id
        })

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete program:", error)
        return { error: "Failed to delete program" }
    }
}

export async function updateUniversityProfile(formData: FormData) {
    const meetingLink = formData.get('meetingLink') as string

    try {
        const user = await requireUser()

        const uniProfile = await prisma.universityProfile.findUnique({
            where: { userId: user.id }
        })

        if (!uniProfile) {
            return { error: "Unauthorized: No university profile found" }
        }

        await prisma.universityProfile.update({
            where: { id: uniProfile.id }, // Derived from session
            data: {
                meetingLink: meetingLink || null
            }
        })

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update profile:", error)
        return { error: "Failed to update profile" }
    }
}
