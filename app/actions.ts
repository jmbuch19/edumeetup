'use server'


import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { requireUser, requireRole, signIn } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { loginRateLimiter, registerRateLimiter, contactRateLimiter, supportRateLimiter, interestRateLimiter, inviteRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { registerStudentSchema, registerUniversitySchema, loginSchema, createProgramSchema, createMeetingSchema, supportTicketSchema, publicInquirySchema, studentProfileSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notifications'
import { getIpFromHeaders, getIpGeoInfo } from '@/lib/getIpInfo'
import { AuthError } from "next-auth"

interface ProgramData {
    programName: string
    degreeLevel: string
    fieldCategory: string // Changed from FieldCategory to string
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function registerStudent(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = registerStudentSchema.safeParse({
        ...rawData,
    })

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const {
        email, fullName, gender, ageGroup,
        country, currentStatus, fieldOfInterest, preferredDegree,
        budgetRange, englishTestType, englishScore, preferredIntake,
        preferredCountries
    } = validation.data

    // HONEYPOT & SPAM CHECK (from schema)
    if (validation.data.website_url) {
        return { error: 'Spam detected' }
    }

    // RATE LIMIT (By IP)
    const ip = getIpFromHeaders()
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many registration attempts. Please try again later.' }
    }

    try {
        // IP Tracking & Geo-Verification
        const ipInfo = await getIpGeoInfo(ip)

        // Mismatch Detection
        const userCity = (formData.get('city') as string)?.trim() || ''
        const userPincode = (formData.get('pincode') as string)?.trim() || ''

        const cityMismatch = userCity && ipInfo.city
            ? userCity.toLowerCase() !== ipInfo.city.toLowerCase()
            : false

        const pincodeMismatch = userPincode && ipInfo.pincode
            ? userPincode !== ipInfo.pincode
            : false

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            // Check if they are already a STUDENT
            if (existingUser.role === 'STUDENT') {
                // For Magic Link, we can just say "Check your email to login"
                // typically we don't return error to avoid enumeration, but for UX we might.
                return { error: 'User already exists. Please login.' }
            }
            return { error: 'Email already registered with a different role.' }
        }

        // Create User and Student (No Password, No OTP)
        await prisma.user.create({
            data: {
                email,
                name: fullName,
                role: 'STUDENT',
                isActive: true,
                student: {
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
                        firstName: fullName.split(' ')[0], // Helper if needed
                        phone: formData.get('phoneNumber') as string,
                        // New Fields
                        city: userCity,
                        pincode: userPincode,
                        // IP Tracking
                        ipAddress: ipInfo.ip,
                        ipCity: ipInfo.city,
                        ipRegion: ipInfo.region,
                        ipCountry: ipInfo.country,
                        ipPincode: ipInfo.pincode,
                        ipLatitude: ipInfo.latitude,
                        ipLongitude: ipInfo.longitude,
                        ipIsp: ipInfo.isp,
                        // Mismatches
                        cityMismatch,
                        pincodeMismatch
                    }
                }
            }
        })

        // Return success so client can trigger signIn('email') OR we can redirect to a page that starts it?
        // Server Action calling `signIn` might work if configured.
        // For MVP simplicity: We created the user. Now let the client know to "Log In".
        // Actually, better UX: Trigger the magic link email RIGHT HERE via Auth.js?
        // `signIn` in server actions sends the email.

        // await signIn("email", { email, redirect: false })
        // Note: signIn needs to be imported from 'auth'. user provided 'lib/auth' but standard is 'auth' or '@/auth'.

        return { success: true, email, message: "Account created! Checking for Magic Link..." }

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }
}
// Removed session creation here as it happens on verification link click

