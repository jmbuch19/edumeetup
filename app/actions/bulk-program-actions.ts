'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'


// ...

export type ProgramImportData = {
    programName: string
    degreeLevel: string
    fieldCategory: string
    tuitionFee: number
    durationMonths: number
    intakes: string[]
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
                    intakes: Array.isArray(item.intakes) ? item.intakes : [],
                    stemDesignated: false,
                    currency: 'USD',
                    englishTests: []
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


function mapFieldCategory(input: string): string {
    if (!input) return "Others"
    const lower = input.toLowerCase()
    if (lower.includes("comput") || lower.includes("soft") || lower.includes("it")) return "Computer Science"
    if (lower.includes("engin")) return "Engineering"
    if (lower.includes("busin") || lower.includes("mba") || lower.includes("manag")) return "Business"
    if (lower.includes("data") || lower.includes("ai") || lower.includes("intell")) return "Data Science"
    if (lower.includes("health") || lower.includes("med")) return "Health Sciences"
    if (lower.includes("soci")) return "Social Sciences"
    if (lower.includes("art") || lower.includes("hum")) return "Arts & Humanities"
    if (lower.includes("law")) return "Law"
    if (lower.includes("arch")) return "Architecture"
    return "Others"
}
