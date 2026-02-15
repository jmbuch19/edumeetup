'use server'

import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'

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
        const where: any = {
            verificationStatus: 'VERIFIED'
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
                    fieldCategory: field as FieldCategory
                }
            }
        }

        // Execute Query
        const [total, universities] = await Promise.all([
            prisma.universityProfile.count({ where }),
            prisma.universityProfile.findMany({
                where,
                include: {
                    user: { select: { email: true } }, // Minimal user info
                    programs: {
                        select: { fieldCategory: true } // Fetch fields for display badges
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