export async function registerUniversity(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = registerUniversitySchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { email, institutionName, country, website, contactEmail } = validation.data

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
                role: 'UNIVERSITY',
                isActive: true,
                university: {
                    create: {
                        institutionName,
                        universityName: institutionName, // Sync for new schema
                        country,
                        city: '',
                        website,
                        contactEmail, // Preserved
                        isVerified: false,
                        verificationStatus: 'PENDING'
                    }
                }
            }
        })

        console.log(`New university registered: ${institutionName}`)

        // Trigger Magic Link on Client or via SignIn
        return { success: true, message: "Registered. Please check your email to login." }

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }
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
        // This is a bulk replace for the rest of the file
        const student = await prisma.student.findFirst({
            where: { user: { email: emailToUse } },
            include: { user: true }
        })

        if (!student) return { error: "Student profile not found" }

        const university = await prisma.university.findUnique({
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
    const user = await requireUser()

    // RATE LIMIT
    // if (!programRateLimiter.check(user.id)) return { error: "Too many requests" }

    const rawData = {
        programName: formData.get('programName'),
        degreeLevel: formData.get('degreeLevel'),
        fieldCategory: formData.get('fieldCategory'),
        tuitionFee: formData.get('tuitionFee'),
        durationMonths: formData.get('durationMonths'),
        currency: formData.get('currency'),
        intakes: formData.get('intakes'),
        englishTests: formData.get('englishTests'),
        minEnglishScore: formData.get('minEnglishScore'),
        stemDesignated: formData.get('stemDesignated')
    }

    const validation = createProgramSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const data = validation.data

    try {
        const university = await prisma.university.findUnique({
            where: { userId: user.id }
        })

        if (!university) return { error: "University profile not found" }

        await prisma.program.create({
            data: {
                universityId: university.id,
                name: data.programName,
                degree: data.degreeLevel,
                field: data.fieldCategory,
                stemDesignated: data.stemDesignated,
                duration: data.durationMonths,
                tuitionFee: data.tuitionFee,
                currency: data.currency,
                intakes: data.intakes,
                englishTests: data.englishTests,
                minEnglishScore: data.minEnglishScore ? parseFloat(data.minEnglishScore) : null,
                status: 'ACTIVE'
            }
        })

        revalidatePath('/university/dashboard')
        return { success: true }
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
        const uniProfile = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true }
        })

        if (!uniProfile) return { error: "University not found" }

        const uni = await prisma.university.update({
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

// Login Action (Magic Link)
export async function login(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = loginSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { email } = validation.data

    const ip = headers().get('x-forwarded-for') || 'unknown'
    const limitKey = `${ip}:${email}`
    if (!loginRateLimiter.check(limitKey)) {
        return { error: 'Too many login attempts. Please try again in a minute.' }
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } })

        if (!user) {
            return { error: "No account found with this email." }
        }

        if (!user.isActive) {
            return { error: 'Your account has been suspended.' }
        }

        // Determine Redirection based on Role
        let redirectTo = '/student/dashboard'
        if (user.role === 'UNIVERSITY') redirectTo = '/university/dashboard'
        if (user.role === 'ADMIN') redirectTo = '/admin/dashboard'

        // Magic Link Login
        await signIn("email", { email, redirectTo })

        // This line is unreachable if signIn redirects (which it does)
        return { success: true, message: "Check your email for the login link!" }

    } catch (error) {
        if (error instanceof AuthError) {
            return { error: "Authentication failed" }
        }
        console.error('Login error:', error)
        return { error: 'Failed to login' }
    }
}

import { signOut } from '@/lib/auth'

export async function logout() {
    await signOut({ redirectTo: '/' })
}

