'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ── Profile / meeting settings (used by SettingsForm.tsx) ─────────────────────
export async function updateUniversitySettings(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
    return { error: 'Unauthorized' }
  }

  const university = await prisma.university.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!university) return { error: 'University not found' }

  await prisma.university.update({
    where: { id: university.id },
    data: {
      website:                 formData.get('website') as string || undefined,
      contactEmail:            formData.get('contactEmail') as string || undefined,
      logo:                    formData.get('logo') as string || undefined,
      brandColor:              formData.get('brandColor') as string || undefined,
      about:                   formData.get('description') as string || undefined,
      isPublic:                formData.get('isPublic') === 'on',
      defaultDuration:         Number(formData.get('defaultDuration')) || 30,
      dailyCapPerRep:          Number(formData.get('dailyCapPerRep')) || 8,
      minLeadTimeHours:        Number(formData.get('minLeadTimeHours')) || 12,
      bufferMinutes:           Number(formData.get('bufferMinutes')) || 15,
      cancellationWindowHours: Number(formData.get('cancellationWindowHours')) || 24,
      approvalMode:            (formData.get('approvalMode') as string) || 'MANUAL',
    },
  })

  revalidatePath('/university/settings')
  return { success: true }
}

// ── Notification preferences (used by settings/page.tsx) ─────────────────────
export async function saveUniversityNotificationPrefs(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
    redirect('/login')
  }

  const university = await prisma.university.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!university) redirect('/university/dashboard')

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
}
