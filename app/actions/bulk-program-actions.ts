'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgramImportData = {
    // Existing core fields
    programName: string
    degreeLevel: string
    fieldCategory: string
    tuitionFee: number
    durationMonths: number
    intakes: string | string[]
    // Optional existing
    stemDesignated?: boolean | string
    description?: string
    englishTests?: string | string[]
    minEnglishScore?: number | string
    // Standardised tests
    satRequired?: string
    satMinScore?: number | string
    satMaxScore?: number | string
    actRequired?: string
    actMinScore?: number | string
    actMaxScore?: number | string
    greRequired?: string
    greMinScore?: number | string
    greMaxScore?: number | string
    gmatRequired?: string
    gmatMinScore?: number | string
    gmatMaxScore?: number | string
    // Scholarships
    scholarshipAvail?: string
    scholarshipDetails?: string
    // Application requirements
    applicationFee?: number | string
    applicationFeeCur?: string
    appDeadlineType?: string
    appDeadlineDate?: string
    workExpYears?: number | string
    minGpa?: number | string
    minPercentage?: number | string
    // Program details
    coopAvailable?: boolean | string
    specialisations?: string | string[]
}

// ─── Bulk create ──────────────────────────────────────────────────────────────

export async function bulkCreatePrograms(
    universityId: string,
    data: ProgramImportData[]
): Promise<{ success?: boolean; count?: number; skipped?: number; error?: string }> {
    try {
        const user = await requireUser()
        if (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP') {
            return { error: 'Unauthorized' }
        }

        // UNIVERSITY: owns university via University.userId
        // UNIVERSITY_REP: linked via User.universityId (DB lookup needed)
        let uniProfile = await prisma.university.findUnique({ where: { userId: user.id } })

        if (!uniProfile && user.role === 'UNIVERSITY_REP') {
            const dbUser = await prisma.user.findUnique({
                where: { id: user.id },
                select: { universityId: true },
            })
            if (dbUser?.universityId) {
                uniProfile = await prisma.university.findUnique({ where: { id: dbUser.universityId } })
            }
        }

        if (!uniProfile || uniProfile.id !== universityId) return { error: 'Unauthorized' }

        // Pre-fetch existing names to detect duplicates
        const existing = await prisma.program.findMany({
            where: { universityId },
            select: { programName: true },
        })
        const existingNames = new Set(existing.map(p => p.programName.trim().toLowerCase()))

        let createdCount = 0
        let skippedCount = 0

        for (const item of data) {
            const nameLower = item.programName.trim().toLowerCase()
            if (!nameLower) { skippedCount++; continue }

            if (existingNames.has(nameLower)) {
                skippedCount++
                continue
            }

            // Normalise intakes → string[]
            const intakesArray: string[] = Array.isArray(item.intakes)
                ? item.intakes
                : item.intakes
                    ? String(item.intakes).split(',').map((s: string) => s.trim()).filter(Boolean)
                    : ['Fall 2025']

            await prisma.program.create({
                data: {
                    universityId,
                    programName: item.programName.trim(),
                    degreeLevel: item.degreeLevel || "Master's",
                    fieldCategory: mapFieldCategory(item.fieldCategory),
                    tuitionFee: isNaN(Number(item.tuitionFee)) ? 0 : Number(item.tuitionFee),
                    currency: item.applicationFeeCur || 'USD',
                    durationMonths: isNaN(Number(item.durationMonths)) ? 12 : Number(item.durationMonths),
                    intakes: intakesArray,
                    stemDesignated: parseBool(item.stemDesignated),
                    description: item.description?.trim() || null,
                    englishTests: parseStringArray(item.englishTests),
                    minEnglishScore: parseOptionalFloat(item.minEnglishScore),
                    // Standardised tests
                    satRequired: parseTestReq(item.satRequired),
                    satMinScore: parseOptionalInt(item.satMinScore),
                    satMaxScore: parseOptionalInt(item.satMaxScore),
                    actRequired: parseTestReq(item.actRequired),
                    actMinScore: parseOptionalInt(item.actMinScore),
                    actMaxScore: parseOptionalInt(item.actMaxScore),
                    greRequired: parseTestReq(item.greRequired),
                    greMinScore: parseOptionalInt(item.greMinScore),
                    greMaxScore: parseOptionalInt(item.greMaxScore),
                    gmatRequired: parseTestReq(item.gmatRequired),
                    gmatMinScore: parseOptionalInt(item.gmatMinScore),
                    gmatMaxScore: parseOptionalInt(item.gmatMaxScore),
                    // Scholarships
                    scholarshipAvail: parseScholarship(item.scholarshipAvail),
                    scholarshipDetails: item.scholarshipDetails?.trim() || null,
                    // Application requirements
                    applicationFee: parseOptionalFloat(item.applicationFee),
                    applicationFeeCur: item.applicationFeeCur?.trim() || 'USD',
                    appDeadlineType: parseDeadlineType(item.appDeadlineType),
                    appDeadlineDate: item.appDeadlineDate ? new Date(item.appDeadlineDate) : null,
                    workExpYears: parseOptionalInt(item.workExpYears),
                    minGpa: parseOptionalFloat(item.minGpa),
                    minPercentage: parseOptionalFloat(item.minPercentage),
                    // Program details
                    coopAvailable: parseBool(item.coopAvailable),
                    specialisations: parseStringArray(item.specialisations),
                },
            })
            existingNames.add(nameLower)
            createdCount++
        }

        revalidatePath('/university/dashboard')
        return { success: true, count: createdCount, skipped: skippedCount }

    } catch (error) {
        console.error('Bulk create error:')
        return { error: 'Failed to import programs' }
    }
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

function parseBool(val: unknown): boolean {
    if (typeof val === 'boolean') return val
    if (typeof val === 'string') return ['yes', 'true', '1'].includes(val.toLowerCase().trim())
    return false
}

function parseOptionalInt(val: unknown): number | null {
    const n = parseInt(String(val ?? ''))
    return isNaN(n) ? null : n
}

function parseOptionalFloat(val: unknown): number | null {
    const n = parseFloat(String(val ?? ''))
    return isNaN(n) ? null : n
}

function parseStringArray(val: unknown): string[] {
    if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean)
    if (typeof val === 'string' && val.trim()) {
        return val.split(',').map(s => s.trim()).filter(Boolean)
    }
    return []
}

