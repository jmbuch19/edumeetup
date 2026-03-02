'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function saveUniversityNotificationPrefs(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
    redirect('/login')
  }

  const university = await prisma.university.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!university) return { error: 'University not found' }

  const prefs = {
    alertNewInterest:      formData.get('alertNewInterest') === 'on',
    alertMeetingBooked:    formData.get('alertMeetingBooked') === 'on',
    alertMeetingCancelled: formData.get('alertMeetingCancelled') === 'on',
    dailyBrief:            formData.get('dailyBrief') === 'on',
    responseSlaHours:      Number(formData.get('responseSlaHours')) || 48,
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
