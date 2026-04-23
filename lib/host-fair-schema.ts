import { z } from "zod";

// Shared name validator — letters (including Unicode/accented), spaces, hyphens, apostrophes.
// Rejects digits, lone punctuation, and strings that are only whitespace/symbols.
const nameValidator = z
    .string()
    .transform(val => val.trim())
    .refine(val => val.length >= 2, { message: 'Name must be at least 2 characters' })
    .refine(val => val.length <= 100, { message: 'Name must be 100 characters or fewer' })
    .refine(val => !/\d/.test(val), { message: 'Name must not contain numbers' })
    .refine(val => /^[\p{L}\p{M}'\-\s]+$/u.test(val), { message: 'Name must only contain letters, spaces, hyphens, or apostrophes' })
    .refine(val => !/^[\s'\-]+$/.test(val), { message: 'Please enter a valid name' })

const GENERIC_EMAIL_DOMAINS = [
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "ymail.com",
    "outlook.com", "hotmail.com", "live.com", "rediffmail.com",
    "protonmail.com", "mail.com", "icloud.com"
];

export const hostRequestSchema = z.object({
    // Institution Info
    institutionName: z.string().min(3, "Institution Name must be at least 3 characters"),
    institutionType: z.enum(["UNIVERSITY", "COLLEGE", "SCHOOL", "OTHER"] as const),
    venueId: z.string().min(1, "Please select an approved cluster"),
    proposedCircuitId: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    websiteUrl: z.string().url("Please enter a valid URL (e.g., https://university.edu.in)"),

    // Contact Info
    contactName: nameValidator,
    contactDesignation: z.string().min(2, "Designation is required"),
    contactEmail: z.string().email("Invalid email address")
        .refine((email) => {
            const domain = email.split("@")[1];
            return !GENERIC_EMAIL_DOMAINS.includes(domain.toLowerCase());
        }, {
            message: "Please use your official institutional email (no gmail, yahoo, etc.)"
        }),
    contactPhone: z.string().regex(/^(\+91[\-\s]?)?[0]?(91)?[6789]\d{9}$/, "Please enter a valid Indian phone number"),

    // Event Details
    preferredDateStart: z.date().refine((date) => {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 45); // 45 days from today
        return date >= minDate;
    }, {
        message: "Event date must be at least 45 days from today for planning."
    }),

    preferredDateEnd: z.date(),

    expectedStudentCount: z.enum(["50-100", "100-250", "250-500", "500+"] as const),

    preferredCountries: z.array(z.string()).min(1, "Select at least one preferred country"),
    fieldsOfStudy: z.array(z.string()).min(1, "Select at least one field of study"),
    additionalRequirements: z.string().optional(),
    _honeypot: z.string().optional(),
    turnstileToken: z.string().optional(),
}).refine((data) => data.preferredDateEnd >= data.preferredDateStart, {
    message: "End date must be after start date",
    path: ["preferredDateEnd"],
}).refine((data) => {
    if (data.venueId === "OUT_OF_NETWORK") return !!data.city && data.city.trim().length > 1;
    return true;
}, {
    message: "Please specify your city",
    path: ["city"],
}).refine((data) => {
    if (data.venueId === "OUT_OF_NETWORK") return !!data.proposedCircuitId;
    return true;
}, {
    message: "Please select the circuit you believe you fit in",
    path: ["proposedCircuitId"],
});

export type HostRequestFormValues = z.infer<typeof hostRequestSchema>;
