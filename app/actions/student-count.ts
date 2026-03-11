'use server'

import { prisma } from '@/lib/prisma'

/**
 * Returns the total number of Student profiles on the platform.
 * Used for the social-proof bubble on the profile page.
 * Public — no auth needed (just a count).
 */
export async function getStudentCount(): Promise<number> {
    return prisma.student.count()
}
