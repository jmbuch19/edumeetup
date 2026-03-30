'use server'


import { redirect } from 'next/navigation'
import { verifyTurnstile } from '@/lib/turnstile'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendEmail, EmailTemplates, generateEmailHtml } from '@/lib/email'
import { requireUser, requireRole, signIn, isUniversityEmail } from '@/lib/auth'
import { sendMagicLink } from '@/lib/magic-link'
import { logAudit } from '@/lib/audit'
import { isDisposableEmail } from '@/lib/email-blocklist'
import { loginRateLimiter, registerRateLimiter, contactRateLimiter, supportRateLimiter, interestRateLimiter, inviteRateLimiter } from '@/lib/ratelimit'
import { headers } from 'next/headers'
import { registerStudentSchema, registerUniversitySchema, loginSchema, createProgramSchema, createMeetingSchema, supportTicketSchema, publicInquirySchema, studentProfileSchema, pdoRegistrationSchema, studentInteractionSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notifications'
import { notifyStudent, notifyUniversity } from '@/lib/notify'
import { getIpFromHeaders, getIpGeoInfo } from '@/lib/getIpInfo'
import { AuthError } from "next-auth"
import { Meeting, MeetingParticipant, User, MeetingStatus } from "@prisma/client"

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

    const turnstileCheck = await verifyTurnstile(rawData['cf-turnstile-response'] as string)
    if (!turnstileCheck.success) {
        return { error: turnstileCheck.error }
    }

    const validation = registerStudentSchema.safeParse({
        ...rawData,
    })

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const {
        email, fullName, gender, ageGroup,
        city, pincode, currentStatus, fieldOfInterest, preferredDegree,
        budgetRange, englishTestType, englishScore, preferredIntake,
        preferredCountries, greScore, gmatScore, satScore, actScore
    } = validation.data

    // HONEYPOT & SPAM CHECK (from schema)
    if (validation.data.website_url) {
        return { error: 'Spam detected' }
    }

    if (isDisposableEmail(email)) {
        return { 
            error: "Temporary or disposable email addresses are not accepted. Please use your official university or personal email." 
        }
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
        const cityMismatch = city && ipInfo.city
            ? city.toLowerCase() !== ipInfo.city.toLowerCase()
            : false

        const pincodeMismatch = pincode && ipInfo.pincode
            ? pincode !== ipInfo.pincode
            : false

        // Check if user exists
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            if (existingUser.role === 'STUDENT') {
                // B2 fix: don't reveal account exists — silently send magic link
                if (existingUser.isActive) {
                    await sendMagicLink(email, '/student/dashboard').catch(() => null)
                }
                return { success: true, email, message: "Account created! Check your email to login." }
            }
            // Different role — generic error, no role/email leakage
            return { error: 'Registration failed. Please contact support if you need help.' }
        }

        // Create User and Student (No Password, No OTP)
        const newUser = await prisma.user.create({
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
                        currentStatus,
                        fieldOfInterest,
                        preferredDegree,
                        budgetRange,
                        englishTestType,
                        englishScore,
                        preferredIntake,
                        preferredCountries: preferredCountries || 'USA, UK, Canada',
                        profileComplete: true,

                        phone: formData.get('phoneNumber') as string,
                        whatsappNumber: (formData.get('whatsappNumber') as string)?.trim() || null,
                        // Location (India-only)
                        country: 'India',
                        city: city || '',
                        pincode: pincode || '',
                        // GRE / GMAT / SAT / ACT
                        greScore: greScore || null,
                        gmatScore: gmatScore || null,
                        satScore: satScore || null,
                        actScore: actScore || null,
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
            },
            include: { student: true },
        })

        // ── Auto-claim walk-in fair passes ────────────────────────────────────
        // If this email was used at a fair before registering, retroactively
        // link those passes so fair visits appear immediately on the dashboard.
        if (newUser.student) {
            await prisma.fairStudentPass
                .updateMany({
                    where: { email, studentId: null },
                    data: { studentId: newUser.student.id, isPartialProfile: false },
                })
                .catch(() => null) // best-effort — never block registration
        }

        // Audit log — actorId is null for SYSTEM actions (no User FK violation)
        void logAudit({
            action: 'REGISTER_STUDENT',
            entityType: 'USER',
            entityId: email,
            actorId: null,
            metadata: { ip, email, role: 'STUDENT' }
        }).catch(() => null)

        // 1. Magic link — MUST succeed, always awaited first
        await sendMagicLink(email, '/student/dashboard')

        // 2. Welcome + admin emails — fire-and-forget so they never block or
        //    trigger Resend's 2 req/sec limit against the magic link.
        //    If these fail (rate limit, transient error) the user is already logged in.
        void sendEmail({
            to: email,
            subject: 'Welcome to EdUmeetup! 🎓',
            html: generateEmailHtml('Welcome to EdUmeetup!', EmailTemplates.welcomeStudent(fullName))
        }).catch((e) => console.warn('[registerStudent] Welcome email failed (non-fatal):', e?.message))

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
        if (adminEmail) {
            void sendEmail({
                to: adminEmail,
                subject: `New Student Registration: ${fullName}`,
                html: generateEmailHtml('New Student Registration', EmailTemplates.adminNewStudent(fullName, email))
            }).catch((e) => console.warn('[registerStudent] Admin email failed (non-fatal):', e?.message))
        }

        return { success: true, email, message: "Account created! Check your email to login." }

    } catch (error) {
        console.error('Registration failed:')
        return { error: 'Registration failed' }
    }
}


export async function loginUniversity(formData: FormData) {
    const email = formData.get('email') as string
    const token = formData.get('cf-turnstile-response') as string

    const turnstileCheck = await verifyTurnstile(token)
    if (!turnstileCheck.success) {
        return { error: turnstileCheck.error }
    }

    // 1. Validate Email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Please enter a valid email address." }
    }

    if (isDisposableEmail(email)) {
        return { 
            error: "Temporary or disposable email addresses are not accepted. Please use your official university or personal email." 
        }
    }

    // 2. University Domain Check
    if (!(await isUniversityEmail(email))) {
        return { error: "Please use your official university email (e.g. name@university.edu). Personal emails are not accepted." }
    }

    // 3. Rate Limit
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    // Note: We use a separate limiter for login if needed, or reuse generic. 
    // For now, let's rely on Auth.js built-in rate limit or adding a check here.
    // Let's use the register limiter for now or skip if Auth.js handles it.
    // Auth.js `signIn` callback handles per-email rate limiting.

    try {
        await signIn("email", {
            email,
            redirect: false,
            redirectTo: '/university/dashboard'
        })
        return { success: true, message: "Magic link sent! Check your inbox." }
    } catch (error) {
        // Always rethrow NEXT_REDIRECT — Next.js needs it
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') throw error
        if (error instanceof Error && error.message.includes('RateLimited')) {
            return { error: "Too many attempts. Please try again later." }
        }
        console.error('[loginUniversity] signIn error:')
        return { error: "Something went wrong. Please try again or contact support." }
    }
}

