'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type AlumniStatus = 'STUDENT_CURRENTLY' | 'OPT_CPT' | 'H1B_OTHER' | 'FURTHER_STUDIES' | 'OTHER'

// ── Auth helpers ────────────────────────────────────────────────────────────

async function getAuthUser() {
    const session = await auth()
    if (!session?.user?.id) return null
    return session.user
}

async function getStudentFromSession() {
    const user = await getAuthUser()
    if (!user) return null
    const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true }
    })
    return student
}

// ── Action 1: registerAlumni ────────────────────────────────────────────────
export async function registerAlumni(data: {
    whatsapp?: string
    yearWentToUSA?: number
    usUniversityName: string
    usProgram: string
    usDegreeLevel?: string
    usCity?: string
    alumniStatus: AlumniStatus
    availableFor: string[]
    helpTopics: string[]
    weeklyCapacity?: number
    availabilityNote?: string
    linkedinUrl?: string
    inspirationMessage?: string
    consentDataSharing: boolean
    showWhatsapp: boolean
    showLinkedin: boolean
    showUsCity: boolean
    inviteToken?: string
}) {
    const user = await getAuthUser()
    if (!user?.id) return { error: 'Please sign in first' }

    const existing = await prisma.alumni.findUnique({ where: { userId: user.id } })
    if (existing) return { error: 'You already have an alumni profile' }

    if (!data.usUniversityName?.trim()) return { error: 'University name is required' }
    if (!data.usProgram?.trim()) return { error: 'Degree program is required' }
    if (!data.consentDataSharing) return { error: 'Data sharing consent is required to appear in discovery' }

    // Try to match to a partner university
    let usUniversityId: string | null = null
    const matched = await prisma.university.findFirst({
        where: {
            institutionName: { contains: data.usUniversityName.trim(), mode: 'insensitive' },
            verificationStatus: 'VERIFIED'
        },
        select: { id: true }
    })
    usUniversityId = matched?.id ?? null

    const alumni = await prisma.alumni.create({
        data: {
            userId: user.id,
            whatsapp: data.whatsapp?.trim() || null,
            yearWentToUSA: data.yearWentToUSA || null,
            usUniversityName: data.usUniversityName.trim(),
            usUniversityId,
            usProgram: data.usProgram.trim(),
            usDegreeLevel: data.usDegreeLevel || null,
            usCity: data.usCity?.trim() || null,
            alumniStatus: data.alumniStatus,
            availableFor: data.availableFor,
            helpTopics: data.helpTopics,
            weeklyCapacity: data.weeklyCapacity || null,
            availabilityNote: data.availabilityNote?.trim() || null,
            linkedinUrl: data.linkedinUrl?.trim() || null,
            inspirationMessage: data.inspirationMessage?.trim() || null,
            consentDataSharing: data.consentDataSharing,
            showWhatsapp: data.showWhatsapp,
            showLinkedin: data.showLinkedin,
            showUsCity: data.showUsCity,
            consentSignedAt: new Date(),
            isVerified: true,
            adminReviewStatus: 'PENDING_REVIEW',
        }
    })

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'ALUMNI' }
    })

    if (data.inviteToken) {
        await prisma.alumniInvitation.updateMany({
            where: { token: data.inviteToken, status: 'PENDING' },
            data: { status: 'REGISTERED', alumniId: alumni.id }
        })
    }

    revalidatePath('/alumni/dashboard')
    return { success: true, alumniId: alumni.id }
}

