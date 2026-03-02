'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { UniversityNotificationPrefs } from '@/lib/agent/university-triggers'

export async function saveUniversityNotificationPrefs(formData: FormData) {
    const session = await auth()
    if (!session?.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        return { error: 'Unauthorized' }
    }

    const university = await prisma.university.findFirst({ where: { userId: session.user.id } })
    if (!university) return { error: 'University not found' }

    const slaRaw = formData.get('responseSlaHours') as string
    const slaHours = parseInt(slaRaw)

    const prefs: UniversityNotificationPrefs = {
        alertNewInterest:      formData.get('alertNewInterest') === 'on',
        alertMeetingBooked:    formData.get('alertMeetingBooked') === 'on',
        alertMeetingCancelled: formData.get('alertMeetingCancelled') === 'on',
        dailyBrief:            formData.get('dailyBrief') === 'on',
        responseSlaHours:      ([24, 48, 72].includes(slaHours) ? slaHours : 48) as 24 | 48 | 72,
        notifyTarget:          (formData.get('notifyTarget') as 'PRIMARY' | 'ALL') || 'PRIMARY',
        quietHoursEnabled:     formData.get('quietHoursEnabled') === 'on',
        quietHoursStart:       (formData.get('quietHoursStart') as string) || '22:00',
        quietHoursEnd:         (formData.get('quietHoursEnd') as string) || '07:00',
    }

    await prisma.university.update({
        where: { id: university.id },
        data: { notificationPrefs: prefs },
    })

    revalidatePath('/university/settings')
    return { success: true }
}
