'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { createSession, destroySession, hashPassword, comparePassword } from '@/lib/auth'
import { generateOTP } from '@/lib/otp'
import { loginRateLimiter, registerRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { registerStudentSchema, registerUniversitySchema, loginSchema } from '@/lib/schemas'
import { FieldCategory } from '@prisma/client'

export interface ProgramData {
    programName: string
    degreeLevel: string
    fieldCategory: FieldCategory
    stemDesignated: boolean
    durationMonths: string
    tuitionFee: string
    currency: string
    intakes: string[]
    englishTests: string[]
    minEnglishScore?: string
}

export interface UniversityRegistrationData {
    email: string
    password: string
    institutionName: string
    country: string
    city: string
    website: string
    repName: string
    repDesignation: string
    contactPhone: string
    accreditation: string
    scholarshipsAvailable: boolean
    website_url?: string // Honeypot
    programs: ProgramData[]
    // Certification
    certAuthority: boolean
    certLegitimacy: boolean
    certPurpose: boolean
    certAccountability: boolean
}

export async function registerStudent(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = registerStudentSchema.safeParse({
        ...rawData,
    })

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const {
        email, password, fullName, gender, ageGroup,
        country, currentStatus, fieldOfInterest, preferredDegree,
        budgetRange, englishTestType, englishScore, preferredIntake,
        preferredCountries
    } = validation.data

    // HONEYPOT & SPAM CHECK (from schema)
    if (validation.data.website_url) {
        return { error: 'Spam detected' }
    }

    // RATE LIMIT (By IP)
    const ip = headers().get('x-forwarded-for') || 'unknown'
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many registration attempts. Please try again later.' }
    }

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        const otpCode = generateOTP()
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Create User and StudentProfile
        await prisma.user.create({
            data: {
                email,
                password: await hashPassword(password),
                role: 'STUDENT',
                status: 'ACTIVE',
                otpCode,
                otpExpiresAt,
                emailVerified: null,
                studentProfile: {
                    create: {
                        fullName,
                        gender,
                        ageGroup,
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
                        phoneNumber: formData.get('phoneNumber') as string,
                    }
                },
                phoneNumber: formData.get('phoneNumber') as string,
            }
        })

        // Send OTP Email
        await sendEmail({
            to: email,
            subject: 'Verify your EduMeetup Email',
            html: EmailTemplates.otpVerification(otpCode)
        })

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }

    // SET SESSION COOKIE
    await createSession(email, 'STUDENT')

    redirect(`/verify-email?email=${encodeURIComponent(email)}`)
}

export async function registerUniversity(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = registerUniversitySchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { email, password, institutionName, country, website, contactEmail } = validation.data

    if (validation.data.website_url) return { error: 'Spam detected' }

    const ip = headers().get('x-forwarded-for') || 'unknown'
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many attempts. Please wait.' }
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        await prisma.user.create({
            data: {
                email,
                password: await hashPassword(password),
                role: 'UNIVERSITY',
                status: 'PENDING',
                universityProfile: {
                    create: {
                        institutionName,
                        country,
                        city: '',
                        website,
                        contactEmail,
                        verificationStatus: 'PENDING',
                    }
                }
            }
        })

        console.log(`New university registered: ${institutionName}`)

        await createSession(email, 'UNIVERSITY')

        if (process.env.INFO_EMAIL) {
            await sendEmail({
                to: process.env.INFO_EMAIL,
                subject: "New University Registration",
                html: EmailTemplates.adminNewUniversity(institutionName, contactEmail || email)
            })
        }

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }

    redirect('/university/dashboard')
}

export async function login(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = loginSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: "Missing fields" }
    }

    const { email, password } = validation.data

    const ip = headers().get('x-forwarded-for') || 'unknown'
    const limitKey = `${ip}:${email}`
    if (!loginRateLimiter.check(limitKey)) {
        return { error: 'Too many login attempts. Please try again in a minute.' }
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return { error: "Invalid email or password" }

        const isValid = await comparePassword(password, user.password)

        if (!isValid) {
            return { error: 'Invalid email or password' }
        }

        await createSession(email, user.role)

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

export async function logout() {
    await destroySession()
    redirect('/')
}

export async function registerUniversityWithPrograms(data: UniversityRegistrationData) {
    const {
        email, password, institutionName, country, city, website,
        repName, repDesignation, contactPhone, accreditation, scholarshipsAvailable,
        programs,
        certAuthority, certLegitimacy, certPurpose, certAccountability
    } = data

    if (!email || !password || !institutionName) {
        return { error: 'Missing required fields' }
    }

    // HONEYPOT
    if (data.website_url) return { error: 'Spam detected' }

    // RATE LIMIT
    const ip = headers().get('x-forwarded-for') || 'unknown'
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many attempts. Please verify you are human.' }
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return { error: 'User already exists' }
        }

        await prisma.user.create({
            data: {
                email,
                password: await hashPassword(password),
                role: 'UNIVERSITY',
                status: 'PENDING',
                phoneNumber: contactPhone,
                universityProfile: {
                    create: {
                        institutionName,
                        country,
                        city,
                        website,
                        repName,
                        repDesignation,
                        repEmail: email,
                        contactPhone,
                        phoneNumber: contactPhone,
                        accreditation,
                        scholarshipsAvailable,
                        // Certification
                        certAuthority,
                        certLegitimacy,
                        certPurpose,
                        certAccountability,
                        certIp: ip,
                        certTimestamp: new Date(),
                        verificationStatus: 'PENDING',
                        programs: {
                            create: programs.map((p: ProgramData) => ({
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

export async function verifyEmail(email: string, otp: string) {
    if (!email || !otp) return { error: 'Missing fields' }

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) return { error: 'User not found' }
        if (user.otpCode !== otp) return { error: 'Invalid OTP' }
        if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) return { error: 'OTP Expired' }

        // Verify User
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                otpCode: null,
                otpExpiresAt: null,
                status: 'ACTIVE'
            }
        })

        // Create Session
        await createSession(email, 'STUDENT')

        return { success: true }

    } catch (error) {
        console.error('Verification failed:', error)
        return { error: 'Verification failed' }
    }
}
