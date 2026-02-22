import { z } from 'zod'

export const passwordSchema = z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
})

export const registerStudentSchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
    fullName: z.string().min(2, "Name too short"),
    country: z.string().min(2),
    gender: z.string(),
    ageGroup: z.string(),
    // Optional/nullable fields
    phoneNumber: z.string().optional(),
    currentStatus: z.string().optional(),
    fieldOfInterest: z.string().optional(),
    preferredDegree: z.string().optional(),
    budgetRange: z.string().optional(),
    englishTestType: z.string().optional(),
    englishScore: z.string().optional(),
    preferredIntake: z.string().optional(),
    preferredCountries: z.string().optional(),
    // Honeypot
    website_url: z.string().max(0, "Spam detected").optional().or(z.literal(''))
})

export const registerUniversitySchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
    institutionName: z.string().min(2),
    country: z.string().min(2),
    website: z.string().url().optional().or(z.literal('')),
    contactEmail: z.string().email().optional().or(z.literal('')),
    // Honeypot
    website_url: z.string().max(0, "Spam detected").optional().or(z.literal(''))
})

export const createProgramSchema = z.object({
    programName: z.string().min(2, "Program name is required"),
    degreeLevel: z.string().min(1, "Degree level is required"),
    fieldCategory: z.string().min(1, "Field category is required"),
    tuitionFee: z.coerce.number().positive("Tuition fee must be positive"),
    durationMonths: z.coerce.number().int().positive("Duration must be positive"),
    intakes: z.string().min(1, "At least one intake is required"),
    currency: z.string().default('USD'),
    englishTests: z.string().optional(),
    minEnglishScore: z.string().optional(),
    stemDesignated: z.string().optional().transform(val => val === 'on' || val === 'true'),
})

export const createMeetingSchema = z.object({
    title: z.string().min(2, "Title is required"),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start time"),
    duration: z.coerce.number().int().min(15, "Minimum duration is 15 mins"),
    type: z.enum(["ONE_TO_ONE", "GROUP"]),
    joinUrl: z.string().url("Invalid meeting URL"),
    participants: z.array(z.string()).min(1, "At least one participant required"),
    availabilitySlotId: z.string().optional()
})

export const supportTicketSchema = z.object({
    category: z.string().min(1, "Category is required"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    message: z.string().min(10, "Message is too short")
})

export const publicInquirySchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email"),
    role: z.string().min(1, "Role is required"),
    country: z.string().min(2, "Country is required"),
    subject: z.string().min(2, "Subject is required"),
    message: z.string().min(10, "Message is too short"),
    phone: z.string().optional(),
    orgName: z.string().optional()
})

export const studentProfileSchema = z.object({
    fullName: z.string().min(2, "Name is required"),
    country: z.string().min(2, "Country is required"),
    gender: z.string().optional(),
    ageGroup: z.string().optional(),
    phoneNumber: z.string().optional(),

    // Preferences
    currentStatus: z.string().optional(),
    fieldOfInterest: z.string().optional(),
    preferredDegree: z.string().optional(),
    budgetRange: z.string().optional(),
    englishTestType: z.string().optional(),
    englishScore: z.string().optional(),
    preferredIntake: z.string().optional(),
    preferredCountries: z.string().optional(),
})
