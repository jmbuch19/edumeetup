'use server'

import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

export type FairPassFormData = {
    fullName: string
    email: string
    phone: string
    currentInstitution?: string
    currentCourse?: string
    yearOfPassing?: string       // legacy — no longer shown in new form
    currentSemester?: string     // e.g. "6th Semester / 3rd Year"
    englishExam?: string         // e.g. "IELTS 6.5", "Not attempted"
    fieldOfInterest?: string
    budgetRange?: string
    preferredCountries?: string
    whatsappConsent?: boolean
    emailConsent?: boolean
    marketingConsent?: boolean
}

export type FairPassResult =
    | { pass: Awaited<ReturnType<typeof prisma.fairStudentPass.create>>; error?: never }
    | { error: string; pass?: never }

export async function createFairPass(
    formData: FairPassFormData,
    fairEventId: string,
): Promise<FairPassResult> {
    const email = formData.email.trim().toLowerCase()

    if (!email || !fairEventId) {
        return { error: 'Missing required fields' }
    }

    // Basic email format guard
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'Please enter a valid email address' }
    }

    try {
        // ── Idempotency check ───────────────────────────────────────────────
        const existing = await prisma.fairStudentPass.findUnique({
            where: { email_fairEventId: { email, fairEventId } },
        })
        if (existing) return { pass: existing }

        // ── Lookup registered user + student profile ────────────────────────
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: { student: true },
        })

        const yearOfPassing = formData.yearOfPassing
            ? parseInt(formData.yearOfPassing, 10)
            : null

        // ── Create pass ─────────────────────────────────────────────────────
        const isPartialProfile = !existingUser?.student?.profileComplete
        const pass = await prisma.fairStudentPass.create({
            data: {
                fairEventId,
                email,
                studentId: existingUser?.student?.id ?? null,
                isPartialProfile,
                parentToken: nanoid(21),
                // required non-null fields — fallback to empty string / 0
                fullName:
                    formData.fullName || existingUser?.student?.fullName || '',
                phone:
                    formData.phone || existingUser?.student?.phone || '',
                currentInstitution: formData.currentInstitution || '',
                currentCourse: formData.currentCourse || '',
                yearOfPassing: yearOfPassing ?? undefined,
                currentSemester: formData.currentSemester || null,
                englishExam: formData.englishExam || null,
                // optional fields
                fieldOfInterest:
                    formData.fieldOfInterest ||
                    existingUser?.student?.fieldOfInterest ||
                    null,
                budgetRange:
                    formData.budgetRange ||
                    existingUser?.student?.budgetRange ||
                    null,
                preferredCountries:
                    formData.preferredCountries ||
                    existingUser?.student?.preferredCountries ||
                    null,
                // consent flags
                whatsappConsent: formData.whatsappConsent ?? false,
                emailConsent: formData.emailConsent ?? true,
                marketingConsent: formData.marketingConsent ?? false,
            },
        })

        return { pass }
    } catch (error) {
        console.error('[createFairPass] Error:', error)
        return { error: 'Failed to create pass. Please try again.' }
    }
}
