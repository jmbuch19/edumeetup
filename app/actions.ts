'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendEmail, EmailTemplates } from '@/lib/email'
import { createSession, getSession, destroySession, requireUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function registerStudent(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string
    const country = formData.get('country') as string
    const gender = formData.get('gender') as string
    const ageGroup = formData.get('ageGroup') as string
    const currentStatus = formData.get('currentStatus') as string
    const fieldOfInterest = formData.get('fieldOfInterest') as string
    const preferredDegree = formData.get('preferredDegree') as string
    const budgetRange = formData.get('budgetRange') as string
    const englishTestType = formData.get('englishTestType') as string
    const englishScore = formData.get('englishScore') as string
    const preferredIntake = formData.get('preferredIntake') as string
    const preferredCountries = formData.get('preferredCountries') as string

    // Basic validation
    if (!email || !password || !fullName || !gender || !ageGroup) {
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
                    }
                }
            }
        })

        // SET SESSION COOKIE
        // SET SESSION COOKIE
        await createSession(email)

    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Registration failed' }
    }

    redirect('/student/register/success')
}

export async function expressInterest(universityId: string, studentEmail?: string, programId?: string) {
    // Get session
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

        // Create Interest
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

        // SEND EMAIL (Simulation)
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

        // SET SESSION COOKIE
        await createSession(email)

        // Notify Admin
        if (process.env.INFO_EMAIL) {
            await sendEmail({
                to: process.env.INFO_EMAIL,
                subject: "New University Registration",
                html: EmailTemplates.adminNewUniversity(institutionName, contactEmail)
            })
        }

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
    const fieldCategory = formData.get('fieldCategory') as string
    const tuitionFee = parseFloat(formData.get('tuitionFee') as string)
    const intakes = formData.get('intakes') as string

    if (!universityId || !programName) {
        return { error: "Missing fields" }
    }

    try {
        const user = await requireUser()

        // Security Check: Verify user owns this university profile
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
                fieldCategory: fieldCategory as any, // Simple cast for MVP
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
    const action = formData.get('action') as string // "approve" or "reject"

    if (!universityId || !action) return { error: "Missing fields" }

    // SECURITY: Admin only
    const user = await getSession()
    if (!user || user.role !== 'ADMIN') {
        return { error: "Unauthorized" }
    }

    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED'

    try {
        // First get the user ID
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

        // SEND EMAIL (Simulation)
        await sendEmail({
            to: uni.contactEmail || uniProfile.user.email,
            subject: `University Verification Update: ${uni.verificationStatus}`,
            html: EmailTemplates.verificationStatus(
                uni.verificationStatus as 'VERIFIED' | 'REJECTED',
                uni.institutionName
            )
        })

        console.log(`University ${universityId} verified status set to ${status}`)

        // Audit Log
        if (user) {
            await logAudit({
                action: status === 'VERIFIED' ? 'VERIFY_UNIVERSITY' : 'REJECT_UNIVERSITY',
                entityType: 'UNIVERSITY',
                entityId: universityId,
                actorId: user.id,
                metadata: { status }
            })
        }

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

        if (user.password !== password) return { error: "Invalid password" }

        // SET SESSION COOKIE
        // SET SESSION COOKIE
        await createSession(email)

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
        const user = await requireUser()

        // Security Check: Verify program belongs to user's university
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

        // Audit Log
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

        // Security Check
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

        // Audit Log
        await logAudit({
            action: 'UPDATE_UNIVERSITY_PROFILE',
            entityType: 'UNIVERSITY',
            entityId: universityId,
            actorId: user.id
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
    const role = formData.get('role') as string
    const country = formData.get('country') as string
    const subject = formData.get('subject') as string
    const message = formData.get('message') as string
    const phone = formData.get('phone') as string
    const orgName = formData.get('orgName') as string

    if (!fullName || !email || !role || !message) {
        return { error: 'Missing required fields' }
    }

    try {
        // 1. Save to Database
        const inquiry = await prisma.publicInquiry.create({
            data: {
                fullName,
                email,
                role,
                country,
                subject,
                message,
                phone: phone || null,
                orgName: orgName || null,
                status: 'NEW'
            }
        })

        // 2. Email to INFO (Notification)
        await sendEmail({
            to: process.env.INFO_EMAIL || 'info@edumeetup.com',
            subject: `[Public Inquiry] ${subject} — ${fullName} (${role})`,
            html: EmailTemplates.publicInquiryNotification(inquiry)
        })

        // 3. Auto-reply to Sender
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
            subject: `[Support Ticket #${ticket.id.slice(-6)}] ${category} — ${userName}`,
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
        // In real app, use a queue. For MVP, await.
        for (const p of meeting.participants) {
            // DB Notification
            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_INVITE',
                    title: 'New Meeting Invitation',
                    message: `You have been invited to: ${title}`,
                    payload: { meetingId: meeting.id }
                }
            })

            // Email Notification
            await sendEmail({
                to: p.user.email,
                subject: `Invitation: ${title}`,
                html: `<p>You have been invited to a meeting with ${uniProfile.institutionName}.</p>
                       <p><strong>Topic:</strong> ${title}</p>
                       <p><strong>Time:</strong> ${start.toLocaleString()}</p>
                       <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/student/dashboard?tab=meetings">View Details & RSVP</a></p>`
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
        // We find by meetingId + userId to be secure
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

// Notification Actions
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