export async function registerUniversity(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())
    const validation = registerUniversitySchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    const { email, institutionName, country, website, contactEmail } = validation.data

    if (validation.data.website_url) return { error: 'Spam detected' }

    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many attempts. Please wait.' }
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            if (existingUser.role === 'UNIVERSITY' || existingUser.role === 'UNIVERSITY_REP') {
                if (existingUser.isActive) {
                    await sendMagicLink(email, '/university/dashboard').catch(() => null)
                }
                return { success: true, message: "Registered. Please check your email to login." }
            }
            return { error: 'Registration failed. Please contact support if you need help.' }
        }

        await prisma.user.create({
            data: {
                email,
                role: 'UNIVERSITY',
                isActive: true,
                university: {
                    create: {
                        institutionName,
                        country,
                        city: '',
                        website,
                        contactEmail, // Preserved
                        verificationStatus: 'PENDING'
                    }
                }
            }
        })

        console.log(`New university registered: ${institutionName}`)

        await logAudit({
            action: 'REGISTER_UNIVERSITY',
            entityType: 'USER',
            entityId: email,
            actorId: null,
            metadata: { ip, email, institutionName, role: 'UNIVERSITY' }
        })

        // Trigger Magic Link on Client or via SignIn
        return { success: true, message: "Registered. Please check your email to login." }

    } catch (error) {
        console.error('Registration failed:')
        return { error: 'Registration failed' }
    }
}

