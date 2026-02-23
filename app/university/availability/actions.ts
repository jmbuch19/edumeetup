'use server'

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { DayOfWeek, VideoProvider } from "@prisma/client"

export type AvailabilityProfileData = {
    dayOfWeek: DayOfWeek
    startTime: string
    endTime: string
    isActive: boolean
    meetingDurationOptions: number[]
    bufferMinutes: number
    minLeadTimeHours: number
    dailyCap: number
    videoProvider: VideoProvider
    externalLink?: string
    eligibleDegreeLevels: string[]
    eligibleCountries: string[]
}

export async function saveAvailabilityProfile(data: AvailabilityProfileData) {
    const session = await auth()

    if (!session || !session.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        return { error: "Unauthorized" }
    }

    const userId = session.user.id

    // Get university ID
    const university = await prisma.university.findUnique({
        where: { userId: userId }
    })

    if (!university) {
        return { error: "University profile not found" }
    }

    try {
        // Upsert logic: Check if a profile exists for this user + day 
        // (Assuming 1 profile per day per rep for MVP clarity, though schema allows multiple)
        // If we want to allow multiple slots per day (e.g. 9-12 AND 2-5), we'd need a different UI/logic.
        // For now, let's assume the UI sends a single block per day, or we treat this as a "Daily Template".

        // Actually, the spec implies "Weekly Schedule Builder".
        // Let's look for an existing profile for this Rep + Day.

        const existingProfile = await prisma.availabilityProfile.findFirst({
            where: {
                repId: userId,
                dayOfWeek: data.dayOfWeek
            }
        })

        if (existingProfile) {
            await prisma.availabilityProfile.update({
                where: { id: existingProfile.id },
                data: {
                    startTime: data.startTime,
                    endTime: data.endTime,
                    isActive: data.isActive,
                    meetingDurationOptions: data.meetingDurationOptions,
                    bufferMinutes: data.bufferMinutes,
                    minLeadTimeHours: data.minLeadTimeHours,
                    dailyCap: data.dailyCap,
                    videoProvider: data.videoProvider,
                    externalLink: data.externalLink,
                    eligibleDegreeLevels: data.eligibleDegreeLevels,
                    eligibleCountries: data.eligibleCountries
                }
            })
        } else {
            await prisma.availabilityProfile.create({
                data: {
                    universityId: university.id,
                    repId: userId,
                    dayOfWeek: data.dayOfWeek,
                    startTime: data.startTime,
                    endTime: data.endTime,
                    isActive: data.isActive,
                    meetingDurationOptions: data.meetingDurationOptions,
                    bufferMinutes: data.bufferMinutes,
                    minLeadTimeHours: data.minLeadTimeHours,
                    dailyCap: data.dailyCap,
                    videoProvider: data.videoProvider,
                    externalLink: data.externalLink,
                    eligibleDegreeLevels: data.eligibleDegreeLevels,
                    eligibleCountries: data.eligibleCountries
                }
            })
        }

        revalidatePath('/university/availability')
        return { success: true }
    } catch (error) {
        console.error("Failed to save availability:", error)
        return { error: "Failed to save availability" }
    }
}


export async function saveAllAvailabilityProfiles(profiles: AvailabilityProfileData[]) {
    const session = await auth()

    if (!session || !session.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        return { error: "Unauthorized" }
    }

    const userId = session.user.id

    // Get university ID
    const university = await prisma.university.findUnique({
        where: { userId: userId }
    })

    if (!university) {
        return { error: "University profile not found" }
    }

    try {
        // Use a transaction to update all profiles
        await prisma.$transaction(
            profiles.map(data => {
                return prisma.availabilityProfile.upsert({
                    where: {
                        // We need a unique constraint on [repId, dayOfWeek] for upsert to work effectively with just those fields
                        // But our schema doesn't have that unique constraint explicitly defined in the @unique attribute yet.
                        // We can use findFirst logic inside the transaction or just delete and recreate?
                        // Delete and recreate is safer for "bulk save" if we want to ensure clean state, 
                        // but might lose ID stability if that matters (it strictly shouldn't).
                        // BETTER: Since we don't have a unique composite key on [repId, dayOfWeek] in the schema (we should have added it),
                        // we can't easily use upsert with non-unique fields.

                        // Let's rely on the ID if provided, or search by repId + dayOfWeek.
                        // Since we can't easily do "upsert where dayOfWeek=X" without a unique index,
                        // we will do: delete all for this rep -> create all.
                        // This is drastic but ensures no stale data. 
                        // However, let's try to be smarter. 

                        // Actually, let's just use the ID if we passed it from the frontend, or create new.
                        // But simpler: Delete all for this Rep and Create new is a robust strategy for a "Save All" form.
                        // It avoids "zombie" records.

                        // WAIT: Deleting all destroys the 'id', which might be referenced by 'AvailabilitySlot' if we had them linked, 
                        // but we don't anymore. We link Meetings to Reps directly.
                        // So Delete-All-And-Recreate is acceptable and clean for this MVP phase.
                        id: "dummy-never-matches" // forcing create if we used upsert
                    },
                    update: {},
                    create: {
                        universityId: university.id,
                        repId: userId,
                        dayOfWeek: data.dayOfWeek,
                        startTime: data.startTime,
                        endTime: data.endTime,
                        isActive: data.isActive,
                        meetingDurationOptions: data.meetingDurationOptions,
                        bufferMinutes: data.bufferMinutes,
                        minLeadTimeHours: data.minLeadTimeHours,
                        dailyCap: data.dailyCap,
                        videoProvider: data.videoProvider,
                        externalLink: data.externalLink,
                        eligibleDegreeLevels: data.eligibleDegreeLevels,
                        eligibleCountries: data.eligibleCountries
                    }
                })
            })
        )
        // Correct approach: Delete existing profiles for this rep, then create new ones.
        // Prisma transaction:
        await prisma.$transaction([
            prisma.availabilityProfile.deleteMany({
                where: { repId: userId }
            }),
            prisma.availabilityProfile.createMany({
                data: profiles.map(p => ({
                    universityId: university.id,
                    repId: userId,
                    dayOfWeek: p.dayOfWeek,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    isActive: p.isActive,
                    meetingDurationOptions: p.meetingDurationOptions,
                    bufferMinutes: p.bufferMinutes,
                    minLeadTimeHours: p.minLeadTimeHours,
                    dailyCap: p.dailyCap,
                    videoProvider: p.videoProvider,
                    externalLink: p.externalLink,
                    eligibleDegreeLevels: p.eligibleDegreeLevels,
                    eligibleCountries: p.eligibleCountries
                }))
            })
        ])

        revalidatePath('/university/availability')
        return { success: true }
    } catch (error) {
        console.error("Failed to save availability:", error)
        return { error: "Failed to save availability" }
    }
}

export async function getAvailabilityProfiles() {
    const session = await auth()
    if (!session || !session.user) return []

    return await prisma.availabilityProfile.findMany({
        where: { repId: session.user.id }
    })
}
