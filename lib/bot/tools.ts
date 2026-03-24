// lib/bot/tools.ts
// Gemini function-calling tool definitions and handlers.
// Four tools: internal search, student profile, global search, upcoming fairs.

import { prisma } from '@/lib/prisma'

// ─── Tool Definitions (sent to Gemini) ───────────────────────────────────────

export const toolDefinitions = [
    {
        name: 'searchInternalUniversities',
        description: 'Search EdUmeetup\'s verified partner universities by field of study, country, degree level, or budget. Always call this FIRST before any global search.',
        parameters: {
            type: 'object',
            properties: {
                fieldOfStudy: { type: 'string', description: 'e.g. "Computer Science", "Business", "Engineering"' },
                country: { type: 'string', description: 'e.g. "Canada", "United Kingdom", "Australia"' },
                degreeLevel: { type: 'string', description: 'e.g. "Masters", "Bachelor", "PhD"' },
                maxBudgetUSD: { type: 'number', description: 'Maximum annual tuition in USD' },
            },
            required: [],
        },
    },
    {
        name: 'getStudentProfile',
        description: 'Retrieve the logged-in student\'s profile to personalise recommendations based on their field, budget, English scores, and preferred countries.',
        parameters: {
            type: 'object',
            properties: {
                studentId: { type: 'string', description: 'The student\'s ID from the database' },
            },
            required: ['studentId'],
        },
    },
    {
        name: 'searchGlobalUniversities',
        description: 'FALLBACK ONLY — use this ONLY if searchInternalUniversities returns zero results. Searches global education sources for universities outside the EdUmeetup platform. Results must be labeled as external recommendations.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query e.g. "top universities for Computer Science in Canada"' },
            },
            required: ['query'],
        },
    },
    {
        name: 'getUpcomingFairs',
        description: 'Get upcoming EdUmeetup campus fairs that a student can attend.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
]

// ─── Tool Handlers (call these when Gemini requests a tool) ──────────────────

export async function searchInternalUniversities(args: {
    fieldOfStudy?: string
    country?: string
    degreeLevel?: string
    maxBudgetUSD?: number
}) {
    try {
        const universities = await prisma.university.findMany({
            where: {
                verificationStatus: 'VERIFIED',
                isPublic: true,
                ...(args.country ? { country: { contains: args.country, mode: 'insensitive' } } : {}),
                programList: {
                    some: {
                        status: 'ACTIVE',
                        ...(args.fieldOfStudy ? { fieldCategory: { contains: args.fieldOfStudy, mode: 'insensitive' } } : {}),
                        ...(args.degreeLevel ? { degreeLevel: { contains: args.degreeLevel, mode: 'insensitive' } } : {}),
                        ...(args.maxBudgetUSD ? { tuitionFee: { lte: args.maxBudgetUSD } } : {}),
                    }
                }
            },
            select: {
                id: true,
                institutionName: true,
                country: true,
                city: true,
                website: true,
                verificationStatus: true,
                scholarshipsAvailable: true,
                about: true,
                logo: true,
                programList: {
                    where: {
                        status: 'ACTIVE',
                        ...(args.fieldOfStudy ? { fieldCategory: { contains: args.fieldOfStudy, mode: 'insensitive' } } : {}),
                        ...(args.degreeLevel ? { degreeLevel: { contains: args.degreeLevel, mode: 'insensitive' } } : {}),
                        ...(args.maxBudgetUSD ? { tuitionFee: { lte: args.maxBudgetUSD } } : {}),
                    },
                    select: {
                        id: true,
                        programName: true,
                        degreeLevel: true,
                        tuitionFee: true,
                        currency: true,
                        durationMonths: true,
                        intakes: true,
                        stemDesignated: true,
                        fieldCategory: true,
                    },
                    take: 3,
                }
            },
            take: 6,
        })

        if (universities.length === 0) {
            return { found: false, message: 'No verified partner universities found matching these criteria. Suggest using global search.' }
        }

        return {
            found: true,
            source: 'INTERNAL',
            count: universities.length,
            universities: universities.map((u: any) => ({
                id: u.id,
                name: u.institutionName,
                country: u.country,
                city: u.city,
                website: u.website,
                isVerified: u.verificationStatus === 'VERIFIED',
                scholarships: u.scholarshipsAvailable,
                about: u.about?.slice(0, 200),
                logo: u.logo,
                programs: u.programList,
                profileUrl: `/universities/${u.id}`,
                bookMeetingUrl: `/universities/${u.id}`,
            }))
        }
    } catch (error) {
        console.error('[BOT tool] searchInternalUniversities error:', error)
        return { found: false, error: 'Database lookup failed. Please try again.' }
    }
}

