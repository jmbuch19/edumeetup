/**
 * app/university/settings/page.tsx
 *
 * University notification preferences page.
 * Fresh build — premium feel matching university partner status.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Zap, Calendar, Clock, Users, BarChart2 } from 'lucide-react'
import { saveUniversityNotificationPrefs } from './actions'
import type { UniversityNotificationPrefs } from '@/lib/agent/university-triggers'
import { mergePrefs } from '@/lib/agent/university-triggers'

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
      notificationPrefs: true,
      responseRate: true,
      verificationStatus: true,
    },
  })

  if (!university) redirect('/university/dashboard')

  const prefs: UniversityNotificationPrefs = mergePrefs(university.notificationPrefs)

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <Badge className="bg-primary/10 text-primary border-0">Premium Partner</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Control exactly how and when edUmeetup contacts your team.
        </p>
        {university.responseRate != null && (
          <div className="mt-3 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Your response rate: <strong className={
                university.responseRate >= 80 ? 'text-green-600' :
                university.responseRate >= 60 ? 'text-amber-600' : 'text-red-600'
              }>{university.responseRate}%</strong>
            </span>
            <span className="text-xs text-muted-foreground">(platform avg: 67%)</span>
          </div>
        )}
      </div>

      <form action={saveUniversityNotificationPrefs} className="space-y-6">

        {/* Pipeline Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" /> Instant Pipeline Alerts
            </CardTitle>
            <CardDescription>
              Real-time notifications when students interact with your university. Sent immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PrefToggle
              id="alertNewInterest"
              name="alertNewInterest"
              defaultChecked={prefs.alertNewInterest}
              label="New student interest"
              description="Sent the moment a student expresses interest in your university or programme."
              badge="High impact"
              badgeColor="green"
            />
            <PrefToggle
              id="alertMeetingBooked"
              name="alertMeetingBooked"
              defaultChecked={prefs.alertMeetingBooked}
              label="Meeting booked"
              description="Sent when a student schedules a meeting with your team."
              badge="Recommended"
              badgeColor="blue"
            />
            <PrefToggle
              id="alertMeetingCancelled"
              name="alertMeetingCancelled"
              defaultChecked={prefs.alertMeetingCancelled}
              label="Meeting cancelled"
              description="Sent if a student cancels a scheduled meeting."
            />
          </CardContent>
        </Card>

        {/* Daily Brief */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-primary" /> Daily Brief
            </CardTitle>
            <CardDescription>
              A curated morning summary of your recruitment pipeline — sent at 9:00 AM IST.
              Only sent when there&apos;s something worth reporting.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PrefToggle
              id="dailyBrief"
              name="dailyBrief"
              defaultChecked={prefs.dailyBrief}
              label="Daily pipeline briefing"
              description="New interests, pending responses, upcoming meetings, and your response rate — in one email."
              badge="Recommended"
              badgeColor="blue"
            />
          </CardContent>
        </Card>

        {/* Response SLA */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-orange-500" /> Response SLA Threshold
            </CardTitle>
            <CardDescription>
              How long before edUmeetup reminds you about an unanswered student interest.
              Faster responses improve your ranking on the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {([24, 48, 72] as const).map(hours => (
                <label key={hours} className="cursor-pointer">
                  <input
                    type="radio"
                    name="responseSlaHours"
                    value={hours}
                    defaultChecked={prefs.responseSlaHours === hours}
                    className="sr-only peer"
                  />
                  <div className="border-2 border-gray-200 rounded-xl p-3 text-center transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                    <div className="text-xl font-bold text-gray-900">{hours}h</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {hours === 24 ? 'Same day' : hours === 48 ? 'Standard' : 'Relaxed'}
                    </div>
                    {hours === 48 && (
                      <div className="text-[10px] text-primary font-medium mt-1">Recommended</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notify Target */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-purple-500" /> Who Gets Notified
            </CardTitle>
            <CardDescription>
              Choose who on your team receives email notifications from edUmeetup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(['PRIMARY', 'ALL'] as const).map(target => (
                <label key={target} className="cursor-pointer">
                  <input
                    type="radio"
                    name="notifyTarget"
                    value={target}
                    defaultChecked={prefs.notifyTarget === target}
                    className="sr-only peer"
                  />
                  <div className="border-2 border-gray-200 rounded-xl p-4 transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                    <div className="text-sm font-semibold text-gray-900">
                      {target === 'PRIMARY' ? 'Primary contact' : 'All team members'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {target === 'PRIMARY'
                        ? 'Only the main account contact receives emails.'
                        : 'All registered reps receive emails. (Coming soon)'}
                    </div>
                    {target === 'ALL' && (
                      <Badge variant="outline" className="text-[10px] mt-2">Coming Soon</Badge>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-gray-400" /> Quiet Hours
            </CardTitle>
            <CardDescription>
              Pause non-urgent notifications during off-hours. Times are in IST.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PrefToggle
              id="quietHoursEnabled"
              name="quietHoursEnabled"
              defaultChecked={prefs.quietHoursEnabled}
              label="Enable quiet hours"
              description="No instant alert emails sent during the window below."
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  From (IST)
                </label>
                <input
                  type="time"
                  name="quietHoursStart"
                  defaultValue={prefs.quietHoursStart}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Until (IST)
                </label>
                <input
                  type="time"
                  name="quietHoursEnd"
                  defaultValue={prefs.quietHoursEnd}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg">
          Save Notification Preferences
        </Button>

      </form>
    </div>
  )
}

// ── Reusable toggle row ───────────────────────────────────────────────────────
function PrefToggle({
  id, name, defaultChecked, label, description, badge, badgeColor
}: {
  id: string
  name: string
  defaultChecked: boolean
  label: string
  description: string
  badge?: string
  badgeColor?: 'green' | 'blue'
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</label>
          {badge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              badgeColor === 'green'
                ? 'bg-green-100 text-green-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <input
        type="checkbox"
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0"
      />
    </div>
  )
}
