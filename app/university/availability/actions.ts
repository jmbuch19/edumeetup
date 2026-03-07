'use server'

import { requireUniversityUser } from "@/lib/auth/requireAuth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DayOfWeek, VideoProvider } from "@prisma/client"
import { z } from "zod"

// ─── HH:MM Normalizer ─────────────────────────────────────────────────────────
// Guarantees stored startTime/endTime are always zero-padded "HH:MM" in 24h format.
// This is the format discipline that makes lexicographic comparison safe in the
// booking action. It must be applied on EVERY write path, never trusted from input.
//
// Accepts: "9:00", "09:00", "9:5", "9:05"
// Rejects: anything that isn't parseable as HH:MM 24h

function normalizeHHMM(raw: string): string {
    const match = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
    if (!match) throw new Error(`Invalid time format: "${raw}" — expected HH:MM`)
    const h = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    if (h < 0 || h > 23) throw new Error(`Hour out of range in "${raw}"`)
    if (m < 0 || m > 59) throw new Error(`Minute out of range in "${raw}"`)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Input Validation ─────────────────────────────────────────────────────────

const HHMM_REGEX = /^\d{1,2}:\d{2}$/

const profileSchema = z.object({
    dayOfWeek: z.nativeEnum(DayOfWeek),
    startTime: z.string().regex(HHMM_REGEX, 'Expected HH:MM format'),
    endTime: z.string().regex(HHMM_REGEX, 'Expected HH:MM format'),
    isActive: z.boolean(),
    meetingDurationOptions: z.array(z.number().int().positive()).min(1),
    bufferMinutes: z.number().int().min(0).max(120),
    minLeadTimeHours: z.number().int().min(0).max(168),
    dailyCap: z.number().int().min(1).max(20),
    videoProvider: z.nativeEnum(VideoProvider),
    externalLink: z.string().url().optional().or(z.literal('')),
    eligibleDegreeLevels: z.array(z.string()),
    eligibleCountries: z.array(z.string()),
    // Canonical scheduling timezone for this profile (IANA format)
    timezone: z.string().min(1).max(100).refine(
        tz => { try { Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false } },
        { message: 'Invalid IANA timezone' }
    ).default('UTC'),
})

export type AvailabilityProfileData = z.infer<typeof profileSchema>

// ─── Shared: normalize and validate times ────────────────────────────────────

function normalizeTimes(data: AvailabilityProfileData) {
    const startTime = normalizeHHMM(data.startTime)
    const endTime = normalizeHHMM(data.endTime)
    if (startTime >= endTime) throw new Error(`startTime (${startTime}) must be before endTime (${endTime})`)
    return { ...data, startTime, endTime }
}

// ─── Shared: look up university for current user ──────────────────────────────

async function getUniversityForSession(userId: string, role: string) {
    if (role === 'UNIVERSITY') {
        return prisma.university.findUnique({ where: { userId } })
    }
    if (role === 'UNIVERSITY_REP') {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { representedUniversity: { select: { id: true } } },
        })
        if (!user?.representedUniversity) return null
        return prisma.university.findUnique({ where: { id: user.representedUniversity.id } })
    }
    return null
}

// ─── Save single profile ─────────────────────────────────────────────────────

