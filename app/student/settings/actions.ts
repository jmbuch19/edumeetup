'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateDisplayName(formData: FormData) {
    const user = await requireUser()
    const name = (formData.get('name') as string)?.trim()
    if (!name || name.length < 2) return { error: 'Name must be at least 2 characters.' }
    if (name.length > 80) return { error: 'Name is too long.' }

    await prisma.user.update({ where: { id: user.id }, data: { name } })
    // Keep student.fullName in sync if it exists
    await prisma.student.updateMany({ where: { userId: user.id }, data: { fullName: name } })
    revalidatePath('/student/settings')
    return { success: true }
}

export async function updateNotificationPrefs(formData: FormData) {
    const user = await requireUser()
    const consentMarketing = formData.get('consentMarketing') === 'on'
    const consentAnalytics = formData.get('consentAnalytics') === 'on'

    await prisma.user.update({
        where: { id: user.id },
        data: {
            consentMarketing,
            consentAnalytics,
            consentWithdrawnAt: (!consentMarketing && !consentAnalytics) ? new Date() : null,
        }
    })
    revalidatePath('/student/settings')
    return { success: true }
}