// ── Action 2: updateAlumniProfile ───────────────────────────────────────────
export async function updateAlumniProfile(data: {
    whatsapp?: string
    usCity?: string
    alumniStatus?: AlumniStatus
    availableFor?: string[]
    helpTopics?: string[]
    weeklyCapacity?: number
    availabilityNote?: string
    linkedinUrl?: string
    inspirationMessage?: string
    showWhatsapp?: boolean
    showLinkedin?: boolean
    showUsCity?: boolean
}) {
    const user = await getAuthUser()
    if (!user?.id) return { error: 'Unauthorized' }

    const alumni = await prisma.alumni.findUnique({ where: { userId: user.id }, select: { id: true } })
    if (!alumni) return { error: 'Alumni profile not found' }

    await prisma.alumni.update({
        where: { id: alumni.id },
        data: {
            ...(data.whatsapp !== undefined && { whatsapp: data.whatsapp }),
            ...(data.usCity !== undefined && { usCity: data.usCity }),
            ...(data.alumniStatus !== undefined && { alumniStatus: data.alumniStatus }),
            ...(data.availableFor !== undefined && { availableFor: data.availableFor }),
            ...(data.helpTopics !== undefined && { helpTopics: data.helpTopics }),
            ...(data.weeklyCapacity !== undefined && { weeklyCapacity: data.weeklyCapacity }),
            ...(data.availabilityNote !== undefined && { availabilityNote: data.availabilityNote }),
            ...(data.linkedinUrl !== undefined && { linkedinUrl: data.linkedinUrl }),
            ...(data.inspirationMessage !== undefined && { inspirationMessage: data.inspirationMessage }),
            ...(data.showWhatsapp !== undefined && { showWhatsapp: data.showWhatsapp }),
            ...(data.showLinkedin !== undefined && { showLinkedin: data.showLinkedin }),
            ...(data.showUsCity !== undefined && { showUsCity: data.showUsCity }),
        }
    })

    revalidatePath('/alumni/dashboard')
    return { success: true }
}

