import { z } from 'zod'

// ── Name validation ────────────────────────────────────────────────────────────
// Accepts letters (including accented/Unicode), spaces, hyphens, and apostrophes.
// Rejects: digits, leading/trailing spaces, lone punctuation, obvious spam.
// Real names contain vowels; acronym-style inputs ("TBH", "LRS") get rejected.
const VOWEL_CHAR_RE = /[aeiouyàáâäãåæèéêëìíîïòóôõöøœùúûüÿ]/gi
const LETTER_RE = /\p{L}/gu

export const nameValidator = z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length >= 2, { message: 'Name must be at least 2 characters' })
    .refine(val => val.length <= 100, { message: 'Name must be 100 characters or fewer' })
    .refine(
        val => !/\d/.test(val),
        { message: 'Name must not contain numbers' }
    )
    .refine(
        val => /^[\p{L}\p{M}'\-\s]+$/u.test(val),
        { message: 'Name must only contain letters, spaces, hyphens, or apostrophes' }
    )
    .refine(
        val => !/^[\s'\-]+$/.test(val),
        { message: 'Please enter a valid name' }
    )
    .refine(
        val => {
            const letters = val.match(LETTER_RE) ?? []
            if (letters.length === 0) return false
            const vowels = val.match(VOWEL_CHAR_RE) ?? []
            return (vowels.length / letters.length) >= 0.15
        },
        { message: 'Please enter a real name' }
    )

// ── Common email domain typos ──────────────────────────────────────────────────
// These are valid RFC-5322 formats that pass .email(), but are almost certainly typos.
export const COMMON_TYPO_DOMAINS: Record<string, string> = {
    // Gmail typos
    'gamil.com': 'gmail.com',
    'gmial.com': 'gmail.com',
    'gmali.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmail.con': 'gmail.com',
    'gmail.cpm': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail.cm': 'gmail.com',
    'gmaill.con': 'gmail.com',
    // Yahoo typos
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    'yhaoo.com': 'yahoo.com',
    'yahoo.con': 'yahoo.com',
    'yahooo.in': 'yahoo.in',
    // Hotmail typos
    'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com',
    'htmail.com': 'hotmail.com',
    'hotmali.com': 'hotmail.com',
    // Outlook typos
    'outlok.com': 'outlook.com',
    'outloo.com': 'outlook.com',
    'outlookk.com': 'outlook.com',
    // Rediffmail (common in India)
    'redifmail.com': 'rediffmail.com',
    'reddiffmail.com': 'rediffmail.com',
}

// ── Shared email field builder ─────────────────────────────────────────────────
// Normalises to lowercase, trims whitespace, and rejects known typo domains.
const emailValidator = z.string()
    .email('Please enter a valid email address')
    .transform(val => val.trim().toLowerCase())
    .refine(
        val => !COMMON_TYPO_DOMAINS[val.split('@')[1] ?? ''],
        { message: 'Looks like a typo in the email domain. Please double-check your email address.' }
    )

// Alias for institutional / university emails (same logic, different label)
const institutionalEmailValidator = z.string()
    .email('Please enter a valid institutional email address')
    .transform(val => val.trim().toLowerCase())
    .refine(
        val => !COMMON_TYPO_DOMAINS[val.split('@')[1] ?? ''],
        { message: 'Looks like a typo in the email domain. Please double-check your email address.' }
    )

// ── Schemas ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
    email: emailValidator,
})

export const registerStudentSchema = z.object({
    email: emailValidator,
    fullName: nameValidator,
    country: z.string().optional().default('India'),
    gender: z.string().min(1, 'Please select a gender'),
    ageGroup: z.string().min(1, 'Please select an age group'),
    city: z.string().min(2, 'Please enter your city'),
    pincode: z.string().min(4, 'PIN Code must be at least 4 digits'),
    // Optional/nullable fields
    phoneNumber: z.string().optional(),
    whatsappNumber: z.string().optional(),
    currentStatus: z.string().optional(),
    fieldOfInterest: z.string().optional(),
    preferredDegree: z.string().optional(),
    budgetRange: z.string().optional(),
    englishTestType: z.string().optional(),
    englishScore: z.string().optional(),
    preferredIntake: z.string().optional(),
    preferredCountries: z.string().optional(),
    // GRE / GMAT (conditional, not mandatory)
    greTaken: z.string().optional(),
    greScore: z.string().optional(),
    gmatTaken: z.string().optional(),
    gmatScore: z.string().optional(),
    // SAT / ACT (conditional, for UG applicants)
    satTaken: z.string().optional(),
    satScore: z.string().optional(),
    actTaken: z.string().optional(),
    actScore: z.string().optional(),
    // Honeypot
    website_url: z.string().max(0, 'Spam detected').optional().or(z.literal(''))
})

