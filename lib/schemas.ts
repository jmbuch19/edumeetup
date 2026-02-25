import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
})

export const registerStudentSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    country: z.string().min(2, "Country is required"),
    gender: z.string().min(1, "Please select a gender"),
    ageGroup: z.string().min(1, "Please select an age group"),
    city: z.string().min(2, "Please enter your city"),
    pincode: z.string().min(4, "PIN Code must be at least 4 digits"),
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
    website_url: z.string().max(0, "Spam detected").optional().or(z.literal(''))
})

export const registerUniversitySchema = z.object({
    email: z.string().email("Please enter a valid institutional email address"),
    institutionName: z.string().min(2, "Institution name must be at least 2 characters"),
    country: z.string().min(2, "Country is required"),
    website: z.string().url("Please enter a valid URL (e.g. https://university.edu)").optional().or(z.literal('')),
    contactEmail: z.string().email("Please enter a valid contact email").optional().or(z.literal('')),
    // Honeypot
    website_url: z.string().max(0, "Spam detected").optional().or(z.literal(''))
})

export const createProgramSchema = z.object({
    programName: z.string().min(2, "Program name is required"),
    degreeLevel: z.string().min(1, "Please select a degree level"),
    fieldCategory: z.string().min(1, "Please select a field category"),
    tuitionFee: z.coerce.number().positive("Tuition fee must be a positive number"),
    durationMonths: z.coerce.number().int().positive("Duration must be a positive number of months"),
    intakes: z.array(z.string()).min(1, "Please add at least one intake period"),
    currency: z.string().default('USD'),
    englishTests: z.array(z.string()).optional().default([]),
    minEnglishScore: z.string().optional(),
    stemDesignated: z.string().optional().transform(val => val === 'on' || val === 'true'),
})

export const createMeetingSchema = z.object({
    title: z.string().min(2, "Meeting title is required"),
    startTime: z.string().refine((val) => !isNaN(Date.parse(val)), "Please select a valid start time"),
    duration: z.coerce.number().int().min(15, "Minimum meeting duration is 15 minutes"),
    type: z.enum(["ONE_TO_ONE", "GROUP"]),
    joinUrl: z.string().url("Please enter a valid meeting URL (e.g. https://meet.google.com/...)"),
    participants: z.array(z.string()).min(1, "Please add at least one participant"),
    availabilitySlotId: z.string().optional(),
    agenda: z.string().optional()
})

export const supportTicketSchema = z.object({
    category: z.string().min(1, "Please select a category"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"] as const, {
        error: "Please select a priority level",
    }),
    message: z.string().min(10, "Please describe your issue in at least 10 characters")
})

export const publicInquirySchema = z.object({
    fullName: z.string().min(2, "Please enter your full name"),
    email: z.string().email("Please enter a valid email address"),
    role: z.string().min(1, "Please select your role"),
    country: z.string().min(2, "Please select your country"),
    subject: z.string().min(2, "Please enter a subject"),
    message: z.string().min(10, "Message must be at least 10 characters"),
    phone: z.string().optional(),
    orgName: z.string().optional()
})

export const studentProfileSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    country: z.string().optional().default('India'),
    gender: z.string().min(1, "Please select a gender"),
    ageGroup: z.string().optional(),
    phone: z.string().optional(),
    city: z.string().min(2, "Please enter your city"),
    pincode: z.string().min(4, "PIN Code must be at least 4 digits"),

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