// ── Action 3: listVerifiedAlumni ────────────────────────────────────────────
export async function listVerifiedAlumni(filters?: {
    universityName?: string
    helpTopic?: string
    alumniStatus?: string
    availableFor?: string
    page?: number
}) {
    const user = await getAuthUser()
    if (!user) return { error: 'Please sign in to browse alumni' }

    const page = filters?.page ?? 1
    const take = 12
    const skip = (page - 1) * take

    const where: Record<string, unknown> = {
        isVerified: true,
        consentDataSharing: true,
        adminReviewStatus: { not: 'SUSPENDED' },
    }
    if (filters?.universityName) {
        where.usUniversityName = { contains: filters.universityName, mode: 'insensitive' }
    }
    if (filters?.helpTopic) {
        where.helpTopics = { has: filters.helpTopic }
    }
    if (filters?.alumniStatus) {
        where.alumniStatus = filters.alumniStatus
    }
    if (filters?.availableFor) {
        where.availableFor = { has: filters.availableFor }
    }

    const [alumni, total] = await Promise.all([
        prisma.alumni.findMany({
            where: where as any,
            select: {
                id: true,
                usUniversityName: true,
                usUniversityId: true,
                usProgram: true,
                usDegreeLevel: true,
                usCity: true,
                alumniStatus: true,
                availableFor: true,
                helpTopics: true,
                inspirationMessage: true,
                linkedinUrl: true,
                weeklyCapacity: true,
                availabilityNote: true,
                showWhatsapp: true,
                showLinkedin: true,
                showUsCity: true,
                whatsapp: true,
                yearWentToUSA: true,
                profilePhotoUrl: true,
                createdAt: true,
                user: { select: { name: true, image: true } },
                universityPartner: { select: { id: true, logo: true, institutionName: true } },
                _count: { select: { connectRequests: { where: { status: 'PENDING' } } } }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        }),
        prisma.alumni.count({ where: where as any })
    ])

    const result = alumni.map(a => ({
        ...a,
        isAtCapacity: a.weeklyCapacity != null && a._count.connectRequests >= a.weeklyCapacity,
        whatsapp: a.showWhatsapp ? a.whatsapp : null,
        linkedinUrl: a.showLinkedin ? a.linkedinUrl : null,
        usCity: a.showUsCity ? a.usCity : null,
    }))

    return { alumni: result, total, page, totalPages: Math.ceil(total / take) }
}

// ── Action 4: requestAlumConnect ────────────────────────────────────────────
export async function requestAlumConnect(data: {
    alumniId: string
    type: 'EMAIL' | 'MEETING' | 'LINKEDIN'
    message: string
}) {
    const user = await getAuthUser()
    if (!user?.id) return { error: 'Please sign in' }
    if (user.role !== 'STUDENT') return { error: 'Only students can send connect requests' }

    const student = await getStudentFromSession()
    if (!student) return { error: 'Student profile not found' }

    if (!data.message?.trim()) return { error: 'Please write a message to the alumni' }
    if (data.message.length > 1000) return { error: 'Message is too long (max 1000 characters)' }

    // Rate limit: 3/day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.alumConnectRequest.count({
        where: { studentId: student.id, createdAt: { gte: oneDayAgo } }
    })
    if (recentCount >= 3) return { error: 'You can send up to 3 connect requests per day. Please try again tomorrow.' }

    // No duplicate pending request
    const existing = await prisma.alumConnectRequest.findFirst({
        where: { studentId: student.id, alumniId: data.alumniId, status: 'PENDING' }
    })
    if (existing) return { error: 'You already have a pending request with this alumni' }

    const alumni = await prisma.alumni.findUnique({
        where: { id: data.alumniId },
        select: {
            id: true, isVerified: true, adminReviewStatus: true, weeklyCapacity: true,
            _count: { select: { connectRequests: { where: { status: 'PENDING' } } } },
            user: { select: { id: true, name: true } }
        }
    })
    if (!alumni || !alumni.isVerified || alumni.adminReviewStatus === 'SUSPENDED') {
        return { error: 'This alumni is not available' }
    }
    if (alumni.weeklyCapacity != null && alumni._count.connectRequests >= alumni.weeklyCapacity) {
        return { error: 'This alumni has reached their weekly capacity. Please try again next week.' }
    }

    const request = await prisma.alumConnectRequest.create({
        data: {
            studentId: student.id,
            alumniId: data.alumniId,
            type: data.type,
            message: data.message.trim(),
        }
    })

    const studentUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } })
    await prisma.notification.create({
        data: {
            userId: alumni.user.id,
            type: 'ALUMNI_CONNECT_REQUEST',
            title: `New connect request from ${studentUser?.name ?? 'a student'}`,
            message: `A student wants to connect via ${data.type === 'EMAIL' ? 'email' : data.type === 'MEETING' ? 'video call' : 'LinkedIn'}. Check your dashboard to respond.`,
            payload: { requestId: request.id, type: data.type }
        }
    })

    return { success: true, requestId: request.id }
}

// ── Action 5: respondToConnectRequest ────────────────────────────────────────
export async function respondToConnectRequest(data: {
    requestId: string
    accept: boolean
    responseMessage?: string
}) {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ALUMNI') return { error: 'Unauthorized' }

    const alumni = await prisma.alumni.findUnique({ where: { userId: user.id }, select: { id: true } })
    if (!alumni) return { error: 'Alumni profile not found' }

    const request = await prisma.alumConnectRequest.findUnique({
        where: { id: data.requestId },
        select: { id: true, alumniId: true, studentId: true, type: true }
    })
    if (!request || request.alumniId !== alumni.id) return { error: 'Request not found' }

    await prisma.alumConnectRequest.update({
        where: { id: data.requestId },
        data: {
            status: data.accept ? 'ACCEPTED' : 'DECLINED',
            alumResponse: data.responseMessage?.trim() || null,
            respondedAt: new Date(),
        }
    })

    await prisma.studentNotification.create({
        data: {
            studentId: request.studentId,
            title: data.accept ? '🎉 Alumni accepted your connect request!' : 'Alumni connect request update',
            message: data.accept
                ? `The alumni has accepted your ${request.type === 'MEETING' ? 'video call' : request.type.toLowerCase()} request.${data.responseMessage ? ` Their note: "${data.responseMessage}"` : ''}`
                : `The alumni is unable to connect at this time.${data.responseMessage ? ` Their note: "${data.responseMessage}"` : ''}`,
            type: 'ALUMNI_CONNECT',
            actionUrl: '/student/dashboard',
        }
    })

    revalidatePath('/alumni/dashboard')
    return { success: true }
}

