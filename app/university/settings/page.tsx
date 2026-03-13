/**
 * app/university/settings/page.tsx
 *
 * Bloomberg Terminal × Diplomatic Partner Portal
 * Deep sapphire header, left anchor nav, data-dense sections,
 * every field purposeful — no consumer fluff.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'

export const dynamic = 'force-dynamic'

export default async function UniversitySettingsPage() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
    redirect('/login')
  }

  const university = await prisma.university.findFirst({
    where: { userId: session.user.id },
    select: {
      id: true,
      institutionName: true,
      verificationStatus: true,
      responseRate: true,
      notificationPrefs: true,
      // Public profile
      logo: true,
      brandColor: true,
      website: true,
      contactEmail: true,
      about: true,
      isPublic: true,
      // Identity / partner fields
      country: true,
      timezone: true,
      linkedin: true,
      universityType: true,
      accreditation: true,
      rankingQS: true,
      rankingTHE: true,
      indianStudentTarget: true,
      // Programs & intake
      programs: true,
      intakeMonths: true,
      // Meeting rules
      defaultDuration: true,
      dailyCapPerRep: true,
      minLeadTimeHours: true,
      bufferMinutes: true,
      cancellationWindowHours: true,
      approvalMode: true,
      // Whereby integration
      wherebyApiKey: true,
      // Notification fields (live columns)
      notifyNewInterest: true,
      notifyMeetingBooked: true,
      notifyMeetingCancelled: true,
      digestDaily: true,
      notifyTarget: true,
      quietHoursEnabled: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      followUpThresholdHours: true,
      user: {
        select: {
          timezone: true
        }
      }
    },
  })

  if (!university) redirect('/university/dashboard')

  return (
    <SettingsForm
      settings={{
        institutionName:         university.institutionName,
        verificationStatus:      university.verificationStatus,
        responseRate:            university.responseRate ?? null,
        logo:                    university.logo,
        brandColor:              university.brandColor,
        website:                 university.website,
        contactEmail:            university.contactEmail,
        description:             university.about,
        isPublic:                university.isPublic,
        country:                 university.country,
        timezone:                university.timezone,
        linkedin:                university.linkedin,
        universityType:          university.universityType,
        accreditation:           university.accreditation,
        rankingQS:               university.rankingQS,
        rankingTHE:              university.rankingTHE,
        indianStudentTarget:     university.indianStudentTarget,
        programs:                 university.programs,
        intakeMonths:            university.intakeMonths,
        defaultDuration:         university.defaultDuration,
        dailyCapPerRep:          university.dailyCapPerRep,
        minLeadTimeHours:        university.minLeadTimeHours,
        bufferMinutes:           university.bufferMinutes,
        cancellationWindowHours: university.cancellationWindowHours,
        approvalMode:            university.approvalMode,
        wherebyApiKey:           university.wherebyApiKey,
        // Notifications
        notifyNewInterest:       university.notifyNewInterest,
        notifyMeetingBooked:     university.notifyMeetingBooked,
        notifyMeetingCancelled:  university.notifyMeetingCancelled,
        digestDaily:             university.digestDaily,
        notifyTarget:            university.notifyTarget,
        quietHoursEnabled:       university.quietHoursEnabled,
        quietHoursStart:         university.quietHoursStart,
        quietHoursEnd:           university.quietHoursEnd,
        followUpThresholdHours:  university.followUpThresholdHours,
        notificationTimezone:    university.user?.timezone || null,
      }}
    />
  )
}
