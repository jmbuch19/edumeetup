'use server'

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateUniversityNotificationPrefs(formData: FormData) {
    const user = await requireUser()
    if (user.role !== 'UNIVERSITY') return { error: 'Unauthorized' }

    const university = await prisma.university.findFirst({ where: { userId: user.id } })
    if (!university) return { error: 'University not found' }

    // Pipeline
    const notifyNewInterest      = formData.get('notifyNewInterest') === 'on'
    const notifyMeetingBooked    = formData.get('notifyMeetingBooked') === 'on'
    const notifyMeetingCancelled = formData.get('notifyMeetingCancelled') === 'on'
    const followUpRaw            = formData.get('followUpThresholdHours') as string
    const followUpThresholdHours = followUpRaw === 'off' ? null : parseInt(followUpRaw)

    // Digest
    const digestDaily   = formData.get('digestDaily') === 'on'
    const digestWeekly  = formData.get('digestWeekly') === 'on'
    const digestMonthly = formData.get('digestMonthly') === 'on'

    // Events & Fairs
    const notifyFairOpportunities = formData.get('notifyFairOpportunities') === 'on'
    const notifyInterestSpikes    = formData.get('notifyInterestSpikes') === 'on'

    // Escalation
    const notifyTarget       = (formData.get('notifyTarget') as string) || 'PRIMARY'
    const customEmailsRaw    = (formData.get('customNotifyEmails') as string) || ''
    const customNotifyEmails = customEmailsRaw
        .split(',')
        .map(e => e.trim())
        .filter(e => e.includes('@'))
    const quietHoursEnabled  = formData.get('quietHoursEnabled') === 'on'
    const quietHoursStart    = parseInt((formData.get('quietHoursStart') as string) || '22')
    const quietHoursEnd      = parseInt((formData.get('quietHoursEnd') as string) || '7')

    await prisma.university.update({
        where: { id: university.id },
        data: {
            notifyNewInterest,
            notifyMeetingBooked,
            notifyMeetingCancelled,
            followUpThresholdHours: isNaN(followUpThresholdHours as number) ? null : followUpThresholdHours,
            digestDaily,
            digestWeekly,
            digestMonthly,
            notifyFairOpportunities,
            notifyInterestSpikes,
            notifyTarget,
            customNotifyEmails,
            quietHoursEnabled,
            quietHoursStart: isNaN(quietHoursStart) ? 22 : quietHoursStart,
            quietHoursEnd: isNaN(quietHoursEnd) ? 7 : quietHoursEnd,
        }
    })

    revalidatePath('/university/settings')
    return { success: true }
}