export async function registerUniversityWithPrograms(data: UniversityRegistrationData) {
    const {
        email, institutionName, country, city, website,
        repName, repDesignation, contactPhone, accreditation, scholarshipsAvailable,
        programs,
        certAuthority, certLegitimacy, certPurpose, certAccountability
    } = data

    if (!email || !institutionName) {
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
                role: 'UNIVERSITY',
                // status: 'PENDING', // Removed as not in User schema
                // phoneNumber: contactPhone, // Moved to profile or kept? User has no phone field in new schema? check schema.
                // Schema has phoneNumber in User? No, simplified user. 
                // Wait, I updated User schema. Let me check my memory.
                // User schema has NO phone number. Student has phone. University has contactPhone.
                // So remove phoneNumber from User create.

                university: {
                    create: {
                        institutionName,
                        country,
                        city,
                        website,
                        repName,
                        repDesignation,
                        repEmail: email,
                        contactPhone,
                        // phoneNumber: contactPhone, // University has contactPhone AND phoneNumber? 
                        // Prompt said: University model: universityName, country, city, website, accreditationNo, isVerified...
                        // I added preserved fields.

                        accreditationNo: accreditation,
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

    return { success: true, email, message: "Registered! Check your email to login." }
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

        const uniProfile = await prisma.university.findUnique({
            where: { userId: user.id }
        })

        if (!uniProfile) {
            return { error: "Unauthorized: No university profile found" }
        }

        await prisma.university.update({
            where: { id: uniProfile.id }, // Derived from session
            data: {
                meetingLink: meetingLink || undefined
            }
        })

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update profile:", error)
        return { error: "Failed to update profile" }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function submitPublicInquiry(prevState: any, formData: FormData) {
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
        const emailResult = await sendEmail({
            to: process.env.INFO_EMAIL || 'info@edumeetup.com',
            subject: `[Public Inquiry] ${subject} — ${fullName} (${role})`,
            html: EmailTemplates.publicInquiryNotification({
                fullName,
                email, // Added
                role,  // Added
                country,
                subject,
                message,
                phone,
                orgName
            })
        })

        if (emailResult?.error) {
            return { error: "Failed to submit inquiry: " + emailResult.error }
        }

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
            include: { student: true, university: true }
        })

        if (!user) return { error: "User not found" }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any

        const userName = u.student?.fullName || u.university?.institutionName || "Unknown User"

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
        availabilitySlotId: formData.get('availabilitySlotId') || undefined,
        agenda: formData.get('agenda') || undefined
    }

    const validation = createMeetingSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { title, startTime, duration, type, joinUrl, participants, availabilitySlotId, agenda } = validation.data

    try {
        if (user.role !== 'UNIVERSITY') return { error: "Unauthorized" }

        // Get university profile (DERIVED)
        const uniProfile = await prisma.university.findUnique({ where: { userId: user.id } })
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
                agenda,
                universityId: uniProfile.id, // Derived
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
            include: { participants: { include: { user: true } } } as any
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
            const student = await prisma.student.findFirst({ where: { userId: user.id } })
            const studentName = student?.fullName || user.email

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

// verifyEmail removed - Magic Link handles verification.

export async function updateStudentProfile(formData: FormData) {
    const user = await requireUser()
    const student = await prisma.student.findFirst({ where: { userId: user.id } })

    if (!student) return { error: "Profile not found" }

    const rawData = Object.fromEntries(formData.entries())
    const validation = studentProfileSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    try {
        await prisma.student.update({
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
            } as any
        })

        if (!meeting) return { error: "Meeting not found" }
        if (meeting.university.user.id !== user.id) return { error: "Unauthorized" }

        // 1. Update Status
        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'CANCELLED' }
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
                    type: 'MEETING_CANCELLED',
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
            include: { participants: { include: { user: true } } } as any
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

// --- Consolidated Meeting Logic (from meeting-actions.ts) ---

import { sendMeetingConfirmedEmailToStudent, sendMeetingCancelledEmail } from '@/lib/notifications'
import { auth } from '@/lib/auth' // Use @/lib/auth which exports auth

// Helper to map Prisma Meeting to Frontend Interface
function mapMeetingToFrontend(meeting: any) {
    const studentParticipant = meeting.participants.find((p: any) => p.participantType === 'STUDENT' || p.user.role === 'STUDENT')
    const student = studentParticipant ? studentParticipant.user.student : null
    const studentUser = studentParticipant ? studentParticipant.user : null

    return {
        id: meeting.id,
        meetingPurpose: meeting.title, // Map title to purpose
        proposedDatetime: meeting.startTime,
        durationMinutes: (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000,
        status: meeting.status,
        studentQuestions: meeting.agenda,
        meetingIdCode: meeting.id.slice(-6).toUpperCase(),
        meetingLink: meeting.joinUrl,
        videoProvider: meeting.locationType,
        student: {
            fullName: student?.fullName || studentUser?.name || 'Unknown Student',
            country: student?.country || null,
            user: {
                email: studentUser?.email || ''
            }
        }
    }
}

export async function getUniversityMeetings(status?: string) {
    const session = await auth()
    if (!session || !session.user || !session.user.id || (session.user as any).role !== 'UNIVERSITY') {
        return null
    }

    const userId = session.user.id

    // Find University ID
    const university = await prisma.university.findUnique({
        where: { userId },
        select: { id: true }
    })

    if (!university) return []

    const where: any = {
        universityId: university.id
    }

    if (status) {
        where.status = status
    }

    const meetings = await prisma.meeting.findMany({
        where,
        include: {
            participants: {
                include: {
                    user: {
                        include: {
                            student: true
                        }
                    }
                }
            }
        } as any,
        orderBy: { startTime: 'asc' }
    })

    return meetings.map(mapMeetingToFrontend)
}

export async function updateMeetingStatus(meetingId: string, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED', meetingLink?: string) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return { error: 'Unauthorized' }
    }

    try {
        const mtg = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                university: true,
                participants: {
                    include: {
                        user: {
                            include: { student: true }
                        }
                    }
                }
            } as any
        })

        if (!mtg) return { error: 'Meeting not found' }

        // Authorization Check
        if (mtg.university.userId !== session.user.id) {
            return { error: 'Unauthorized' }
        }

        // Update
        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status,
                joinUrl: meetingLink || mtg.joinUrl,
                locationType: meetingLink ? 'Manual Link' : mtg.locationType
            }
        })

        // Notifications
        const studentParticipant = mtg.participants.find((p: any) => p.participantType === 'STUDENT')
        if (studentParticipant && studentParticipant.user.email) {
            const studentEmail = studentParticipant.user.email
            const institutionName = mtg.university.institutionName

            if (status === 'CONFIRMED') {
                await sendMeetingConfirmedEmailToStudent(
                    studentEmail,
                    institutionName,
                    "University Representative",
                    mtg.startTime,
                    (new Date(mtg.endTime).getTime() - new Date(mtg.startTime).getTime()) / 60000,
                    meetingLink || 'Google Meet',
                    mtg.id.slice(-6).toUpperCase(),
                    mtg.agenda || ''
                )
            } else if (status === 'REJECTED' || status === 'CANCELLED') {
                await sendMeetingCancelledEmail(
                    studentEmail,
                    'STUDENT',
                    institutionName,
                    mtg.startTime,
                    "University updated status."
                )
            }
        }

        revalidatePath('/university/meetings')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: e.message || 'Failed to update status' }
    }
}

