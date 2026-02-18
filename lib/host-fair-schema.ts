import { z } from "zod";

const GENERIC_EMAIL_DOMAINS = [
    "gmail.com", "googlemail.com", "yahoo.com", "yahoo.in", "ymail.com",
    "outlook.com", "hotmail.com", "live.com", "rediffmail.com",
    "protonmail.com", "mail.com", "icloud.com"
];

export const hostRequestSchema = z.object({
    // Institution Info
    institutionName: z.string().min(3, "Institution Name must be at least 3 characters"),
    institutionType: z.enum(["UNIVERSITY", "COLLEGE", "SCHOOL", "OTHER"], {
        required_error: "Please select an institution type"
    }),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    websiteUrl: z.string().url("Please enter a valid URL (e.g., https://university.edu.in)"),

    // Contact Info
    contactName: z.string().min(2, "Contact Name is required"),
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
    preferredDateStart: z.date({
        required_error: "Start date is required",
    }).refine((date) => {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 45); // 45 days from today
        return date >= minDate;
    }, {
        message: "Event date must be at least 45 days from today for planning."
    }),

    preferredDateEnd: z.date({
        required_error: "End date is required",
    }),

    expectedStudentCount: z.enum(["50-100", "100-250", "250-500", "500+"], {
        required_error: "Please select expected student count"
    }),

    preferredCountries: z.array(z.string()).min(1, "Select at least one preferred country"),
    fieldsOfStudy: z.array(z.string()).min(1, "Select at least one field of study"),
    additionalRequirements: z.string().optional(),
}).refine((data) => data.preferredDateEnd >= data.preferredDateStart, {
    message: "End date must be after start date",
    path: ["preferredDateEnd"],
});

export type HostRequestFormValues = z.infer<typeof hostRequestSchema>;
