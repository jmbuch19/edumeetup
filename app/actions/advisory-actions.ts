'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { notifyStudent } from '@/lib/notify'

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

    try {
        await prisma.advisoryRequest.create({
            data: {
                studentId: student.id,
                ...data,
                status: 'NEW'
            }
        })

        await notifyStudent(student.id, {
            title: 'Advisory Request Received',
            message: 'Your advisory request has been submitted. Our team will review it and assign an advisor shortly.',
            type: 'INFO',
            actionUrl: '/student/dashboard'
        })

        revalidatePath('/student/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Advisory Request Error:")
        return { success: false, error: "Failed to submit request." }
    }
}

/**
 * Continue a completed university meeting into the IAES Guided Pathway.
 *
 * No client-supplied university/program context is trusted. The meeting is loaded
 * by ID and must belong to the signed-in student and already be COMPLETED. The
 * resulting advisory request carries a human-readable audit trail in internalNotes
 * without requiring a schema migration on the production database.
 */
export async function createAdvisoryRequestFromMeeting(meetingId: string) {
    const user = await requireUser()
    if (!meetingId || meetingId.length > 100) return { success: false, error: 'Invalid meeting.' }

    const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: {
            id: true,
            preferredDegree: true,
            fieldOfInterest: true,
            preferredCountries: true,
            budgetRange: true,
            englishScore: true,
            greScore: true,
            gmatScore: true,
            preferredIntake: true,
        }
    })
    if (!student) return { success: false, error: 'Student profile not found.' }

    const existingActive = await prisma.advisoryRequest.findFirst({
        where: {
            studentId: student.id,
            status: { in: ['NEW', 'ASSIGNED', 'SCHEDULED'] }
        },
        select: { id: true, status: true }
    })
    if (existingActive) {
        return {
            success: false,
            error: 'You already have an active Guided Pathway request. Open your dashboard to continue with it.'
        }
    }

    const meeting = await prisma.meeting.findFirst({
        where: {
            id: meetingId,
            studentId: student.id,
            status: 'COMPLETED',
        },
        include: {
            university: { select: { institutionName: true, country: true } },
            program: { select: { programName: true, degreeLevel: true } },
            rep: { select: { name: true } },
        }
    })

    if (!meeting) {
        return { success: false, error: 'Only your completed university meetings can be continued with an IAES adviser.' }
    }

    const testScore = [student.greScore && `GRE ${student.greScore}`, student.gmatScore && `GMAT ${student.gmatScore}`]
        .filter(Boolean)
        .join(' / ')

    const contextLines = [
        'Source: completed EdUmeetup university meeting',
        `Meeting code: ${meeting.meetingCode}`,
        `University: ${meeting.university.institutionName}`,
        meeting.program?.programName ? `Program: ${meeting.program.programName}` : null,
        meeting.rep?.name ? `Representative: ${meeting.rep.name}` : null,
        `Meeting date: ${meeting.startTime.toISOString()}`,
        `Purpose: ${meeting.purpose}`,
        meeting.studentQuestions ? `Student questions: ${meeting.studentQuestions}` : null,
    ].filter(Boolean)

    try {
        await prisma.advisoryRequest.create({
            data: {
                studentId: student.id,
                targetDegree: meeting.program?.degreeLevel || student.preferredDegree,
                fieldOfInterest: student.fieldOfInterest,
                targetCountry: meeting.university.country || student.preferredCountries,
                budgetRange: student.budgetRange,
                englishScore: student.englishScore,
                greGmatScore: testScore || null,
                targetIntake: student.preferredIntake,
                openQuestion: `I completed a meeting with ${meeting.university.institutionName} and would like an IAES adviser to help me evaluate the next steps.`,
                internalNotes: contextLines.join('\n'),
                status: 'NEW',
            }
        })

        await notifyStudent(student.id, {
            title: 'IAES Adviser Follow-up Requested',
            message: `Your ${meeting.university.institutionName} meeting context has been sent securely to the IAES advisory team.`,
            type: 'INFO',
            actionUrl: '/student/dashboard'
        })

        revalidatePath('/student/dashboard')
        revalidatePath('/student/meetings')
        revalidatePath('/admin/advisory')
        return { success: true }
    } catch (error) {
        console.error('[createAdvisoryRequestFromMeeting] Failed')
        return { success: false, error: 'Could not create the IAES follow-up request. Please try again.' }
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
