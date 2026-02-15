'use server'


import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { createSession, getSession, destroySession, requireUser, hashPassword, comparePassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateOTP } from '@/lib/otp'
import { loginRateLimiter, registerRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { registerStudentSchema, registerUniversitySchema, loginSchema } from '@/lib/schemas'

interface ProgramData {
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

interface UniversityRegistrationData {
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

export async function expressInterest(universityId: string, studentEmail?: string, programId?: string) {
    const user = await getSession()
    const sessionEmail = user?.email

    if (!sessionEmail && !studentEmail) return { error: "Not logged in" }

    const emailToUse = sessionEmail || studentEmail

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

        await sendEmail({
            to: university.contactEmail || university.user.email,
            subject: `New Interest from ${student.fullName}`,
            html: EmailTemplates.universityInterest(
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

export async function createProgram(formData: FormData) {
    const universityId = formData.get('universityId') as string
    const programName = formData.get('programName') as string
    const degreeLevel = formData.get('degreeLevel') as string
    const fieldCategory = formData.get('fieldCategory') as string
    const tuitionFee = parseFloat(formData.get('tuitionFee') as string)
    const intakes = formData.get('intakes') as string

    if (!universityId || !programName) {
        return { error: "Missing fields" }
    }

    try {
        const user = await requireUser()

        const uniProfile = await prisma.universityProfile.findUnique({
            where: { userId: user.id }
        })

        if (!uniProfile || uniProfile.id !== universityId) {
            return { error: "Unauthorized: You do not own this profile" }
        }

        await prisma.program.create({
            data: {
                universityId,
                programName,
                degreeLevel,
                fieldCategory: fieldCategory as FieldCategory,
                tuitionFee,
                currency: 'USD',
                intakes,
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
    const action = formData.get('action') as string

    if (!universityId || !action) return { error: "Missing fields" }

    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
        return { error: "Unauthorized" }
    }

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'

    try {
        const uniProfile = await prisma.universityProfile.findUnique({
            where: { id: universityId },
            include: { user: true }
        })

        if (!uniProfile) return { error: "University not found" }

        const uni = await prisma.universityProfile.update({
            where: { id: universityId },
            data: {
                verificationStatus: status,
                verifiedDate: status === 'VERIFIED' ? new Date() : null,
                user: {
                    update: {
                        status: status === 'VERIFIED' ? 'ACTIVE' : 'SUSPENDED'
                    }
                }
            },
            include: { user: true }
        })

        await sendEmail({
            to: uni.contactEmail || uniProfile.user.email,
            subject: `University Verification Update: ${uni.verificationStatus}`,
            html: EmailTemplates.verificationStatus(
                uni.verificationStatus as 'VERIFIED' | 'REJECTED',
                uni.institutionName
            )
        })

        await logAudit({
            action: status === 'VERIFIED' ? 'VERIFY_UNIVERSITY' : 'REJECT_UNIVERSITY',
            entityType: 'UNIVERSITY',
            entityId: universityId,
            actorId: user.id,
            metadata: { status }
        })

        revalidatePath('/admin/dashboard')
    } catch (error) {
        console.error("Failed to verify university:", error)
        return { error: "Failed to verify" }
    }
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
        programs
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
    const universityId = formData.get('universityId') as string
    const meetingLink = formData.get('meetingLink') as string

    if (!universityId) return { error: "Missing university ID" }

    try {
        const user = await requireUser()

        const uniProfile = await prisma.universityProfile.findUnique({
            where: { id: universityId }
        })

        if (!uniProfile || uniProfile.userId !== user.id) {
            return { error: "Unauthorized" }
        }

        await prisma.universityProfile.update({
            where: { id: universityId },
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

export async function submitPublicInquiry(formData: FormData) {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string
    const role = formData.get('role') as string
    const country = formData.get('country') as string
    const phone = formData.get('phone') as string || undefined
    const orgName = formData.get('orgName') as string || undefined

    if (!fullName || !email || !message || !country) {
        return { error: 'Missing fields' }
    }

    try {
        // Send email to Admin
        await sendEmail({
            to: process.env.INFO_EMAIL || 'info@edumeetup.com',
            subject: `[Public Inquiry] ${subject} — ${fullName} (${role})`,
            html: EmailTemplates.publicInquiryNotification({
                fullName,
                email,
                role,
                country,
                subject,
                message,
                phone,
                orgName
            })
        })

        // Auto-reply
        await sendEmail({
            to: email,
            subject: `We received your inquiry: ${subject}`,
            html: EmailTemplates.publicInquiryAutoReply(fullName)
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to submit inquiry:", error)
        return { error: "Failed to submit inquiry" }
    }
}

export async function createSupportTicket(formData: FormData) {
    const category = formData.get('category') as string
    const priority = formData.get('priority') as "LOW" | "MEDIUM" | "HIGH"
    const message = formData.get('message') as string

    if (!category || !priority || !message) {
        return { error: 'Missing required fields' }
    }

    const user = await getSession()
    if (!user) return { error: "Not logged in" }

    const sessionEmail = user.email

    try {
        const user = await prisma.user.findUnique({
            where: { email: sessionEmail },
            include: { studentProfile: true, universityProfile: true }
        })

        if (!user) return { error: "User not found" }

        const userName = user.studentProfile?.fullName || user.universityProfile?.institutionName || "Unknown User"

        // 1. Save to Database
        const ticket = await prisma.supportTicket.create({
            data: {
                userId: user.id,
                type: user.role === 'STUDENT' ? 'STUDENT' : 'UNIVERSITY',
                category,
                priority,
                message,
                status: 'NEW'
            }
        })

        // 2. Email to SUPPORT (Notification)
        await sendEmail({
            to: process.env.SUPPORT_EMAIL || 'support@edumeetup.com',
            subject: `[Support Ticket #${ticket.id.slice(-6)}] ${category} — ${userName} `,
            html: EmailTemplates.supportTicketNotification(ticket, userName, user.email)
        })

        return { success: true, ticketId: ticket.id }
    } catch (error) {
        console.error("Failed to create ticket:", error)
        return { error: "Failed to create ticket" }
    }
}

export async function createMeeting(formData: FormData) {
    const title = formData.get('title') as string
    const startTime = formData.get('startTime') as string // ISO string
    const duration = parseInt(formData.get('duration') as string) || 60
    const type = formData.get('type') as string // ONE_TO_ONE, GROUP
    const joinUrl = formData.get('joinUrl') as string
    const participantIds = formData.getAll('participants') as string[] // Array of user IDs

    if (!title || !startTime || participantIds.length === 0) {
        return { error: "Missing required fields" }
    }

    try {
        const user = await requireUser()
        if (user.role !== 'UNIVERSITY') return { error: "Unauthorized" }

        // Get university profile
        const uniProfile = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
        if (!uniProfile) return { error: "Profile not found" }

        const start = new Date(startTime)
        const end = new Date(start.getTime() + duration * 60000)

        const availabilitySlotId = formData.get('availabilitySlotId') as string | null

        // Create Meeting
        const meeting = await prisma.meeting.create({
            data: {
                title,
                startTime: start,
                endTime: end,
                meetingType: type,
                joinUrl,
                createdByUniversityId: uniProfile.id,
                participants: {
                    create: participantIds.map(uid => ({
                        participantUserId: uid,
                        rsvpStatus: 'INVITED'
                    }))
                },
                // Link slot if provided
                availabilitySlot: availabilitySlotId ? {
                    connect: { id: availabilitySlotId }
                } : undefined
            },
            include: { participants: { include: { user: true } } }
        })

        // If slot used, mark as booked
        if (availabilitySlotId) {
            await prisma.availabilitySlot.update({
                where: { id: availabilitySlotId },
                data: { isBooked: true }
            })
        }

        // Send Notifications (Email + DB)
        for (const p of meeting.participants) {
            // DB Notification
            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_INVITE',
                    title: 'New Meeting Invitation',
                    message: `You have been invited to: ${title} `,
                    payload: { meetingId: meeting.id }
                }
            })

            // Email Notification
            await sendEmail({
                to: p.user.email,
                subject: `Invitation: ${title} `,
                html: `<p>You have been invited to a meeting with ${uniProfile.institutionName}.</p>
        <p><strong>Topic: </strong> ${title}</p>
            <p><strong>Time: </strong> ${start.toLocaleString()}</p>
                <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/student/dashboard?tab=meetings" > View Details & RSVP </a></p> `
            })
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to create meeting:", error)
        return { error: "Failed to create meeting" }
    }
}

export async function updateRSVP(formData: FormData) {
    const meetingId = formData.get('meetingId') as string
    const status = formData.get('status') as string

    try {
        const user = await requireUser()

        // Find participant record
        const participant = await prisma.meetingParticipant.findFirst({
            where: {
                meetingId,
                participantUserId: user.id
            }
        })

        if (!participant) return { error: "Participant not found" }

        await prisma.meetingParticipant.update({
            where: { id: participant.id },
            data: { rsvpStatus: status }
        })

        revalidatePath('/student/dashboard')
        return { success: true }

    } catch (error) {
        console.error("Failed to update RSVP:", error)
        return { error: "Failed to update RSVP" }
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const user = await requireUser()

    // Verify ownership
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    })

    if (!notification || notification.userId !== user.id) {
        return { error: "Unauthorized" }
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    })

    revalidatePath('/', 'layout') // Refresh UI
    return { success: true }
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
