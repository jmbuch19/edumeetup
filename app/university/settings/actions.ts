'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function updateUniversitySettings(formData: FormData) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return { error: 'Unauthorized' }
    }

    const userId = session.user.id

    // Extract Profile Fields
    const website = formData.get('website') as string
    const contactEmail = formData.get('contactEmail') as string
    const description = formData.get('description') as string
    const logo = formData.get('logo') as string

    // Extract Rules Fields
    const approvalMode = formData.get('approvalMode') as string
    const defaultDuration = parseInt(formData.get('defaultDuration') as string)
    const dailyCapPerRep = parseInt(formData.get('dailyCapPerRep') as string)
    const minLeadTimeHours = parseInt(formData.get('minLeadTimeHours') as string)
    const bufferMinutes = parseInt(formData.get('bufferMinutes') as string)
    const cancellationWindowHours = parseInt(formData.get('cancellationWindowHours') as string)
    const isPublic = formData.get('isPublic') === 'on'

    try {
        await prisma.university.update({
            where: { userId },
            data: {
                website,
                contactEmail,
                description,
                logo,
                approvalMode,
                defaultDuration,
                dailyCapPerRep,
                minLeadTimeHours,
                bufferMinutes,
                cancellationWindowHours,
                isPublic
            }
        })

        revalidatePath('/university/settings')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to update settings' }
    }
}

export async function getUniversitySettings() {
    const session = await auth()
    if (!session || !session.user) return null

    return await prisma.university.findUnique({
        where: { userId: session.user.id }
    })
}
