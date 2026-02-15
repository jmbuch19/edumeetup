import { z } from 'zod'

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required")
})

export const registerStudentSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
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
    password: z.string().min(8),
    institutionName: z.string().min(2),
    country: z.string().min(2),
    website: z.string().url().optional().or(z.literal('')),
    contactEmail: z.string().email().optional().or(z.literal('')),
    // Honeypot
    website_url: z.string().max(0, "Spam detected").optional().or(z.literal(''))
})