export async function expressInterest(universityId: string, studentEmail?: string, programId?: string) {
    const user = await requireUser()
    
    const validation = studentInteractionSchema.safeParse({ universityId, programId })
    if (!validation.success) {
        return { error: "Invalid input provided." }
    }

    // RATE LIMIT
    if (!interestRateLimiter.check(user.id)) {
        return { error: "Too many interest requests. Please try again later." }
    }

    // Verify Student Role
    if (user.role !== 'STUDENT') return { error: "Only students can express interest" }

    const studentProfileCheck = await prisma.student.findFirst({
        where: { userId: user.id },
        select: { profileComplete: true }
    })

    if (!studentProfileCheck || !studentProfileCheck.profileComplete) {
        return { 
            error: "Complete your profile before expressing interest in universities.",
            code: "PROFILE_INCOMPLETE"
        }
    }

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

        // Normalise — undefined and null are the same in our data model
        const normalisedProgramId = programId ?? null

        const existingInterest = await prisma.interest.findFirst({
            where: {
                studentId: student.id,
                universityId: universityId,
                programId: normalisedProgramId
            }
        })

        if (existingInterest) {
            return { success: true, message: 'Interest already recorded.' }
        }

        await prisma.interest.create({
            data: {
                studentId: student.id,
                universityId: universityId,
                programId: normalisedProgramId,
                status: 'INTERESTED',
                studentMessage: programId
                    ? `I am interested in a specific program.`
                    : "I am interested in your programs."
            }
        })

        const studentMessage = programId
            ? `I am interested in one of your programs.`
            : `I am interested in your university.`

        // Notification for University (generic)
        await createNotification({
            userId: university.user.id,
            type: 'INTEREST_RECEIVED',
            title: 'New Student Interest',
            message: `${student.fullName} is interested in ${programId ? 'one of your programs' : 'your university'}.`,
            payload: { studentId: student.id, programId },
            emailTo: university.contactEmail || university.user.email,
            emailSubject: `New Interest from ${student.fullName}`,
            emailHtml: generateEmailHtml(
                `New Interest from ${student.fullName}`,
                EmailTemplates.universityInterest(
                    student.fullName || 'Student',
                    student.user.email,
                    studentMessage
                )
            ),
            replyTo: student.user.email
        })

        // Confirmation notification for Student (generic)
        await createNotification({
            userId: student.userId,
            type: 'INTEREST_SENT',
            title: 'Interest Sent!',
            message: `Your interest in ${university.institutionName} has been sent. They will review your profile and reach out if there's a match.`,
            payload: { universityId }
        })

        // Role-specific bell notifications
        await notifyUniversity(university.id, {
            title: 'New Student Interest',
            message: `${student.fullName} is interested in ${programId ? 'one of your programs' : 'your university'} — view their profile.`,
            type: 'INFO',
            actionUrl: '/university/dashboard'
        })
        await notifyStudent(student.id, {
            title: 'Interest Sent!',
            message: `Your interest in ${university.institutionName} was sent successfully. We'll notify you when they respond.`,
            type: 'INFO',
            actionUrl: `/universities/${universityId}`
        })

        revalidatePath(`/universities/${universityId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to express interest:")
        return { error: "Failed to express interest" }
    }
}

export async function expressInterestBulk(universityId: string, programIds: string[]) {
    const user = await requireUser()

    if (user.role !== 'STUDENT') return { error: 'Only students can express interest' }
    if (!programIds.length) return { error: 'No programmes selected' }
    if (!universityId || typeof universityId !== 'string') return { error: 'Invalid university ID' }

    const studentProfileCheck = await prisma.student.findFirst({
        where: { userId: user.id },
        select: { profileComplete: true }
    })

    if (!studentProfileCheck || !studentProfileCheck.profileComplete) {
        return { 
            error: "Complete your profile before expressing interest in universities.",
            code: "PROFILE_INCOMPLETE"
        }
    }

    try {
        const student = await prisma.student.findFirst({
            where: { user: { email: user.email ?? '' } },
            include: { user: true },
        })
        if (!student) return { error: 'Student profile not found' }

        const university = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true },
        })
        if (!university) return { error: 'University not found' }

        // Create one record per programme — skip existing silently
        const result = await prisma.interest.createMany({
            data: programIds.map(programId => ({
                studentId: student.id,
                universityId,
                programId,
                status: 'INTERESTED',
                studentMessage: 'I am interested in this programme.',
            })),
            skipDuplicates: true,
        })

        const created = result.count
        const skipped = programIds.length - created

        if (created > 0) {
            // Single university notification for the batch
            await createNotification({
                userId: university.user.id,
                type: 'INTEREST_RECEIVED',
                title: 'New Student Interest',
                message: `${student.fullName} expressed interest in ${created} programme${created !== 1 ? 's' : ''} at your university.`,
                payload: { studentId: student.id, programIds },
                emailTo: university.contactEmail || university.user.email,
                emailSubject: `New Interest from ${student.fullName}`,
                emailHtml: generateEmailHtml(
                    `New Interest from ${student.fullName}`,
                    EmailTemplates.universityInterest(
                        student.fullName || 'Student',
                        student.user.email,
                        `Interested in ${created} programme${created !== 1 ? 's' : ''}.`
                    )
                ),
                replyTo: student.user.email,
            })

            await notifyStudent(student.id, {
                title: 'Interest Sent!',
                message: `Your interest in ${created} programme${created !== 1 ? 's' : ''} at ${university.institutionName} was sent successfully.`,
                type: 'INFO',
                actionUrl: `/universities/${universityId}`,
            })
        }

        revalidatePath(`/universities/${universityId}`)
        return { success: true, count: created, skipped }
    } catch (error) {
        console.error('Failed to bulk express interest:')
        return { error: 'Failed to express interest' }
    }
}


// ─── Program form helpers ─────────────────────────────────────────────────────

function nullIfEmpty(val: FormDataEntryValue | null): string | null {
    if (!val) return null
    const s = String(val).trim()
    return s === '' ? null : s
}

function parseOptionalNum(
    val: FormDataEntryValue | null,
    parser: (s: string) => number
): number | null {
    if (!val) return null
    const s = String(val).trim()
    if (s === '' || s === '0' && parser === parseFloat) return null
    const result = parser(s)
    return isNaN(result) ? null : result
}

function programFields(formData: FormData) {
    return {
        programName:     String(formData.get('programName') || '').trim(),
        degreeLevel:     String(formData.get('degreeLevel') || 'Masters'),
        fieldCategory:   String(formData.get('fieldCategory') || 'Others'),
        stemDesignated:  formData.get('stemDesignated') === 'true',
        durationMonths:  parseInt(String(formData.get('durationMonths') || '12')) || 12,
        tuitionFee:      parseFloat(String(formData.get('tuitionFee') || '0')) || 0,
        currency:        String(formData.get('currency') || 'USD'),
        intakes:         String(formData.get('intakes') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        englishTests:    String(formData.get('englishTests') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        minEnglishScore: parseOptionalNum(formData.get('minEnglishScore'), parseFloat),
        description:     nullIfEmpty(formData.get('description')),
        satRequired:     nullIfEmpty(formData.get('satRequired')),
        satMinScore:     parseOptionalNum(formData.get('satMinScore'), parseInt),
        satMaxScore:     parseOptionalNum(formData.get('satMaxScore'), parseInt),
        actRequired:     nullIfEmpty(formData.get('actRequired')),
        actMinScore:     parseOptionalNum(formData.get('actMinScore'), parseInt),
        actMaxScore:     parseOptionalNum(formData.get('actMaxScore'), parseInt),
        greRequired:     nullIfEmpty(formData.get('greRequired')),
        greMinScore:     parseOptionalNum(formData.get('greMinScore'), parseInt),
        greMaxScore:     parseOptionalNum(formData.get('greMaxScore'), parseInt),
        gmatRequired:    nullIfEmpty(formData.get('gmatRequired')),
        gmatMinScore:    parseOptionalNum(formData.get('gmatMinScore'), parseInt),
        gmatMaxScore:    parseOptionalNum(formData.get('gmatMaxScore'), parseInt),
        scholarshipAvail:   nullIfEmpty(formData.get('scholarshipAvail')),
        scholarshipDetails: nullIfEmpty(formData.get('scholarshipDetails')),
        applicationFee:    parseOptionalNum(formData.get('applicationFee'), parseFloat),
        applicationFeeCur: String(formData.get('applicationFeeCur') || 'USD'),
        appDeadlineType:   nullIfEmpty(formData.get('appDeadlineType')),
        appDeadlineDate:   formData.get('appDeadlineDate')
            ? new Date(String(formData.get('appDeadlineDate')))
            : null,
        workExpYears:    parseOptionalNum(formData.get('workExpYears'), parseInt),
        minGpa:          parseOptionalNum(formData.get('minGpa'), parseFloat),
        minPercentage:   parseOptionalNum(formData.get('minPercentage'), parseFloat),
        coopAvailable:   formData.get('coopAvailable') === 'true',
        specialisations: String(formData.get('specialisations') || '').split(',').map((s: string) => s.trim()).filter(Boolean),
    }
}

export async function createProgram(formData: FormData) {
    const user = await requireUser()
    const rawData = Object.fromEntries(formData.entries())
    
    // Zod validation for base fields
    const validation = createProgramSchema.safeParse(rawData)
    if (!validation.success) {
        return { error: "Invalid form fields. Check your input." }
    }

    const fields = programFields(formData)
    if (!fields.programName) return { error: 'Program name is required' }

    try {
        const university = await prisma.university.findUnique({ where: { userId: user.id } })
        if (!university) return { error: 'University profile not found' }

        await prisma.program.create({
            data: { universityId: university.id, status: 'ACTIVE', ...fields },
        })

        const interestedStudents = await prisma.interest.findMany({
            where: { universityId: university.id },
            select: { studentId: true },
            distinct: ['studentId'],
        })
        
        if (interestedStudents.length > 0) {
            await prisma.studentNotification.createMany({
                data: interestedStudents.map(({ studentId }: { studentId: string }) => ({
                    studentId,
                    title: 'New Programme Added',
                    message: `${university.institutionName} has added a new programme: ${fields.programName}.`,
                    type: 'INFO',
                    actionUrl: `/universities/${university.id}`,
                }))
            }).catch((e: unknown) => console.error('[createProgram] Bulk notification failed:', e))
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Failed to create program:')
        return { error: 'Failed to create program' }
    }
}

export async function updateProgram(programId: string, formData: FormData) {
    const user = await requireUser()

    const existing = await prisma.program.findUnique({
        where: { id: programId },
        select: { universityId: true },
    })
    if (!existing) return { error: 'Program not found' }

    // Ownership check — works for UNIVERSITY and UNIVERSITY_REP
    let university = await prisma.university.findUnique({ where: { userId: user.id } })
    if (!university && user.role === 'UNIVERSITY_REP') {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { universityId: true } })
        if (dbUser?.universityId) university = await prisma.university.findUnique({ where: { id: dbUser.universityId } })
    }
    if (!university || university.id !== existing.universityId) return { error: 'Unauthorized' }

    const rawData = Object.fromEntries(formData.entries())
    const validation = createProgramSchema.safeParse(rawData)
    if (!validation.success) {
        return { error: "Invalid form fields. Check your input." }
    }

    const fields = programFields(formData)
    if (!fields.programName) return { error: 'Program name is required' }

    try {
        await prisma.program.update({
            where: { id: programId },
            data: fields,
        })
        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Failed to update program:')
        return { error: 'Failed to update program' }
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
                verifiedAt: status === 'VERIFIED' ? new Date() : null,
            },
            include: { user: true }
        })

        // Update User Status separately to avoid nested type issues
        await prisma.user.update({
            where: { id: uniProfile.userId },
            data: {
                isActive: status === 'VERIFIED'
            }
        })

        // Notification (Email + In-App generic)
        const isVerified = status === 'VERIFIED'
        await createNotification({
            userId: uniProfile.userId,
            type: 'VERIFICATION_UPDATE',
            title: `University Verification: ${status}`,
            message: isVerified
                ? 'Congratulations! Your Official Profile is now live on EdUmeetup. You can now publish programs and accept student meetings.'
                : 'Your profile could not be onboarded at this time. Please contact our support team — we will be happy to help.',
            emailTo: uni.contactEmail || uniProfile.user.email,
            emailSubject: isVerified
                ? `Welcome to EdUmeetup — Your Official Profile is Live! 🎉`
                : `Your EdUmeetup Profile — Follow-up Required`,
            emailHtml: generateEmailHtml(
                isVerified ? 'Your Profile is Now Live! 🎉' : 'Profile Update',
                EmailTemplates.verificationStatus(
                    status as 'VERIFIED' | 'REJECTED',
                    uni.institutionName
                )
            ),
            ...(!isVerified ? { replyTo: process.env.SUPPORT_EMAIL } : {})
        })

        // ── For VERIFIED universities: send a follow-up email with the CSV template ──
        // This lets them bulk-import their program catalog immediately, no guesswork.
        if (isVerified) {
            const csvTemplate = [
                'Program Name,Degree Level,Field,Tuition,Duration,Intake',
                'MSc Computer Science,Masters,Computer Science,25000,12,"Fall 2025, Spring 2026"',
                'MBA General Management,Masters,Business,35000,18,"Fall 2025"',
                'BSc Data Science,Bachelors,Data Science,18000,36,"Fall 2025, Spring 2026"',
                'MA Psychology,Masters,Social Sciences,20000,12,"Fall 2025"',
                '# ─── HOW TO USE THIS FILE ───────────────────────────────────────────────',
                '# 1. Delete the example rows above (rows starting with real data).',
                '# 2. Fill in YOUR programs using the same columns.',
                '# 3. Degree Level: Bachelors / Masters / PhD / Diploma / Certificate',
                '# 4. Field: Computer Science / Engineering / Business / Data Science /',
                '#          Health Sciences / Social Sciences / Arts & Humanities / Law / Architecture / Others',
                '# 5. Tuition: number only (no $ sign), in USD.',
                '# 6. Duration: number of months.',
                '# 7. Intake: e.g. "Fall 2025" or "Fall 2025, Spring 2026"',
                '# 8. Upload the file to your dashboard → Programs tab → Import CSV.',
            ].join('\r\n')

            await sendEmail({
                to: uni.contactEmail || uniProfile.user.email,
                subject: `Next step: upload your program catalog to EdUmeetup`,
                html: generateEmailHtml('Add Your Programs in Seconds', `
                    <p>Hi ${uni.institutionName} team,</p>
                    <p>Your profile is live — the next step is to add your programs so students can discover and express interest in them.</p>
                    <p>We've attached a <strong>ready-to-fill CSV template</strong> to this email. Here's all you need to do:</p>
                    <ol style="padding-left:20px;color:#374151;line-height:2;">
                        <li>Open the attached <code>program-catalog-template.csv</code> file</li>
                        <li>Replace the example rows with your programs</li>
                        <li>Go to your dashboard → <strong>Programs</strong> tab → click <strong>Import CSV</strong></li>
                        <li>Drop the file in — we'll map the columns automatically</li>
                    </ol>
                    <div class="info-box" style="background:#f0f4ff;border-color:#c7d2fe;">
                        <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#3333cc;">Supported columns</p>
                        <p style="margin:0;font-size:13px;">Program Name · Degree Level · Field · Tuition · Duration · Intake</p>
                    </div>
                    <p style="text-align:center;margin-top:24px;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/dashboard?tab=programs" class="btn">Go to Programs Tab →</a>
                    </p>
                    <p style="font-size:12px;color:#94a3b8;">You can also add programs one by one directly on your dashboard if you prefer.</p>
                `),
                attachments: [
                    {
                        filename: 'program-catalog-template.csv',
                        content: Buffer.from(csvTemplate, 'utf-8'),
                    }
                ],
            })
        }

        // Role-specific bell notification
        await notifyUniversity(universityId, {
            title: isVerified ? '🎉 Official Profile is Live!' : 'Profile Update',
            message: isVerified
                ? 'Your Official Profile is now live. You can publish programs and accept student meetings.'
                : 'Your profile could not be onboarded at this time. Please contact support — we are here to help.',
            type: isVerified ? 'INFO' : 'WARNING',
            actionUrl: '/university/dashboard'
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
        console.error("Failed to verify university:")
        return { error: "Failed to verify" }
    }
}

// Login Action (Magic Link)
export async function login(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())

    const turnstileCheck = await verifyTurnstile(rawData['cf-turnstile-response'] as string)
    if (!turnstileCheck.success) {
        return { error: turnstileCheck.error }
    }

    const validation = loginSchema.safeParse(rawData)

    if (!validation.success) {
        return { error: validation.error.flatten().fieldErrors }
    }

    // Schema already lowercases. Belt+suspenders: normalize again.
    const email = validation.data.email.trim().toLowerCase()

    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    const limitKey = `${ip}:${email}`
    if (!loginRateLimiter.check(limitKey)) {
        return { error: 'Too many login attempts. Please try again in a minute.' }
    }

    try {
        // findFirst + mode insensitive handles legacy mixed-case emails in DB
        const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } }
        })

        if (!user) {
            // B2 fix: don't reveal whether email is in DB — constant-time same response
            // Deliberate stochastic delay to simulate the Resend API latency and prevent timing attacks
            const simulatedNetworkLatency = 600 + Math.random() * 500
            await new Promise(resolve => setTimeout(resolve, simulatedNetworkLatency))
            return { success: true, message: "Check your email for the login link!" }
        }

        if (!user.isActive) {
            return { error: 'Your account has been suspended.' }
        }

        const callbackUrl = formData.get('callbackUrl') as string

        // Determine Redirection based on Role
        let redirectTo = '/student/dashboard'
        if (user.role === 'UNIVERSITY') redirectTo = '/university/dashboard'
        if (user.role === 'ADMIN') redirectTo = '/admin/dashboard'
        if (user.role === 'ALUMNI') redirectTo = '/alumni/dashboard'

        if (callbackUrl) {
            redirectTo = callbackUrl
        }

        // Send magic link directly (bypasses Auth.js signIn which silently fails in Netlify serverless)
        await sendMagicLink(email, redirectTo)

        return { success: true, message: "Check your email for the login link!" }

    } catch (error) {
        if (error instanceof AuthError) {
            return { error: "Authentication failed" }
        }
        console.error('Login error:')
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
        certAuthority, certLegitimacy, certPurpose, certAccountability,
        detectedUniversityName, detectedCountry,
    } = data as any

    if (!email || !institutionName) {
        return { error: 'Missing required fields' }
    }

    // HONEYPOT
    if (data.website_url) return { error: 'Spam detected' }

    // RATE LIMIT
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    if (!registerRateLimiter.check(ip)) {
        return { error: 'Too many attempts. Please verify you are human.' }
    }

    // SERVER-SIDE EMAIL DOMAIN VALIDATION
    try {
        const { extractDomain, getUniversityInfo, waitForCache } = await import('@/lib/university-domains')
        const BLOCKED = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me', 'icloud.com', 'yandex.com', 'mail.ru', 'qq.com', '163.com', 'rediffmail.com'])
        const domain = extractDomain(email)
        if (!domain || BLOCKED.has(domain)) {
            return { error: 'Personal or generic email providers are not allowed. Please use an official university email.' }
        }
        await waitForCache()
        const info = getUniversityInfo(domain)
        if (!info) {
            return { error: 'Email domain not recognized as an official university. Please use your institutional email.' }
        }
    } catch (validationErr) {
        console.warn('[registerUniversity] Email validation skipped due to error:', validationErr)
    }

    try {
        // ── 1. Duplicate guard ────────────────────────────────────────────────
        const existingUser = await prisma.user.findUnique({
            where: { email },
            include: { university: true }
        })

        // Block only if they already have a university profile
        if (existingUser?.university) {
            if (existingUser.isActive) {
                await sendMagicLink(email, '/university/dashboard').catch(() => null)
            }
            return { success: true, isAutoApproved: true, message: "Registered successfully! Check your email to login." }
        }

        // ── 2. Parent Institution Auto-Detection ──────────────────────────────
        const emailDomain = email.split('@')[1]?.toLowerCase()
        let parentMatch: { id: string; groupSlug: string | null; institutionName: string } | null = null

        if (emailDomain) {
            parentMatch = await prisma.university.findFirst({
                where: {
                    isParent: true,
                    verificationStatus: 'VERIFIED',
                    OR: [
                        { repEmail: { endsWith: `@${emailDomain}` } },
                        { contactEmail: { endsWith: `@${emailDomain}` } },
                    ]
                },
                select: { id: true, groupSlug: true, institutionName: true }
            })
        }

        const isAutoApproved = !!parentMatch
        const verificationStatus = isAutoApproved ? 'VERIFIED' : 'PENDING'

        const universityData = {
            institutionName,
            country,
            city,
            website,
            repName,
            repDesignation,
            repEmail: email,
            contactPhone,
            accreditationNo: accreditation,
            scholarshipsAvailable,
            certAuthority,
            certLegitimacy,
            certPurpose,
            certAccountability,
            certIp: ip,
            certTimestamp: new Date(),
            verificationStatus,
            ...(isAutoApproved ? {
                verifiedAt: new Date(),
                verifiedByAdmin: 'AUTO_PARENT_MATCH',
                parentId: parentMatch!.id,
                groupSlug: parentMatch!.groupSlug,
            } : {}),
            universityNameFromEmail: detectedUniversityName || null,
            countryFromEmail: detectedCountry || null,
            programList: { create: programs.map((p: ProgramData) => ({
                    programName: p.programName,
                    degreeLevel: p.degreeLevel,
                    fieldCategory: p.fieldCategory,
                    stemDesignated: p.stemDesignated,
                    durationMonths: parseInt(p.durationMonths),
                    tuitionFee: parseFloat(p.tuitionFee),
                    currency: p.currency,
                    intakes: Array.isArray(p.intakes) ? p.intakes : [],
                    englishTests: Array.isArray(p.englishTests) ? p.englishTests : [],
                    minEnglishScore: p.minEnglishScore ? parseFloat(p.minEnglishScore) : null,
                    status: 'ACTIVE'
                }))
            }
        }

        // ── 3. Create or update user + university record ───────────────────────
        if (existingUser) {
            // User exists but has no university record — just create the University
            await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    role: 'UNIVERSITY',
                    name: repName || existingUser.name,
                    university: { create: universityData }
                }
            })
        } else {
            // Fresh registration — create user + university together
            await prisma.user.create({
                data: {
                    email,
                    role: 'UNIVERSITY',
                    university: { create: universityData }
                }
            })
        }

        console.log(
            `[REGISTER] ${institutionName} registered with ${programs.length} programs` +
            (isAutoApproved ? ` — AUTO-APPROVED under parent: ${parentMatch!.institutionName}` : ' — PENDING admin review')
        )

        // ── 4. Send magic link ────────────────────────────────────────────────
        await sendMagicLink(email, '/university/dashboard')

        // ── 5. Notification emails ────────────────────────────────────────────
        if (isAutoApproved) {
            // "Verified under parent" email — no admin queue entry created
            await sendEmail({
                to: email,
                subject: `✅ Your EdUmeetup account is verified under ${parentMatch!.institutionName}`,
                html: generateEmailHtml('Account Automatically Verified', `
                    <p>Your institution <strong>${institutionName}</strong> has been automatically verified on EdUmeetup as a school under <strong>${parentMatch!.institutionName}</strong>.</p>
                    <p>No manual review is needed — your dashboard is ready immediately after you sign in via the login link sent to this email.</p>
                    <p>Your school profile will appear on EdUmeetup alongside other institutions in the ${parentMatch!.institutionName} group.</p>
                `)
            })
        } else {
            // Alert admin about new university pending review
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
            if (adminEmail) {
                await sendEmail({
                    to: adminEmail,
                    subject: `[ACTION REQUIRED] New University Registration: ${institutionName}`,
                    html: generateEmailHtml('New University Registration', EmailTemplates.adminNewUniversity(institutionName, email))
                })
            }
        }

    } catch (error) {
        console.error('Registration failed:')
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

        // Allow university owner OR a rep linked to this university
        const isOwner = program.university.userId === user.id
        if (!isOwner) {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { universityId: true }
            })
            const isRep = dbUser?.universityId === program.universityId
            if (!isRep) return { error: "Unauthorized" }
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
        console.error("Failed to delete program:")
        return { error: "Failed to delete program" }
    }
}

export async function updateUniversityProfile(formData: FormData) {
    const meetingLink = formData.get('meetingLink') as string

    try {
        const user = await requireUser()

        // Resolve university for both owner (university.userId) and rep (User.universityId)
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { universityId: true }
        })
        const uniProfile = await prisma.university.findFirst({
            where: {
                OR: [
                    { userId: user.id },
                    { id: dbUser?.universityId ?? '' },
                ]
            }
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
        console.error("Failed to update profile:")
        return { error: "Failed to update profile" }
    }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function submitPublicInquiry(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())

    // RATE LIMIT (IP Based)
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
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
        console.error("Failed to submit inquiry:")
        return { error: "Failed to submit inquiry" }
    }
}

export async function submitPdoRegistration(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries())

    // RATE LIMIT (IP Based)
    const ip = (await headers()).get('x-forwarded-for') || 'unknown'
    if (!contactRateLimiter.check(ip)) {
        return { error: "Too many submissions. Please try again later." }
    }

    const validation = pdoRegistrationSchema.safeParse(rawData)

    if (!validation.success) {
        return { errors: validation.error.flatten().fieldErrors, error: 'Please fix the errors below.' }
    }

    const { fullName, email, phone, universityName, programName, degreeLevel, intakeSemester, visaStatus, city, questions } = validation.data

    const timestamp = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    try {
        // Admin notification email
        const adminHtml = generateEmailHtml('New PDO Registration', `
            <p>A student has registered for a <strong>Pre-Departure Orientation (PDO)</strong> session at the Ahmedabad office.</p>
            <div class="info-box">
                <div class="info-row"><span class="info-label">Name:</span> ${fullName}</div>
                <div class="info-row"><span class="info-label">Email:</span> <a href="mailto:${email}">${email}</a></div>
                <div class="info-row"><span class="info-label">Phone / WhatsApp:</span> ${phone}</div>
                <div class="info-row"><span class="info-label">City (Departing From):</span> ${city}</div>
                <div class="info-row"><span class="info-label">Admitted University:</span> ${universityName}</div>
                <div class="info-row"><span class="info-label">Program:</span> ${programName}</div>
                <div class="info-row"><span class="info-label">Degree Level:</span> ${degreeLevel}</div>
                <div class="info-row"><span class="info-label">Intake Semester:</span> ${intakeSemester}</div>
                <div class="info-row"><span class="info-label">Visa Status:</span> ${visaStatus}</div>
                <div class="info-row"><span class="info-label">Submitted:</span> ${timestamp} IST</div>
            </div>
            ${questions ? `
                <h3 style="margin:20px 0 8px;">Questions / Comments</h3>
                <blockquote style="border-left:4px solid #0d9488;padding-left:16px;margin:0;color:#1e293b;white-space:pre-wrap;">${questions.trim()}</blockquote>
            ` : ''}
            <p style="margin-top:24px;">
                <a href="mailto:${email}" class="btn">Reply to ${fullName} →</a>
            </p>
        `)

        await sendEmail({
            to: process.env.INFO_EMAIL || 'info@edumeetup.com',
            subject: `[PDO Registration] ${fullName} — ${universityName} (${intakeSemester})`,
            html: adminHtml,
            replyTo: email,
        })

        // Auto-reply to student
        const studentHtml = generateEmailHtml('PDO Registration Confirmed 🎓', `
            <p>Hi <strong>${fullName}</strong>,</p>
            <p>Thank you for registering for the <strong>Pre-Departure Orientation (PDO)</strong> at the EdUmeetup Ahmedabad office!</p>
            <p>We have received your details and our team will get in touch with you shortly to confirm your session schedule for <strong>${intakeSemester}</strong>.</p>
            <div class="info-box">
                <div class="info-row"><span class="info-label">University:</span> ${universityName}</div>
                <div class="info-row"><span class="info-label">Program:</span> ${programName} (${degreeLevel})</div>
                <div class="info-row"><span class="info-label">Intake:</span> ${intakeSemester}</div>
                <div class="info-row"><span class="info-label">Visa Status:</span> ${visaStatus}</div>
            </div>
            <p>The PDO session covers everything you need to know before you fly — from setting up your bank account to navigating campus life in the US.</p>
            <p>If you have any immediate questions, feel free to reply to this email.</p>
            <p>We look forward to seeing you! 🌟</p>
        `)

        await sendEmail({
            to: email,
            subject: `Your PDO Registration is Confirmed — EdUmeetup Ahmedabad`,
            html: studentHtml,
        })

        return { success: true }
    } catch (error) {
        console.error("Failed to submit PDO registration:")
        return { error: "Failed to submit registration. Please try again." }
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

    if (!sessionEmail) return { error: "Not authenticated" }

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

        // 3. Notify User (In-app + email confirmation)
        await createNotification({
            userId: user.id,
            type: 'TICKET_CREATED',
            title: 'Support Ticket Received',
            message: `We received your ticket #${ticket.id.slice(-6)}: "${category}". Our team will review it shortly.`,
            payload: { ticketId: ticket.id }
        })

        // Email confirmation back to the user
        await sendEmail({
            to: user.email,
            subject: `Support Ticket Received #${ticket.id.slice(-6)}`,
            html: generateEmailHtml('Support Ticket Received', `
                <p>Hi ${userName},</p>
                <p>We have received your support ticket. Here are the details:</p>
                <div class="info-box">
                    <div class="info-row"><span class="info-label">Ticket #:</span> <span>${ticket.id.slice(-6).toUpperCase()}</span></div>
                    <div class="info-row"><span class="info-label">Category:</span> <span>${category}</span></div>
                    <div class="info-row"><span class="info-label">Priority:</span> <span>${priority}</span></div>
                </div>
                <p>Our team typically responds within 24-48 hours. You will be notified by email when there is an update.</p>
                <p>Best regards,<br/>The EdUmeetup Support Team</p>
            `)
        })

        return { success: true, ticketId: ticket.id }
    } catch (error) {
        console.error("Failed to create ticket:")
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
        if ((user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP')) return { error: "Unauthorized" }

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
                durationMinutes: duration,
                meetingCode: `EDU-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
                videoProvider: 'GOOGLE_MEET', // Default
                purpose: 'ADMISSION_QUERY',   // Default
                studentTimezone: 'UTC',       // Default
                repTimezone: 'UTC',           // Default
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
                } : undefined,
            },
            include: { participants: { include: { user: true } } }
        }) as unknown as (Meeting & { participants: (MeetingParticipant & { user: User })[] })

        // If slot used, mark as booked
        if (availabilitySlotId) {
            await prisma.availabilitySlot.update({
                where: { id: availabilitySlotId },
                data: { isBooked: true }
            })
        }

        // Send Notifications (Email + DB)
        for (const p of meeting.participants) {
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
        console.error("Failed to create meeting:")
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
        console.error("Failed to update RSVP:")
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
        const newData = validation.data

        // ── Build diff: only record fields that actually changed ──
        const TRACKED_FIELDS = [
            'fullName', 'city', 'pincode', 'phone', 'whatsappNumber',
            'ageGroup', 'currentStatus', 'fieldOfInterest', 'preferredDegree',
            'budgetRange', 'englishTestType', 'englishScore',
            'greScore', 'gmatScore', 'satScore', 'actScore',
            'preferredIntake', 'preferredCountries',
        ] as const

        const changedFields: Record<string, { from: string | null; to: string | null }> = {}

        for (const key of TRACKED_FIELDS) {
            const oldVal = (student[key as keyof typeof student] as string | null) ?? null
            const newVal = (newData[key as keyof typeof newData] as string | undefined) ?? null
            if (oldVal !== newVal) {
                changedFields[key] = { from: oldVal, to: newVal }
            }
        }

        // ── Full snapshot of profile after applying changes ──
        const snapshot: Record<string, string | null | boolean | number | undefined> = {}
        for (const key of TRACKED_FIELDS) {
            snapshot[key] = (newData[key as keyof typeof newData] as string | undefined)
                ?? (student[key as keyof typeof student] as string | null | undefined)
                ?? null
        }

        const nextVersion = student.profileVersion + 1

        // ── Atomic transaction: update student + create changelog ──
        await prisma.$transaction([
            prisma.student.update({
                where: { id: student.id },
                data: {
                    ...newData,
                    profileVersion: nextVersion,
                }
            }),
            prisma.profileChangeLog.create({
                data: {
                    studentId: student.id,
                    version: nextVersion,
                    changedFields,
                    snapshot,
                }
            }),
        ])

        revalidatePath('/student/profile')
        revalidatePath('/student/profile/history')
        revalidatePath('/student/dashboard')
        return { success: true, version: nextVersion, changedCount: Object.keys(changedFields).length }
    } catch (error) {
        console.error("Failed to update profile:")
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
        if (!meeting.university) return { error: "University not found" }
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
        console.error("Failed to cancel meeting:")
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
        if (!meeting.university) return { error: "University not found" }
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

        // Notify participants: in-app + email
        for (const p of updatedMeeting.participants) {
            if (p.participantUserId === user.id) continue

            await prisma.notification.create({
                data: {
                    userId: p.participantUserId,
                    type: 'MEETING_UPDATED',
                    title: 'Meeting Updated',
                    message: `Details for "${title || meeting.title || 'your meeting'}" have been updated.`,
                    payload: { meetingId: meeting.id }
                }
            })

            // Email participants about the update
            await sendEmail({
                to: p.user.email,
                subject: `Meeting Updated: ${title || meeting.title || 'Your Meeting'}`,
                html: generateEmailHtml('Meeting Details Updated', `
                    <p>The details for your upcoming meeting have been updated.</p>
                    <div class="info-box">
                        <div class="info-row"><span class="info-label">Meeting:</span> <span>${title || meeting.title || 'Meeting'}</span></div>
                        <div class="info-row"><span class="info-label">Time:</span> <span>${new Date(meeting.startTime).toLocaleString()}</span></div>
                        ${joinUrl ? `<div class="info-row"><span class="info-label">Join Link:</span> <span>${joinUrl}</span></div>` : ''}
                    </div>
                    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/student/dashboard?tab=meetings" class="btn">View Meeting</a></p>
                `)
            })
        }

        revalidatePath('/university/dashboard')
        return { success: true }
    } catch (error) {
        console.error("Failed to update meeting:")
        return { error: "Failed to update meeting" }
    }
}

// --- Consolidated Meeting Logic (from meeting-actions.ts) ---

import { sendMeetingConfirmedEmailToStudent, sendMeetingConfirmedEmailToRep, sendMeetingCancelledEmail } from '@/lib/notifications'
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
        videoProvider: meeting.videoProvider,
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
    if (!session || !session.user || !session.user.id || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
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

export async function updateMeetingStatus(
    meetingId: string,
    status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
    meetingLink?: string,   // kept for backward compat — overridden by Whereby on CONFIRM
    rejectionReason?: string
) {
    const session = await auth()
    if (!session || !session.user || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
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
            }
        })

        if (!mtg) return { error: 'Meeting not found' }
        if (!mtg.university) return { error: 'University not found' }

        // Authorization Check
        if (mtg.university.userId !== session.user.id) {
            return { error: 'Unauthorized' }
        }

        // ── Auto-create Whereby room when confirming ──────────────────────────
        let finalJoinUrl = meetingLink || mtg.joinUrl || null
        let finalHostRoomUrl = (mtg as any).hostRoomUrl || null

        if (status === 'CONFIRMED' && !finalJoinUrl) {
            try {
                const { createWherebyMeeting } = await import('@/lib/whereby')
                // Calculate duration from start/end times
                const durationMinutes = Math.round(
                    (new Date(mtg.endTime).getTime() - new Date(mtg.startTime).getTime()) / 60000
                )
                const sessionTitle = (mtg as any).title || 'edumeetup-session'
                const room = await createWherebyMeeting(sessionTitle, durationMinutes)
                finalJoinUrl = room.roomUrl
                finalHostRoomUrl = room.hostRoomUrl
            } catch (wherebyErr) {
                // Whereby failed — don't block the confirmation, just log it
                console.error('Whereby room creation failed:', wherebyErr)
            }
        }

        // Update
        const dbStatus = status === 'REJECTED' ? 'CANCELLED' : status
        const cancellationDetails = status === 'REJECTED' || status === 'CANCELLED'
            ? {
                cancellationReason: rejectionReason || (status === 'REJECTED' ? 'Declined by University' : 'Cancelled by University'),
                cancelledBy: 'UNIVERSITY',
                cancelledAt: new Date()
            }
            : {}

        await prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: dbStatus as MeetingStatus,
                joinUrl: finalJoinUrl || undefined,
                hostRoomUrl: finalHostRoomUrl || undefined,
                videoProvider: finalJoinUrl ? 'EXTERNAL_LINK' : mtg.videoProvider,
                ...cancellationDetails
            }
        })

        // Notifications
        const studentParticipant = mtg.participants.find((p: any) => p.participantType === 'STUDENT')
        if (studentParticipant && studentParticipant.user.email) {
            const studentEmail = studentParticipant.user.email
            const studentUserId = studentParticipant.participantUserId
            const institutionName = mtg.university.institutionName

            // Fetch actual rep name
            let repName = 'University Representative'
            if (mtg.repId) {
                const repUser = await prisma.user.findUnique({ where: { id: mtg.repId }, select: { name: true } })
                if (repUser?.name) repName = repUser.name
            }

            if (status === 'CONFIRMED') {
                await sendMeetingConfirmedEmailToStudent(
                    studentEmail,
                    institutionName,
                    repName,
                    mtg.startTime,
                    (new Date(mtg.endTime).getTime() - new Date(mtg.startTime).getTime()) / 60000,
                    meetingLink || mtg.joinUrl || '',
                    mtg.id.slice(-6).toUpperCase(),
                    mtg.studentTimezone,
                    mtg.agenda || ''
                )
                // Also notify the rep
                if (mtg.repId) {
                    const repUser = await prisma.user.findUnique({ where: { id: mtg.repId }, select: { email: true } })
                    if (repUser?.email) {
                        const student = mtg.participants.find((p: any) => p.participantType === 'STUDENT')
                        const studentName = student?.user?.name || 'Student'
                        await sendMeetingConfirmedEmailToRep(
                            repUser.email,
                            studentName,
                            mtg.startTime,
                            (new Date(mtg.endTime).getTime() - new Date(mtg.startTime).getTime()) / 60000,
                            mtg.repTimezone,
                            meetingLink || mtg.joinUrl || undefined
                        )
                    }
                }
                // In-app notification to student (generic)
                await createNotification({
                    userId: studentUserId,
                    type: 'MEETING_CONFIRMED',
                    title: 'Meeting Confirmed!',
                    message: `Your meeting with ${institutionName} on ${new Date(mtg.startTime).toLocaleDateString()} has been confirmed.`,
                    payload: { meetingId: mtg.id }
                })
                // Role-specific bell
                if (mtg.studentId) await notifyStudent(mtg.studentId, {
                    title: '🎉 Meeting Confirmed!',
                    message: `Your meeting with ${institutionName} on ${new Date(mtg.startTime).toLocaleDateString()} is confirmed. Check your email for the join link.`,
                    type: 'INFO',
                    actionUrl: '/student/meetings'
                })
            } else if (status === 'REJECTED' || status === 'CANCELLED') {
                await sendMeetingCancelledEmail(
                    studentEmail,
                    institutionName,
                    mtg.startTime,
                    rejectionReason || 'University updated status.',
                    mtg.studentTimezone
                )
                // In-app notification to student (generic)
                await createNotification({
                    userId: studentUserId,
                    type: 'MEETING_CANCELLED',
                    title: 'Meeting Cancelled',
                    message: `Your meeting with ${institutionName} on ${new Date(mtg.startTime).toLocaleDateString()} has been ${status.toLowerCase()}.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`,
                    payload: { meetingId: mtg.id }
                })
                // Role-specific bell
                if (mtg.studentId) await notifyStudent(mtg.studentId, {
                    title: 'Meeting Request Declined',
                    message: `Your meeting with ${institutionName} was ${status.toLowerCase()}.${rejectionReason ? ' Reason: ' + rejectionReason : ' View alternatives.'}`,
                    type: 'WARNING',
                    actionUrl: '/student/meetings'
                })
            }
        }

        revalidatePath('/university/meetings')
        return { success: true }
    } catch (e: any) {
        console.error('[ERROR] Details redacted due to security policy')
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
        },
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
        },
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
export async function cancelMeetingByStudent(meetingId: string, reason: string) {
    try {
        const user = await requireUser()
        if (user.role !== 'STUDENT') return { error: 'Unauthorized' }

        const student = await prisma.student.findUnique({ where: { userId: user.id } })
        if (!student) return { error: 'Student profile not found' }

        const meeting = await prisma.meeting.findUnique({
            where: { id: meetingId },
            include: {
                university: { include: { user: true } },
                availabilitySlot: true
            }
        })

        if (!meeting) return { error: 'Meeting not found' }
        if (meeting.studentId !== student.id) return { error: 'Unauthorized' }
        if (meeting.status === 'CANCELLED' || meeting.status === 'COMPLETED') {
            return { error: 'This meeting cannot be cancelled.' }
        }

        // 1. Update status
        await prisma.meeting.update({
            where: { id: meetingId },
            data: { status: 'CANCELLED', cancellationReason: reason }
        })

        // 2. Free up availability slot
        if (meeting.availabilitySlot) {
            await prisma.availabilitySlot.update({
                where: { id: meeting.availabilitySlot.id },
                data: { isBooked: false }
            })
        }

        // university & user always present — universityId is non-nullable and user is included above
        if (!meeting.university?.user) {
            throw new Error(`Meeting ${meetingId} missing university.user — data integrity issue`)
        }
        const universityUserId = meeting.university.user.id
        const universityEmail = meeting.university.contactEmail || meeting.university.user.email
        const meetingTitle = meeting.title || `Meeting on ${new Date(meeting.startTime).toLocaleDateString()}`

        await createNotification({
            userId: universityUserId,
            type: 'MEETING_CANCELLED',
            title: 'Meeting Cancelled by Student',
            message: `A student has cancelled "${meetingTitle}". Reason: ${reason || 'Not specified'}`,
            payload: { meetingId: meeting.id, cancelledBy: 'STUDENT' }
        })

        // Role-specific bell
        await notifyUniversity(meeting.universityId, {
            title: 'Meeting Cancelled by Student',
            message: `${meetingTitle} was cancelled. Reason: ${reason || 'Not specified'}.`,
            type: 'WARNING',
            actionUrl: '/university/meetings'
        })

        await sendEmail({
            to: universityEmail,
            subject: `Meeting Cancelled by Student: ${meetingTitle}`,
            html: generateEmailHtml('Meeting Cancelled', `
                    <p>A student has cancelled their meeting request.</p>
                    <div class="info-box">
                        <div class="info-row"><span class="info-label">Meeting:</span> <span>${meetingTitle}</span></div>
                        <div class="info-row"><span class="info-label">Date:</span> <span>${new Date(meeting.startTime).toLocaleString()}</span></div>
                        <div class="info-row"><span class="info-label">Reason:</span> <span>${reason || 'Not specified'}</span></div>
                    </div>
                    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/university/meetings" class="btn">View Meetings</a></p>
                `)
        })

        revalidatePath('/student/meetings')
        revalidatePath('/university/meetings')
        return { success: true }
    } catch (error) {
        console.error('Failed to cancel meeting by student:')
        return { error: 'Failed to cancel meeting' }
    }
}

export async function getLiveUniversitySuggestion() {
    try {
        const now = new Date()
        const slot = await prisma.availabilitySlot.findFirst({
            where: {
                startTime: { lte: now },
                endTime: { gte: now },
                isBooked: false
            },
            include: {
                university: true,
                repUser: true
            },
            orderBy: {
                startTime: 'desc'
            }
        })

        if (!slot) return null

        return {
            hasLive: true,
            universityName: slot.university.institutionName,
            repName: slot.repUser.name || "A Representative",
            universityId: slot.universityId
        }
    } catch (error) {
        console.error("Error fetching live suggestion:")
        return null
    }
}

