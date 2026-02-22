'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function markNotificationAsRead(notificationId: string) {
    const user = await requireUser()

    // Verify ownership
    const notification = await prisma.notification.findUnique({
        where: { id: notificationId }
    })

    if (!notification || notification.userId !== user.id) {
        return { error: "Unauthorized" }
    }

    await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    })

    revalidatePath('/', 'layout') // Refresh UI
    return { success: true }
}
