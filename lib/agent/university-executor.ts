/**
 * lib/agent/university-executor.ts
 *
 * Resolves email recipients for university notifications.
 * ALL mode is a placeholder — defaults to PRIMARY until rep system is built.
 */

import { prisma } from '@/lib/prisma'

export type UniversityPrefs = {
  notifyTarget: string
  customNotifyEmails: string[]
  quietHoursEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
}

export type Recipient = {
  email: string
  name: string
}

// ── Quiet hours check (IST) ───────────────────────────────────────────────────
export function isQuietTime(prefs: Pick<UniversityPrefs, 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'>): boolean {
  if (!prefs.quietHoursEnabled) return false

  const istHour = Number(
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    })
  )

  // Spans midnight: e.g. 22–7 means >= 22 OR < 7
  if (prefs.quietHoursStart > prefs.quietHoursEnd) {
    return istHour >= prefs.quietHoursStart || istHour < prefs.quietHoursEnd
  }
  // Same-day window: e.g. 0–7 means >= 0 AND < 7
  return istHour >= prefs.quietHoursStart && istHour < prefs.quietHoursEnd
}

// ── Recipient resolver ────────────────────────────────────────────────────────
export async function getUniversityRecipients(
  universityId: string,
  prefs: Pick<UniversityPrefs, 'notifyTarget' | 'customNotifyEmails'>
): Promise<Recipient[]> {
  const university = await prisma.university.findUnique({
    where: { id: universityId },
    include: { user: { select: { email: true, name: true } } }
  })

  if (!university) return []

  const primary: Recipient = {
    email: university.user.email,
    name: university.user.name || university.institutionName
  }

  if (prefs.notifyTarget === 'CUSTOM' && prefs.customNotifyEmails.length > 0) {
    return prefs.customNotifyEmails.map(email => ({ email, name: university.institutionName }))
  }

  // TODO: When rep system is built, implement ALL:
  // if (prefs.notifyTarget === 'ALL') {
  //   const reps = await prisma.user.findMany({
  //     where: { universityId, isActive: true },
  //     select: { email: true, name: true }
  //   })
  //   return reps.map(r => ({ email: r.email, name: r.name || university.institutionName }))
  // }

  // PRIMARY (default) — and ALL placeholder
  return [primary]
}
