'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'

// Form Data Type
export type AdvisoryRequestData = {
    // Step 2: Goals
    targetDegree?: string
    fieldOfInterest?: string
    targetCountry?: string

    // Readiness
    budgetRange?: string
    englishScore?: string
    greGmatScore?: string

    // Step 3: Logistics
    preferredTime?: string
    targetIntake?: string

    openQuestion?: string
}

export async function createAdvisoryRequest(data: AdvisoryRequestData) {
    const user = await requireUser()

    // Ensure student profile exists
    const student = await prisma.student.findUnique({
        where: { userId: user.id }
    })

    if (!student) {
        throw new Error("Student profile not found. Please complete your registration.")
    }

    // Check availability logic? 
    // For now, just create the request.

    try {
        await prisma.advisoryRequest.create({
            data: {
                studentId: student.id,
                ...data,
                status: 'NEW'
            }
        })

        revalidatePath('/student/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Advisory Request Error:", error)
        return { success: false, error: "Failed to submit request." }
    }
}

export async function getStudentAdvisoryStatus() {
    const user = await requireUser()
    const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true }
    })

    if (!student) return null

    // Get latest request
    const request = await prisma.advisoryRequest.findFirst({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' }
    })

    return request
}