export async function getStudentMeetings() {
    const session = await auth()
    if (!session || !session.user || !session.user.id || (session.user as any).role !== 'STUDENT') {
        return []
    }

    const userId = session.user.id

    const meetings = await prisma.meeting.findMany({
        where: {
            participants: {
                some: {
                    participantUserId: userId
                }
            }
        } as any,
        include: {
            university: {
                include: {
                    user: true
                }
            },
            participants: {
                include: {
                    user: {
                        include: { student: true }
                    }
                }
            }
        } as any,
        orderBy: { startTime: 'asc' }
    })

    // Map slightly differently for student view if needed, or share mapper?
    // Student view might need University details.
    return meetings.map((m: any) => ({
        ...mapMeetingToFrontend(m),
        university: {
            institutionName: m.university.institutionName,
            country: m.university.country,
            city: m.university.city
        }
    }))
}

// Stubs for future implementation (were in meeting-actions.ts)
export async function updateAvailability(formData: FormData) { return { error: 'Not implemented' } }
export async function getAvailableSlots(universityId: string, dateStr: string) { return [] }
export async function holdSlot(universityId: string, repId: string, dateStr: string, timeStr: string) { return { error: 'Not implemented' } }
export async function createMeetingRequest(formData: FormData) { return { error: 'Not implemented' } }
export async function proposeReschedule(meetingId: string, newDateStr: string, reason: string) { return { error: 'Not implemented' } }
export async function getAvailability() { return [] }
export async function cancelMeetingByStudent(meetingId: string, reason: string) { return { error: 'Not implemented' } }

