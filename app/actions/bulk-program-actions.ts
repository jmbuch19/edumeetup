'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { FieldCategory } from '@prisma/client'

// ...

export type ProgramImportData = {
    programName: string
    degreeLevel: string
    fieldCategory: string
    tuitionFee: number
    durationMonths: number
    intakes: string
}

export async function bulkCreatePrograms(universityId: string, data: ProgramImportData[]) {
    try {
        const user = await requireUser()
        if (user.role !== 'UNIVERSITY') return { error: "Unauthorized" }

        // Verify ownership
        const uniProfile = await prisma.university.findUnique({ where: { userId: user.id } })
        if (!uniProfile || uniProfile.id !== universityId) return { error: "Unauthorized" }

        let createdCount = 0

        for (const item of data) {
            await prisma.program.create({
                data: {
                    universityId,
                    programName: item.programName,
                    degreeLevel: item.degreeLevel,
                    fieldCategory: mapFieldCategory(item.fieldCategory),
                    tuitionFee: item.tuitionFee,
                    durationMonths: item.durationMonths,
                    intakes: item.intakes,
                    stemDesignated: false, // Default
                    currency: 'USD',
                    englishTests: null // Fixed: expect string or null, not array
                }
            })
            createdCount++
        }

        revalidatePath('/university/dashboard')
        return { success: true, count: createdCount }
    } catch (error) {
        console.error("Bulk create error:", error)
        return { error: "Failed to import programs" }
    }
}


function mapFieldCategory(input: string): FieldCategory {
    if (!input) return FieldCategory.Others
    const lower = input.toLowerCase()
    if (lower.includes("comput") || lower.includes("soft") || lower.includes("it")) return FieldCategory.Computer_Science
    if (lower.includes("engin")) return FieldCategory.Engineering
    if (lower.includes("busin") || lower.includes("mba") || lower.includes("manag")) return FieldCategory.Business
    if (lower.includes("data") || lower.includes("ai") || lower.includes("intell")) return FieldCategory.Data_Science
    if (lower.includes("health") || lower.includes("med")) return FieldCategory.Health_Sciences
    if (lower.includes("soci")) return FieldCategory.Social_Sciences
    if (lower.includes("art") || lower.includes("hum")) return FieldCategory.Arts_Humanities
    if (lower.includes("law")) return FieldCategory.Law
    if (lower.includes("arch")) return FieldCategory.Architecture
    return FieldCategory.Others
}
