'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function setUniversityNotifQuota(universityId: string, quota: number) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

    if (quota < 0 || quota > 50) return { error: 'Quota must be between 0 and 50' }

    await prisma.university.update({
        where: { id: universityId },
        data: { notifQuota: quota }
    })
    revalidatePath('/admin/universities')
    return { success: true }
}

export async function pauseUniversityNotifications(universityId: string, paused: boolean) {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return { error: 'Unauthorized' }

    await prisma.university.update({
        where: { id: universityId },
        data: { notifPaused: paused }
    })
    revalidatePath('/admin/universities')
    return { success: true }
}

export async function getUniversitiesWithNotifStats() {
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') return []

    const universities = await prisma.university.findMany({
        select: {
            id: true,
            institutionName: true,
            verificationStatus: true,
            notifQuota: true,
            notifPaused: true,
            user: { select: { email: true, isActive: true } }
        },
        orderBy: { institutionName: 'asc' }
    })

    return universities
}
