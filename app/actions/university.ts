'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export type SearchParams = {
    query?: string
    country?: string
    field?: string
    page?: number
}

export async function searchUniversities({
    query,
    country,
    field,
    page = 1
}: SearchParams) {
    const pageSize = 9
    const skip = (page - 1) * pageSize

    try {
        const where: Prisma.UniversityWhereInput = {
            verificationStatus: 'VERIFIED',
            isPublic: true,
        }

        // 1. Text Search (Name or Location)
        if (query) {
            where.OR = [
                { institutionName: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
                { country: { contains: query, mode: 'insensitive' } },
            ]
        }

        // 2. Country Filter
        if (country && country !== 'All') {
            where.country = country
        }

        // 3. Field Filter (Complex relation query)
        if (field && field !== 'All') {
            where.programs = {
                some: {
                    fieldCategory: field
                }
            }
        }

        // Execute Query
        const [total, universities] = await Promise.all([
            prisma.university.count({ where }),
            prisma.university.findMany({
                where,
                include: {
                    user: { select: { email: true } }, // Minimal user info
                    programs: {
                        select: { fieldCategory: true, programName: true, degreeLevel: true } // Fetch fields for display badges
                    }
                },
                skip,
                take: pageSize,
                orderBy: { institutionName: 'asc' }
            })
        ])

        return {
            universities,
            totalPages: Math.ceil(total / pageSize),
            currentPage: page,
            totalCount: total
        }

    } catch (error) {
        console.error("Search Error:", error)
        return { universities: [], totalPages: 0, currentPage: 1, totalCount: 0, error: "Failed to fetch universities" }
    }
}

// ── Grouped view data ──────────────────────────────────────────────────────────
// Returns parent institutions (with schools nested) + standalone universities.
// Used for the "By Institution" toggle on the /universities browse page.
export async function getGroupedUniversities() {
    try {
        const [parents, standalones] = await Promise.all([
            // Parent universities with their verified schools + program previews
            prisma.university.findMany({
                where: { isParent: true, verificationStatus: 'VERIFIED', isPublic: true },
                include: {
                    schools: {
                        where: { verificationStatus: 'VERIFIED', isPublic: true },
                        include: {
                            programs: {
                                select: { id: true, programName: true, degreeLevel: true, fieldCategory: true },
                                take: 5,
                            }
                        },
                        orderBy: { institutionName: 'asc' },
                    },
                    programs: { select: { id: true } }, // just for count
                },
                orderBy: { institutionName: 'asc' },
            }),
            // Standalone universities — not a parent, not a school under a parent
            prisma.university.findMany({
                where: {
                    isParent: false,
                    parentId: null,
                    verificationStatus: 'VERIFIED',
                    isPublic: true,
                },
                include: {
                    programs: {
                        select: { fieldCategory: true, programName: true, degreeLevel: true }
                    }
                },
                orderBy: { institutionName: 'asc' },
            }),
        ])

        return { parents, standalones }
    } catch (error) {
        console.error('[getGroupedUniversities] error:', error)
        return { parents: [], standalones: [] }
    }
}
