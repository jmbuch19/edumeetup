'use server'


import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { sendEmail } from '@/lib/email'
import { EmailTemplates } from '@/lib/email-templates'
import { createSession, destroySession, requireUser, requireRole, hashPassword, comparePassword } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { generateOTP } from '@/lib/otp'
import { loginRateLimiter, registerRateLimiter, contactRateLimiter, supportRateLimiter, interestRateLimiter, inviteRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { registerStudentSchema, registerUniversitySchema, loginSchema, createProgramSchema, createMeetingSchema, supportTicketSchema, publicInquirySchema, studentProfileSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notifications'

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

export async function verifyUniversity(formData: FormData) {
    const universityId = formData.get('universityId') as string
    const action = formData.get('action') as string

    if (!universityId || !action) return { error: "Missing fields" }

    const user = await requireRole('ADMIN')

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

        // Notification (Email + In-App)
        await createNotification({
            userId: uniProfile.userId, // Notify the University User
            type: 'VERIFICATION_UPDATE',
            title: `University Verification: ${status}`,
            message: status === 'VERIFIED'
                ? "Congratulations! Your university profile has been verified. You can now publish programs and accept meetings."
                : "Your university verification was rejected. Please contact support for more details.",
            emailTo: uni.contactEmail || uniProfile.user.email,
            emailSubject: `University Verification Update: ${uni.verificationStatus}`,
            emailHtml: EmailTemplates.verificationStatus(
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

export async function submitPublicInquiry(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())

    // RATE LIMIT (IP Based)
    const ip = headers().get('x-forwarded-for') || 'unknown'
    if (!contactRateLimiter.check(ip)) {
        return { error: "Too many inquiries. Please try again later." }
    }

    const validation = publicInquirySchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { fullName, email, subject, message, role, country, phone, orgName } = validation.data

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
    const user = await requireUser()

    // RATE LIMIT
    if (!supportRateLimiter.check(user.id)) {
        return { error: "Too many support tickets. Please wait a moment." }
    }

    const rawData = Object.fromEntries(formData.entries())
    const validation = supportTicketSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { category, priority, message } = validation.data

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

        // 3. Notify User (Confirmation)
        await createNotification({
            userId: user.id,
            type: 'TICKET_CREATED',
            title: 'Support Ticket Received',
            message: `We received your ticket #${ticket.id.slice(-6)}: "${category}". Our team will review it shortly.`,
            payload: { ticketId: ticket.id }
        })

        return { success: true, ticketId: ticket.id }
    } catch (error) {
        console.error("Failed to create ticket:", error)
        return { error: "Failed to create ticket" }
    }
}

export async function createMeeting(formData: FormData) {
    const user = await requireUser()

    // RATE LIMIT
    if (!inviteRateLimiter.check(user.id)) {
        return { error: "You are sending too many meeting invites. Please slow down." }
    }

    const rawData = {
        title: formData.get('title'),
        startTime: formData.get('startTime'),
        duration: formData.get('duration'),
        type: formData.get('type'),
        joinUrl: formData.get('joinUrl'),
        participants: formData.getAll('participants'),
        availabilitySlotId: formData.get('availabilitySlotId') || undefined
    }

    const validation = createMeetingSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { title, startTime, duration, type, joinUrl, participants, availabilitySlotId } = validation.data

    try {
        if (user.role !== 'UNIVERSITY') return { error: "Unauthorized" }

        // Get university profile (DERIVED)
        const uniProfile = await prisma.universityProfile.findUnique({ where: { userId: user.id } })
        if (!uniProfile) return { error: "Profile not found" }

        const start = new Date(startTime)
        const end = new Date(start.getTime() + duration * 60000)

        // Create Meeting
        const meeting = await prisma.meeting.create({
            data: {
                title,
                startTime: start,
                endTime: end,
                meetingType: type,
                joinUrl,
                createdByUniversityId: uniProfile.id, // Derived
                participants: {
                    create: participants.map(uid => ({
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
            // DB & Email Notification
            await createNotification({
                userId: p.participantUserId,
                type: 'MEETING_INVITE',
                title: 'New Meeting Invitation',
                message: `You have been invited to: ${title} `,
                payload: { meetingId: meeting.id },
                emailTo: p.user.email,
                emailSubject: `Invitation: ${title} `,
                emailHtml: `<p>You have been invited to a meeting with ${uniProfile.institutionName}.</p>
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

        // Notify University
        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { university: { include: { user: true } } }
        })

        if (meeting?.university?.user) {
            const studentProfile = await prisma.studentProfile.findFirst({ where: { userId: user.id } })
            const studentName = studentProfile?.fullName || user.email

            await prisma.notification.create({
                data: {
                    userId: meeting.university.user.id,
                    type: 'MEETING_RSVP',
                    title: 'Meeting RSVP Update',
                    message: `${studentName} has responded: ${status} for "${meeting.title}"`,
                    payload: { meetingId, studentId: user.id, status }
                }
            })
        }

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

export async function cancelMeeting(meetingId: string) {
    try {
        const user = await requireUser()

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                university: { include: { user: true } },
                participants: { include: { user: true } },
                availabilitySlot: true
            }
        })

        if (!meeting) return { error: "Meeting not found" }
        if (meeting.university.user.id !== user.id) return { error: "Unauthorized" }

        // 1. Update Status
        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'CANCELED' }
        })

        // 2. Free up slot if exists
        if (meeting.availabilitySlot) {
            await prisma.availabilitySlot.update({
                where: { id: meeting.availabilitySlot.id },
                data: { isBooked: false }
            })
        }

        // 3. Notify Participants
        for (const p of meeting.participants) {
            if (p.participantUserId === user.id) continue

            // DB Notification
            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_CANCELED',
                    title: 'Meeting Canceled',
                    message: `The meeting "${meeting.title}" has been canceled by the university.`,
                    payload: { meetingId: meeting.id }
                }
            })

            // Email
            await sendEmail({
                to: p.user.email,
                subject: `Canceled: ${meeting.title}`,
                html: `<p>The meeting <strong>${meeting.title}</strong> scheduled for ${new Date(meeting.startTime).toLocaleString()} has been canceled.</p>`
            })
        }

        revalidatePath('/university/dashboard')
        revalidatePath('/student/dashboard')
        return { success: true }

    } catch (error) {
        console.error("Failed to cancel meeting:", error)
        return { error: "Failed to cancel meeting" }
    }
}

export async function updateMeeting(meetingId: string, formData: FormData) {
    try {
        const user = await requireUser()

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: { university: { include: { user: true } } }
        })

        if (!meeting) return { error: "Meeting not found" }
        if (meeting.university.user.id !== user.id) return { error: "Unauthorized" }

        const title = formData.get('title') as string
        const joinUrl = formData.get('joinUrl') as string
        const agenda = formData.get('agenda') as string

        // Simple update
        const updatedMeeting = await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                title,
                joinUrl,
                agenda
            },
            include: { participants: { include: { user: true } } }
        })

        // Notify
        for (const p of updatedMeeting.participants) {
            if (p.participantUserId === user.id) continue

            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_UPDATED',
                    title: 'Meeting Updated',
                    message: `Details for "${title}" have been updated.`,
                    payload: { meetingId: meeting.id }
                }
            })
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update meeting:", error)
        return { error: "Failed to update meeting" }
    }
}