// ── Action 6: getMyAlumniDashboard ──────────────────────────────────────────
export async function getMyAlumniDashboard() {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ALUMNI') return null

    return prisma.alumni.findUnique({
        where: { userId: user.id },
        include: {
            connectRequests: {
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    student: {
                        include: { user: { select: { name: true, email: true, image: true } } }
                    }
                }
            }
        }
    })
}

// ── Action 7: sendAlumniInvite (University) ──────────────────────────────────
export async function sendAlumniInvite(data: { email: string; message?: string }) {
    const user = await getAuthUser()
    if (!user?.id) return { error: 'Unauthorized' }
    if (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP') {
        return { error: 'Only universities can invite alumni' }
    }

    const uni = await prisma.university.findFirst({
        where: { OR: [{ userId: user.id }, { reps: { some: { id: user.id } } }] },
        select: { id: true, institutionName: true }
    })
    if (!uni) return { error: 'University not found' }
    if (!data.email?.trim()) return { error: 'Email is required' }

    const existing = await prisma.alumniInvitation.findFirst({
        where: { universityId: uni.id, email: data.email.toLowerCase().trim(), status: 'PENDING' }
    })
    if (existing) return { error: 'An invite was already sent to this email' }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    const invite = await prisma.alumniInvitation.create({
        data: {
            universityId: uni.id,
            email: data.email.toLowerCase().trim(),
            invitedByRepId: user.id,
            message: data.message?.trim() || null,
            expiresAt,
        }
    })

    try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const registerUrl = `${process.env.NEXTAUTH_URL || 'https://edumeetup.com'}/alumni-register?token=${invite.token}`
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'EdUmeetup <noreply@edumeetup.com>',
            to: data.email,
            subject: `${uni.institutionName} invites you to join EdUmeetup as an Alumni Mentor`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#374151}.container{max-width:600px;margin:0 auto;padding:40px 20px}.logo{font-size:24px;font-weight:bold;margin-bottom:20px}.logo span{color:#3333CC}.badge{display:inline-block;background:linear-gradient(135deg,#D97706,#F59E0B);color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:20px}.btn{display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#D97706,#F59E0B);color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin:24px 0}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}</style>
</head><body><div class="container">
<div class="logo">Ed<span>U</span>meetup</div>
<div class="badge">🎓 IAES Alumni Bridge</div>
<h2>${uni.institutionName} invites you to give back!</h2>
<p>You've been invited to join <strong>EdUmeetup's Alumni Bridge</strong> — a platform where IAES alumni like you inspire and guide current students heading to the USA.</p>
${data.message ? `<blockquote style="border-left:3px solid #D97706;padding-left:16px;color:#4B5563;margin:20px 0"><em>"${data.message}"</em><br><small>— ${uni.institutionName}</small></blockquote>` : ''}
<p>It takes just a few minutes. Your story could change someone's life.</p>
<a href="${registerUrl}" class="btn" target="_blank">Join as Alumni Mentor 🌉</a>
<p style="font-size:13px;color:#9CA3AF">This invite expires in 30 days.</p>
<div class="footer"><p>&copy; ${new Date().getFullYear()} IAES (Indo American Education Society). EdUmeetup is an initiative by IAES.</p></div>
</div></body></html>`
        })
    } catch (e) {
        console.error('[AlumniInvite] Email send failed:', e)
    }

    return { success: true, inviteId: invite.id, token: invite.token }
}

// ── Admin actions ────────────────────────────────────────────────────────────
export async function adminApproveAlumni(alumniId: string, note?: string) {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return { error: 'Unauthorized' }
    await prisma.alumni.update({
        where: { id: alumniId },
        data: { adminReviewStatus: 'APPROVED', adminReviewedAt: new Date(), adminReviewNote: note || null }
    })
    revalidatePath('/admin/alumni')
    return { success: true }
}

export async function adminSuspendAlumni(alumniId: string, reason: string) {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return { error: 'Unauthorized' }
    await prisma.alumni.update({
        where: { id: alumniId },
        data: { adminReviewStatus: 'SUSPENDED', isVerified: false, adminReviewedAt: new Date(), adminReviewNote: reason }
    })
    revalidatePath('/admin/alumni')
    return { success: true }
}

export async function adminNudgeAlumni(alumniId: string) {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return { error: 'Unauthorized' }

    const alumni = await prisma.alumni.findUnique({
        where: { id: alumniId },
        include: { user: true }
    })
    if (!alumni || !alumni.user?.email) return { error: 'Alumni not found or has no email' }

    try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const dashboardUrl = `${process.env.NEXTAUTH_URL || 'https://edumeetup.com'}/login`
        
        await resend.emails.send({
            from: process.env.EMAIL_FROM || 'EdUmeetup <noreply@edumeetup.com>',
            to: alumni.user.email,
            subject: `Action Required: Please complete your EdUmeetup Alumni Profile`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#374151}.container{max-width:600px;margin:0 auto;padding:40px 20px}.logo{font-size:24px;font-weight:bold;margin-bottom:20px}.logo span{color:#3333CC}.btn{display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#D97706,#F59E0B);color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;margin:24px 0}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280}</style>
</head><body><div class="container">
<div class="logo">Ed<span>U</span>meetup</div>
<h2>Hi ${alumni.user.name || 'there'},</h2>
<p>We've noticed you registered as an Alumni on EdUmeetup, but there might be some missing details or we are waiting for you to complete your profile.</p>
<p>Current students heading to the USA are eager to connect with alumni like you for guidance! Please take a moment to log in, complete any necessary information, and ensure your profile is ready so we can verify and approve your account.</p>
<a href="${dashboardUrl}" class="btn" target="_blank">Log In to EdUmeetup</a>
<div class="footer"><p>&copy; ${new Date().getFullYear()} IAES (Indo American Education Society). EdUmeetup is an initiative by IAES.</p></div>
</div></body></html>`
        })
    } catch (e) {
        console.error('[AdminNudge] Email send failed:', e)
        return { error: 'Failed to send nudge email' }
    }

    return { success: true }
}