function parseTestReq(val: unknown): string | null {
    if (!val) return null
    const upper = String(val).toUpperCase().trim()
    if (['REQUIRED', 'RECOMMENDED', 'NOT_REQUIRED'].includes(upper)) return upper
    if (upper === 'YES') return 'REQUIRED'
    if (upper === 'NO') return 'NOT_REQUIRED'
    return null
}

function parseDeadlineType(val: unknown): string | null {
    if (!val) return null
    const upper = String(val).toUpperCase().trim()
    return ['ROLLING', 'FIXED'].includes(upper) ? upper : null
}

function parseScholarship(val: unknown): string | null {
    if (!val) return null
    const upper = String(val).toUpperCase().trim()
    return ['YES', 'NO', 'DEPENDS'].includes(upper) ? upper : null
}

// ─── Field category fuzzy mapper ─────────────────────────────────────────────

function mapFieldCategory(input: string): string {
    if (!input) return 'Others'
    const lower = input.toLowerCase()
    if (lower.includes('comput') || lower.includes('soft') || lower === 'it' || lower.includes(' it ')) return 'Computer Science'
    if (lower.includes('engin')) return 'Engineering'
    if (lower.includes('busin') || lower.includes('mba') || lower.includes('manag')) return 'Business'
    if (lower.includes('data') || lower.includes(' ai') || lower.includes('intell') || lower.includes('machine')) return 'Data Science'
    if (lower.includes('health') || lower.includes('med') || lower.includes('nurs') || lower.includes('pharm')) return 'Health Sciences'
    if (lower.includes('soci') || lower.includes('psych') || lower.includes('sociol')) return 'Social Sciences'
    if (lower.includes('art') || lower.includes('hum') || lower.includes('music') || lower.includes('design')) return 'Arts & Humanities'
    if (lower.includes('law') || lower.includes('legal')) return 'Law'
    if (lower.includes('arch')) return 'Architecture'
    return 'Others'
}
