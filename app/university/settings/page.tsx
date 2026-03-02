import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateUniversityNotificationPrefs } from './actions'
import { Bell, FileBarChart2, Globe, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UniversitySettingsPage() {
    const user = await requireUser()
    if (user.role !== 'UNIVERSITY') redirect('/')

    const university = await prisma.university.findFirst({
        where: { userId: user.id },
        select: {
            institutionName: true,
            notifyNewInterest: true,
            notifyMeetingBooked: true,
            notifyMeetingCancelled: true,
            followUpThresholdHours: true,
            digestDaily: true,
            digestWeekly: true,
            digestMonthly: true,
            notifyFairOpportunities: true,
            notifyInterestSpikes: true,
            notifyTarget: true,
            customNotifyEmails: true,
            quietHoursEnabled: true,
            quietHoursStart: true,
            quietHoursEnd: true,
        }
    })

    if (!university) redirect('/')

    const u = university

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Notification Settings</h1>
            <p className="text-muted-foreground text-sm mb-8">
                Control how and when edUmeetup contacts you and your team.
            </p>

            <form action={updateUniversityNotificationPrefs} className="space-y-6">

                {/* ── Pipeline ─────────────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bell className="h-4 w-4" /> Pipeline Notifications
                        </CardTitle>
                        <CardDescription>Immediate alerts for student activity — your core business signals.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CheckRow id="notifyNewInterest" label="New student interest received" description="Instant alert when a student expresses interest in your university." defaultChecked={u.notifyNewInterest} />
                        <CheckRow id="notifyMeetingBooked" label="Student booked a meeting" description="Instant alert when a student books a slot with you." defaultChecked={u.notifyMeetingBooked} />
                        <CheckRow id="notifyMeetingCancelled" label="Student cancelled a meeting" description="Instant alert when a confirmed meeting is cancelled." defaultChecked={u.notifyMeetingCancelled} />

                        <div className="pt-2 border-t border-gray-100">
                            <label htmlFor="followUpThresholdHours" className="text-sm font-medium block mb-1">
                                Follow-up threshold
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">
                                Escalate to you if a student hasn&apos;t been contacted after this long.
                            </p>
                            <select
                                id="followUpThresholdHours"
                                name="followUpThresholdHours"
                                defaultValue={u.followUpThresholdHours?.toString() ?? 'off'}
                                className="text-sm border border-gray-200 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="off">Off — don&apos;t escalate</option>
                                <option value="24">24 hours</option>
                                <option value="48">48 hours</option>
                                <option value="72">72 hours</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Digest & Reporting ───────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <FileBarChart2 className="h-4 w-4" /> Digest & Reporting
                        </CardTitle>
                        <CardDescription>Regular summaries of your pipeline — the account manager feel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CheckRow id="digestDaily" label="Daily pipeline summary" description="Sent at 9am IST every day — new interests, meetings, pending replies." defaultChecked={u.digestDaily} />
                        <CheckRow id="digestWeekly" label="Weekly engagement report" description="Every Monday — week-over-week trends and highlights." defaultChecked={u.digestWeekly} />
                        <CheckRow id="digestMonthly" label="Monthly performance snapshot" description="1st of every month — full pipeline metrics and conversion summary." defaultChecked={u.digestMonthly} />
                    </CardContent>
                </Card>

                {/* ── Events & Fairs ───────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Globe className="h-4 w-4" /> Events & Fairs
                        </CardTitle>
                        <CardDescription>Opportunities and market signals relevant to your university.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <CheckRow id="notifyFairOpportunities" label="Campus fair opportunities in my region" description="Notified when a fair is approved in a country you recruit from." defaultChecked={u.notifyFairOpportunities} />
                        <CheckRow id="notifyInterestSpikes" label="New programme interest spikes" description="Alert when student interest in your field of study surges." defaultChecked={u.notifyInterestSpikes} />
                    </CardContent>
                </Card>

                {/* ── Escalation Controls ──────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <ShieldAlert className="h-4 w-4" /> Escalation Controls
                        </CardTitle>
                        <CardDescription>Who receives notifications and when.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">

                        {/* Notify target */}
                        <div>
                            <label className="text-sm font-medium block mb-1">Notify</label>
                            <p className="text-xs text-muted-foreground mb-2">Who should receive pipeline and digest emails?</p>
                            <div className="flex gap-3 flex-wrap">
                                {(['PRIMARY', 'ALL', 'CUSTOM'] as const).map(opt => (
                                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                                        <input
                                            type="radio"
                                            name="notifyTarget"
                                            value={opt}
                                            defaultChecked={u.notifyTarget === opt}
                                            className="accent-primary"
                                        />
                                        {opt === 'PRIMARY' && 'Primary contact only'}
                                        {opt === 'ALL' && <span>All team members <Badge variant="outline" className="text-[10px] ml-1">Coming soon</Badge></span>}
                                        {opt === 'CUSTOM' && 'Custom emails'}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Custom emails */}
                        <div>
                            <label htmlFor="customNotifyEmails" className="text-sm font-medium block mb-1">
                                Custom email addresses
                            </label>
                            <p className="text-xs text-muted-foreground mb-2">Comma-separated. Only used when &quot;Custom emails&quot; is selected above.</p>
                            <input
                                id="customNotifyEmails"
                                name="customNotifyEmails"
                                type="text"
                                defaultValue={u.customNotifyEmails.join(', ')}
                                placeholder="rep@university.edu, admissions@university.edu"
                                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>

                        {/* Quiet hours */}
                        <div className="pt-2 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <label htmlFor="quietHoursEnabled" className="text-sm font-medium cursor-pointer">Quiet hours</label>
                                    <p className="text-xs text-muted-foreground mt-0.5">No emails sent during this window (IST).</p>
                                </div>
                                <input type="checkbox" id="quietHoursEnabled" name="quietHoursEnabled" defaultChecked={u.quietHoursEnabled} className="h-4 w-4 accent-primary cursor-pointer" />
                            </div>
                            <div className="flex items-center gap-3 ml-0">
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">From (24h)</label>
                                    <input
                                        type="number"
                                        name="quietHoursStart"
                                        defaultValue={u.quietHoursStart}
                                        min={0} max={23}
                                        className="w-20 text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                                <span className="text-muted-foreground mt-4">→</span>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">Until (24h)</label>
                                    <input
                                        type="number"
                                        name="quietHoursEnd"
                                        defaultValue={u.quietHoursEnd}
                                        min={0} max={23}
                                        className="w-20 text-sm border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                                <span className="text-xs text-muted-foreground mt-4">IST</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full">Save Notification Settings</Button>
            </form>
        </div>
    )
}

// ── Shared checkbox row component ─────────────────────────────────────────────
function CheckRow({ id, label, description, defaultChecked }: {
    id: string
    label: string
    description: string
    defaultChecked: boolean
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</label>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <input type="checkbox" id={id} name={id} defaultChecked={defaultChecked} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
        </div>
    )
}