export const registerUniversitySchema = z.object({
    email: institutionalEmailValidator,
    institutionName: z.string().min(2, 'Institution name must be at least 2 characters'),
    country: z.string().min(2, 'Country is required'),
    website: z.string().url('Please enter a valid URL (e.g. https://university.edu)').optional().or(z.literal('')),
    contactEmail: z.string().email('Please enter a valid contact email').transform(v => v.trim().toLowerCase()).optional().or(z.literal('')),
    // Honeypot
    website_url: z.string().max(0, 'Spam detected').optional().or(z.literal(''))
})

export const createProgramSchema = z.object({
    programName: z.string().min(2, 'Program name is required'),
    degreeLevel: z.string().min(1, 'Please select a degree level'),
    fieldCategory: z.string().min(1, 'Please select a field category'),
    tuitionFee: z.coerce.number().positive('Tuition fee must be a positive number'),
    durationMonths: z.coerce.number().int().positive('Duration must be a positive number of months'),
    intakes: z.array(z.string()).min(1, 'Please add at least one intake period'),
    currency: z.string().default('USD'),
    englishTests: z.array(z.string()).optional().default([]),
    minEnglishScore: z.string().optional(),
    stemDesignated: z.string().optional().transform(val => val === 'on' || val === 'true'),
})

export const createMeetingSchema = z.object({
    title: z.string().min(2, 'Meeting title is required'),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Please select a valid start time'),
    duration: z.coerce.number().int().min(15, 'Minimum meeting duration is 15 minutes'),
    type: z.enum(['ONE_TO_ONE', 'GROUP']),
    joinUrl: z.string().url('Please enter a valid meeting URL (e.g. https://meet.google.com/...)'),
    participants: z.array(z.string()).min(1, 'Please add at least one participant'),
    availabilitySlotId: z.string().optional(),
    agenda: z.string().optional()
})

export const supportTicketSchema = z.object({
    category: z.string().min(1, 'Please select a category'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH'] as const, {
        error: 'Please select a priority level',
    }),
    message: z.string().min(10, 'Please describe your issue in at least 10 characters')
})

export const publicInquirySchema = z.object({
    fullName: nameValidator,
    email: emailValidator,
    role: z.string().min(1, 'Please select your role'),
    country: z.string().min(2, 'Please select your country'),
    subject: z.string().min(2, 'Please enter a subject'),
    message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message is too long'),
    phone: z.string().max(30, 'Phone number is too long').optional(),
    orgName: z.string().max(200, 'Organization name is too long').optional(),
    // Honeypot — real users leave this blank, bots fill it
    website_url: z.string().max(0, 'Spam detected').optional().or(z.literal(''))
})

export const pdoRegistrationSchema = z.object({
    fullName: nameValidator,
    email: emailValidator,
    phone: z.string().min(7, 'Please enter a valid phone number').max(30, 'Phone number is too long'),
    universityName: z.string().min(2, 'Please enter your admitted university name').max(200, 'University name is too long'),
    programName: z.string().min(2, 'Please enter your course of study').max(200, 'Program name is too long'),
    degreeLevel: z.string().min(1, 'Please select your degree level'),
    intakeSemester: z.string().min(1, 'Please select your intake semester'),
    visaStatus: z.string().min(1, 'Please select your visa status'),
    city: z.string().min(2, 'Please enter your city').max(100, 'City name is too long'),
    questions: z.string().max(2000, 'Questions field is too long').optional(),
    // Honeypot — real users leave this blank, bots fill it
    website_url: z.string().max(0, 'Spam detected').optional().or(z.literal(''))
})