export async function adminGetAlumniStats() {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return null
    const [total, pendingReview, approved, suspended, connectRequests] = await Promise.all([
        prisma.alumni.count(),
        prisma.alumni.count({ where: { adminReviewStatus: 'PENDING_REVIEW' } }),
        prisma.alumni.count({ where: { adminReviewStatus: 'APPROVED' } }),
        prisma.alumni.count({ where: { adminReviewStatus: 'SUSPENDED' } }),
        prisma.alumConnectRequest.count(),
    ])
    return { total, pendingReview, approved, suspended, connectRequests }
}

export async function adminGetPendingAlumni() {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return []
    return prisma.alumni.findMany({
        where: { adminReviewStatus: 'PENDING_REVIEW' },
        include: { user: { select: { name: true, email: true, image: true } } },
        orderBy: { createdAt: 'asc' },
    })
}

export async function adminGetAllAlumni(filters?: { status?: string; search?: string }) {
    const user = await getAuthUser()
    if (!user?.id || user.role !== 'ADMIN') return []
    const where: Record<string, unknown> = {}
    if (filters?.status) where.adminReviewStatus = filters.status
    if (filters?.search) {
        where.OR = [
            { usUniversityName: { contains: filters.search, mode: 'insensitive' } },
            { user: { name: { contains: filters.search, mode: 'insensitive' } } },
            { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        ]
    }
    return prisma.alumni.findMany({
        where: where as any,
        include: {
            user: { select: { name: true, email: true, image: true } },
            _count: { select: { connectRequests: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    })
}
