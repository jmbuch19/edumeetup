import { prisma } from '@/lib/prisma'

/** Resolve the university that an authenticated university actor belongs to. */
export async function getUniversityForActor(userId: string, role: string) {
    if (role === 'UNIVERSITY') {
        return prisma.university.findUnique({
            where: { userId },
            select: { id: true },
        })
    }

    if (role === 'UNIVERSITY_REP') {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { representedUniversity: { select: { id: true } } },
        })
        return user?.representedUniversity ?? null
    }

    return null
}