export const studentProfileSchema = z.object({
    fullName: nameValidator,
    country: z.string().optional().default('India'),
    gender: z.string().min(1, 'Please select a gender'),
    ageGroup: z.string().optional(),
    phone: z.string().min(7, 'Please enter a valid phone number with country code').optional().or(z.literal('')),
    city: z.string().min(2, 'Please enter your city'),
    pincode: z.string().min(4, 'PIN Code must be at least 4 digits'),
    // Preferences
    currentStatus: z.string().optional(),
    fieldOfInterest: z.string().optional(),
    preferredDegree: z.string().optional(),
    budgetRange: z.string().optional(),
    englishTestType: z.string().optional(),
    englishScore: z.string().optional(),
    preferredIntake: z.string().optional(),
    preferredCountries: z.string().optional(),
    // Contact updates
    whatsappNumber: z.string().optional(),
    // WhatsApp opt-in consent (checkbox sends "true" string when checked, omitted when unchecked)
    whatsappConsent: z.string().optional().transform(val => val === 'true'),
    // Test scores
    greScore: z.string().optional(),
    gmatScore: z.string().optional(),
    satScore: z.string().optional(),
    actScore: z.string().optional(),
})

// ─── Student Interaction Schemas ──────────────────────────────────────────────

export const studentInteractionSchema = z.object({
    universityId: z.string().min(1, 'University ID is required'),
    programId: z.string().optional().nullable(),
})

export const studentQuestionSchema = studentInteractionSchema.extend({
    message: z.string().min(1, 'Message is required').max(2000, 'Message is too long')
})

// ─── Alumni Schemas ────────────────────────────────────────────────────────────

export const ALUMNI_AVAILABLE_FOR_OPTIONS = [
    { value: 'EMAIL_WHATSAPP',  label: 'Yes, I can answer queries over email/WhatsApp' },
    { value: 'VIDEO_CALL',      label: "I'd be happy to do a short video call or webinar" },
    { value: 'RECORD_VIDEO',    label: 'I can record a short video/message about my experience' },
    { value: 'WRITTEN_TIPS',    label: 'I can share written tips/stories' },
    { value: 'NOT_NOW',         label: 'Not at this time' },
] as const

export const ALUMNI_HELP_TOPIC_OPTIONS = [
    { value: 'CHOOSING_UNIVERSITY', label: 'Choosing the right university/program' },
    { value: 'FIRST_SEMESTER',      label: 'First-semester experience' },
    { value: 'INTERNSHIPS_JOBS',    label: 'Internships & job search' },
    { value: 'LIFE_IN_US',          label: 'Life in the US (housing, culture, budgeting, etc.)' },
    { value: 'OTHER',               label: 'Other' },
] as const

export const ALUMNI_STATUS_OPTIONS = [
    { value: 'STUDENT_CURRENTLY', label: 'Student (currently enrolled)' },
    { value: 'OPT_CPT',          label: 'Working (OPT/CPT)' },
    { value: 'H1B_OTHER',        label: 'H1B/Other Work Visa' },
    { value: 'FURTHER_STUDIES',  label: 'Pursuing Further Studies (e.g. PhD)' },
    { value: 'OTHER',            label: 'Other' },
] as const

export const registerAlumniSchema = z.object({
    // Step 1
    whatsapp:       z.string().optional(),
    yearWentToUSA:  z.coerce.number().int().min(1990).max(new Date().getFullYear()).optional(),
    // Step 2
    usUniversityName: z.string().min(2, 'University name is required'),
    usProgram:        z.string().min(2, 'Degree program is required'),
    usDegreeLevel:    z.string().optional(),
    usCity:           z.string().optional(),
    alumniStatus:     z.enum(['STUDENT_CURRENTLY', 'OPT_CPT', 'H1B_OTHER', 'FURTHER_STUDIES', 'OTHER']),
    // Step 3
    availableFor:     z.array(z.string()).min(1, 'Please select at least one option'),
    helpTopics:       z.array(z.string()).default([]),
    weeklyCapacity:   z.coerce.number().int().min(1).max(20).optional(),
    availabilityNote: z.string().optional(),
    // Step 4
    linkedinUrl:        z.string().url('Please enter a valid LinkedIn URL').optional().or(z.literal('')),
    inspirationMessage: z.string().max(1000, 'Message is too long').optional(),
    // Step 5 — Consent
    consentDataSharing: z.boolean().refine(v => v === true, 'You must consent to data sharing to appear in the directory'),
    showWhatsapp:       z.boolean().default(false),
    showLinkedin:       z.boolean().default(true),
    showUsCity:         z.boolean().default(true),
    // Optional invite token
    inviteToken:        z.string().optional(),
})

export const alumniConnectRequestSchema = z.object({
    alumniId: z.string().min(1),
    type:     z.enum(['EMAIL', 'MEETING', 'LINKEDIN']),
    message:  z.string().min(10, 'Please write at least 10 characters').max(1000, 'Message is too long'),
})

