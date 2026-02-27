import { z } from 'zod'

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
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    country: z.string().min(2, 'Country is required'),
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
    fullName: z.string().min(2, 'Please enter your full name'),
    email: emailValidator,
    role: z.string().min(1, 'Please select your role'),
    country: z.string().min(2, 'Please select your country'),
    subject: z.string().min(2, 'Please enter a subject'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    phone: z.string().optional(),
    orgName: z.string().optional()
})

export const studentProfileSchema = z.object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    country: z.string().optional().default('India'),
    gender: z.string().min(1, 'Please select a gender'),
    ageGroup: z.string().optional(),
    phone: z.string().optional(),
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
    // Test scores
    greScore: z.string().optional(),
    gmatScore: z.string().optional(),
})
