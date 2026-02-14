'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function registerStudent(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const country = formData.get('country') as string

    // Section A
    const currentStatus = formData.get('currentStatus') as string

    // Section B
    const fieldOfInterest = formData.get('fieldOfInterest') as string
    const preferredDegree = formData.get('preferredDegree') as string
    const budgetRange = formData.get('budgetRange') as string
    const englishTestType = formData.get('englishTestType') as string
    const englishScore = formData.get('englishScore') as string
    const preferredIntake = formData.get('preferredIntake') as string
    const preferredCountries = formData.get('preferredCountries') as string

    // Basic validation
    if (!email || !password || !fullName) {
        return { error: 'Missing required fields' }
    }

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        // Create User and StudentProfile
        await prisma.user.create({
            data: {
                email,
                password, // In real app, hash password!
                role: 'STUDENT',
                status: 'ACTIVE',
                studentProfile: {
                    create: {
                        fullName,
                        country,
                        currentStatus,
                        fieldOfInterest,
                        preferredDegree,
                        budgetRange,
                        englishTestType,
                        englishScore,
                        preferredIntake,
                        preferredCountries: preferredCountries || 'USA, UK, Canada',
                        profileComplete: true,
                    }
                }
            }
        })
    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }

    // Redirect to dashboard or login
    // For now, auto-login -> dashboard
    redirect('/student/dashboard')
}

export async function expressInterest(universityId: string, studentEmail: string) {
    // In a real app, we would get studentId from session
    // For MVP, we'll try to find the student by email or just hardcode/assume first student

    if (!studentEmail) return { error: "Not logged in" }

    try {
        const student = await prisma.studentProfile.findFirst({
            where: { user: { email: studentEmail } }
        })

        if (!student) return { error: "Student profile not found" }

        // Create Interest
        await prisma.interest.create({
            data: {
                studentId: student.id,
                universityId: universityId,
                status: 'INTERESTED',
                studentMessage: "I am interested in your programs."
            }
        })

        // TODO: Send Email Notification here
        console.log(`Email sent to university ${universityId} about student ${studentEmail}`)

        revalidatePath(`/universities/${universityId}`)
        revalidatePath('/student/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to express interest:", error)
        return { error: "Failed to express interest" }
    }
}

export async function registerUniversity(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const institutionName = formData.get('institutionName') as string
    const country = formData.get('country') as string
    const city = formData.get('city') as string
    const website = formData.get('website') as string
    const contactEmail = formData.get('contactEmail') as string

    // Basic validation
    if (!email || !password || !institutionName) {
        return { error: 'Missing required fields' }
    }

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        // Create User and UniversityProfile
        await prisma.user.create({
            data: {
                email,
                password, // In real app, hash password!
                role: 'UNIVERSITY',
                status: 'PENDING',
                universityProfile: {
                    create: {
                        institutionName,
                        country,
                        city,
                        website,
                        contactEmail,
                        verificationStatus: 'PENDING',
                        // logo would need file upload, skipping for MVP or using placeholder
                    }
                }
            }
        })

        console.log(`New university registered: ${institutionName}`)

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }

    redirect('/university/dashboard')
}

export async function createProgram(formData: FormData) {
    // Hidden field universityId (insecure but MVP)
    const universityId = formData.get('universityId') as string
    const programName = formData.get('programName') as string
    const degreeLevel = formData.get('degreeLevel') as string
    const fieldOfStudy = formData.get('fieldOfStudy') as string
    const tuitionFee = parseFloat(formData.get('tuitionFee') as string)
    const intakeDate = formData.get('intakeDate') as string

    if (!universityId || !programName) {
        return { error: "Missing fields" }
    }

    try {
        await prisma.program.create({
            data: {
                universityId,
                programName,
                degreeLevel,
                fieldOfStudy,
                tuitionFee,
                currency: 'USD',
                intakeDate,
                status: 'ACTIVE'
            }
        })
        revalidatePath('/university/dashboard')
    } catch (error) {
        console.error("Failed to create program:", error)
        return { error: "Failed to create program" }
    }
}

export async function verifyUniversity(formData: FormData) {
    const universityId = formData.get('universityId') as string
    const action = formData.get('action') as string // "approve" or "reject"

    if (!universityId || !action) return { error: "Missing fields" }

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'

    try {
        await prisma.universityProfile.update({
            where: { id: universityId },
            data: {
                verificationStatus: status,
                verifiedDate: status === 'VERIFIED' ? new Date() : null,
                user: {
                    update: {
                        status: status === 'VERIFIED' ? 'ACTIVE' : 'SUSPENDED'
                    }
                }
            }
        })

        // TODO: Send email notification
        console.log(`University ${universityId} verified status set to ${status}`)

        revalidatePath('/admin/dashboard')
    } catch (error) {
        console.error("Failed to verify university:", error)
        return { error: "Failed to verify" }
    }
}

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) return { error: "Missing fields" }

    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return { error: "User not found" }

        // In real app, check password hash
        if (user.password !== password) return { error: "Invalid password" }

        // Mock session / Redirect based on role
        if (user.role === 'STUDENT') redirect('/student/dashboard')
        if (user.role === 'UNIVERSITY') redirect('/university/dashboard')
        if (user.role === 'ADMIN') redirect('/admin/dashboard')

    } catch (error) {
        if ((error as Error).message === 'NEXT_REDIRECT') {
            throw error
        }
        console.error("Login failed:", error)
        return { error: "Login failed" }
    }
}

export async function registerUniversityWithPrograms(data: any) {
    const {
        email, password, institutionName, country, city, website,
        repName, repDesignation, contactPhone, accreditation, scholarshipsAvailable,
        programs
    } = data

    if (!email || !password || !institutionName) {
        return { error: 'Missing required fields' }
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        await prisma.user.create({
            data: {
                email,
                password, // Note: In production, hash this!
                role: 'UNIVERSITY',
                status: 'PENDING',
                universityProfile: {
                    create: {
                        institutionName,
                        country,
                        city,
                        website,
                        repName,
                        repDesignation,
                        repEmail: email, // Using login email as rep email for now
                        contactPhone,
                        accreditation,
                        scholarshipsAvailable,
                        verificationStatus: 'PENDING',
                        programs: {
                            create: programs.map((p: any) => ({
                                programName: p.programName,
                                degreeLevel: p.degreeLevel,
                                fieldCategory: p.fieldCategory,
                                stemDesignated: p.stemDesignated,
                                durationMonths: parseInt(p.durationMonths),
                                tuitionFee: parseFloat(p.tuitionFee),
                                currency: p.currency,
                                intakes: p.intakes.join(','),
                                englishTests: p.englishTests.join(','),
                                minEnglishScore: p.minEnglishScore ? parseFloat(p.minEnglishScore) : null,
                                status: 'ACTIVE'
                            }))
                        }
                    }
                }
            }
        })

        console.log(`New university registered with ${programs.length} programs: ${institutionName}`)

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed: ' + (error as Error).message }
    }

    redirect('/university/register/success')
}

export async function deleteProgram(programId: string) {
    try {
        await prisma.program.delete({
            where: { id: programId }
        })
        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to delete program:", error)
        return { error: "Failed to delete program" }
    }
}