export async function getStudentProfile(args: { studentId: string }) {
    try {
        const student = await prisma.student.findUnique({
            where: { id: args.studentId },
            select: {
                fullName: true,
                fieldOfInterest: true,
                budgetRange: true,
                preferredDegree: true,
                preferredCountries: true,
                englishTestType: true,
                englishScore: true,
                currentStatus: true,
                country: true,
                greScore: true,
                gmatScore: true,
            }
        })

        if (!student) return { found: false }
        return { found: true, profile: student }
    } catch (error) {
        console.error('[BOT tool] getStudentProfile error:', error)
        return { found: false, error: 'Profile lookup failed.' }
    }
}

export async function searchGlobalUniversities(args: { query: string }) {
    const cx = process.env.GOOGLE_CSE_CX
    const apiKey = process.env.GOOGLE_CSE_API_KEY

    if (!cx || !apiKey) {
        return { found: false, error: 'Global search not configured.' }
    }

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(args.query)}&num=4`
        const res = await fetch(url)

        if (!res.ok) {
            const err = await res.text()
            console.error('[BOT tool] Google CSE error:', err)
            return { found: false, error: 'Global search failed.' }
        }

        const data = await res.json()
        const items = data.items || []

        if (items.length === 0) {
            return { found: false, message: 'No external results found.' }
        }

        return {
            found: true,
            source: 'EXTERNAL',
            warning: 'These are external recommendations not verified on EdUmeetup. Label them clearly to the student.',
            results: items.slice(0, 4).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                displayLink: item.displayLink,
            }))
        }
    } catch (error) {
        console.error('[BOT tool] searchGlobalUniversities error:', error)
        return { found: false, error: 'Global search failed.' }
    }
}

export async function getUpcomingFairs() {
    try {
        const fairs = await prisma.fairEvent.findMany({
            where: {
                status: { in: ['UPCOMING', 'LIVE'] },
                startDate: { gte: new Date() },
            },
            select: {
                id: true,
                name: true,
                city: true,
                country: true,
                venue: true,
                startDate: true,
                endDate: true,
                isHybrid: true,
                onlineUrl: true,
                status: true,
                slug: true,
            },
            orderBy: { startDate: 'asc' },
            take: 5,
        })

        if (fairs.length === 0) {
            return { found: false, message: 'No upcoming fairs scheduled at this time. Check back soon!' }
        }

        return {
            found: true,
            fairs: fairs.map((f: any) => ({
                ...f,
                url: `/fairs/${f.slug}`,
            }))
        }
    } catch (error) {
        console.error('[BOT tool] getUpcomingFairs error:', error)
        return { found: false, error: 'Fair lookup failed.' }
    }
}

// ─── Tool Router ─────────────────────────────────────────────────────────────

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
        case 'searchInternalUniversities':
            return searchInternalUniversities(args as Parameters<typeof searchInternalUniversities>[0])
        case 'getStudentProfile':
            return getStudentProfile(args as Parameters<typeof getStudentProfile>[0])
        case 'searchGlobalUniversities':
            return searchGlobalUniversities(args as Parameters<typeof searchGlobalUniversities>[0])
        case 'getUpcomingFairs':
            return getUpcomingFairs()
        default:
            return { error: `Unknown tool: ${name}` }
    }
}
