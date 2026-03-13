'use server'

import { prisma } from '@/lib/prisma'

export type VisitItem = {
    id: string
    universityName: string
    universityLogo: string | null
    universityCountry: string | null
    visitedAt: string     // ISO string
    brochureUrl: string | null
}

export type ParentViewData = {
    studentFirstName: string
    fairEventTitle: string
    fairEventDate: string   // ISO string
    fairEnded: boolean
    visits: VisitItem[]
}

export async function getParentViewData(
    token: string,
): Promise<ParentViewData | null> {
    if (!token) return null

    try {
        const pass = await prisma.fairStudentPass.findUnique({
            where: { parentToken: token },
            include: {
                fairEvent: {
                    select: { id: true, name: true, startDate: true, endDate: true, endedAt: true },
                },
                attendances: {
                    include: {
                        university: {
                            include: {
                                documents: {
                                    where: { isFairReady: true, category: 'BROCHURE' },
                                    select: { fileUrl: true },
                                    take: 1,
                                },
                            },
                        },
                    },
                    orderBy: { scannedAt: 'asc' },
                },
            },
        })

        if (!pass) return null

        // A1 fix: token expires 7 days after the fair ends (or starts if no endDate)
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
        const fairEndMs = (pass.fairEvent.endDate ?? pass.fairEvent.startDate).getTime()
        if (Date.now() > fairEndMs + SEVEN_DAYS_MS) {
            console.log(`[getParentViewData] token expired for pass fair=${pass.fairEvent.name}`)
            return null
        }

        const fairEnded = pass.fairEvent.endedAt !== null

        return {
            studentFirstName: (pass.fullName ?? 'Your child').split(' ')[0],
            fairEventTitle: pass.fairEvent.name,
            fairEventDate: pass.fairEvent.startDate.toISOString(),
            fairEnded,
            visits: pass.attendances.map((att) => ({
                id: att.id,
                universityName: att.university.institutionName,
                universityLogo: att.university.logo,
                universityCountry: att.university.country,
                visitedAt: att.scannedAt.toISOString(),
                brochureUrl: att.university.documents[0]?.fileUrl ?? null,
            })),
        }
    } catch (error) {
        console.error('[getParentViewData] Error:', error)
        return null
    }
}
