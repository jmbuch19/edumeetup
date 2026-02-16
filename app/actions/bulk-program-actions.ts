'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { FieldCategory } from '@prisma/client'

// ...

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