export async function saveAvailabilityProfile(rawData: AvailabilityProfileData) {
    const session = await requireUniversityUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    const parsed = profileSchema.safeParse(rawData)
    if (!parsed.success) return { error: "Invalid data", details: parsed.error.flatten() }

    let data: AvailabilityProfileData
    try {
        data = normalizeTimes(parsed.data)
    } catch (e: any) {
        return { error: e.message }
    }

    const university = await getUniversityForSession(session.user.id, session.user.role)
    if (!university) return { error: "University profile not found" }

    try {
        const existing = await prisma.availabilityProfile.findFirst({
            where: { repId: session.user.id, dayOfWeek: data.dayOfWeek },
        })

        if (existing) {
            await prisma.availabilityProfile.update({
                where: { id: existing.id },
                data: {
                    startTime: data.startTime,   // ← normalized
                    endTime: data.endTime,     // ← normalized
                    isActive: data.isActive,
                    timezone: data.timezone,
                    meetingDurationOptions: data.meetingDurationOptions,
                    bufferMinutes: data.bufferMinutes,
                    minLeadTimeHours: data.minLeadTimeHours,
                    dailyCap: data.dailyCap,
                    videoProvider: data.videoProvider,
                    externalLink: data.externalLink,
                    eligibleDegreeLevels: data.eligibleDegreeLevels,
                    eligibleCountries: data.eligibleCountries,
                },
            })
        } else {
            await prisma.availabilityProfile.create({
                data: {
                    universityId: university.id,
                    repId: session.user.id,
                    dayOfWeek: data.dayOfWeek,
                    startTime: data.startTime,   // ← normalized
                    endTime: data.endTime,     // ← normalized
                    isActive: data.isActive,
                    timezone: data.timezone,
                    meetingDurationOptions: data.meetingDurationOptions,
                    bufferMinutes: data.bufferMinutes,
                    minLeadTimeHours: data.minLeadTimeHours,
                    dailyCap: data.dailyCap,
                    videoProvider: data.videoProvider,
                    externalLink: data.externalLink,
                    eligibleDegreeLevels: data.eligibleDegreeLevels,
                    eligibleCountries: data.eligibleCountries,
                },
            })
        }

        revalidatePath('/university/availability')
        return { success: true }
    } catch (error) {
        console.error("Failed to save availability:", error)
        return { error: "Failed to save availability" }
    }
}

// ─── Save all profiles (bulk replace) ────────────────────────────────────────

export async function saveAllAvailabilityProfiles(rawProfiles: AvailabilityProfileData[]) {
    const session = await requireUniversityUser().catch(() => null)
    if (!session) return { error: "Unauthorized" }

    // Validate and normalize every profile before touching the DB
    const normalized: AvailabilityProfileData[] = []
    for (const raw of rawProfiles) {
        const parsed = profileSchema.safeParse(raw)
        if (!parsed.success) {
            return { error: `Invalid profile for ${raw.dayOfWeek}`, details: parsed.error.flatten() }
        }
        try {
            normalized.push(normalizeTimes(parsed.data))
        } catch (e: any) {
            return { error: `${raw.dayOfWeek}: ${e.message}` }
        }
    }

    const university = await getUniversityForSession(session.user.id, session.user.role)
    if (!university) return { error: "University profile not found" }

    try {
        // Delete-then-recreate is the correct bulk-replace pattern.
        // Avoids zombie records and the non-unique upsert complexity.
        await prisma.$transaction([
            prisma.availabilityProfile.deleteMany({
                where: { repId: session.user.id },
            }),
            prisma.availabilityProfile.createMany({
                data: normalized.map(p => ({
                    universityId: university.id,
                    repId: session.user.id,
                    dayOfWeek: p.dayOfWeek,
                    startTime: p.startTime,   // ← normalized
                    endTime: p.endTime,     // ← normalized
                    isActive: p.isActive,
                    timezone: p.timezone,
                    meetingDurationOptions: p.meetingDurationOptions,
                    bufferMinutes: p.bufferMinutes,
                    minLeadTimeHours: p.minLeadTimeHours,
                    dailyCap: p.dailyCap,
                    videoProvider: p.videoProvider,
                    externalLink: p.externalLink,
                    eligibleDegreeLevels: p.eligibleDegreeLevels,
                    eligibleCountries: p.eligibleCountries,
                })),
            }),
        ])

        revalidatePath('/university/availability')
        return { success: true }
    } catch (error) {
        console.error("Failed to save availability profiles:", error)
        return { error: "Failed to save availability" }
    }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAvailabilityProfiles() {
    const session = await requireUniversityUser().catch(() => null)
    if (!session) return []

    return prisma.availabilityProfile.findMany({
        where: { repId: session.user.id },
    })
}
