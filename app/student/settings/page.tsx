import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateDisplayName, updateNotificationPrefs } from './actions'
import { User, Bell, Shield, ExternalLink, Mail, BarChart2, CheckCircle2, XCircle, Bot } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StudentSettingsPage() {
    const user = await requireUser()
    if (user.role !== 'STUDENT') redirect('/')

    const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
            id: true, email: true, name: true, createdAt: true,
            emailVerified: true, consentMarketing: true,
            consentAnalytics: true, consentWithdrawnAt: true,
            deletionRequestedAt: true,
        }
    })
    if (!userData) redirect('/')

    // Fetch agent notification prefs from Student
    const studentData = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { notificationPrefs: true }
    })

    const prefs = (studentData?.notificationPrefs as Record<string, boolean> | null) ?? {}
    const emailNudge = prefs.emailNudge !== false          // default ON
    const emailMeetingReminder = prefs.emailMeetingReminder !== false  // default ON
    const emailUniversityUpdates = prefs.emailUniversityUpdates !== false // default ON

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
            <p className="text-muted-foreground text-sm mb-8">
                Manage your account, notifications, and privacy preferences.
            </p>
            <div className="space-y-6">

                {/* Account */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4" /> Account
                        </CardTitle>
                        <CardDescription>Your login details and membership info.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{userData.email}</span>
                                {userData.emailVerified
                                    ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                                    : <span className="flex items-center gap-1 text-xs text-amber-600"><XCircle className="h-3.5 w-3.5" /> Unverified</span>}
                            </div>
                            <p className="text-xs text-muted-foreground">Email cannot be changed. Sign in via magic link.</p>
                        </div>
                        <form action={updateDisplayName} className="space-y-2">
                            <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</Label>
                            <div className="flex gap-2">
                                <Input id="name" name="name" defaultValue={userData.name || ''} placeholder="Your full name" className="flex-1" maxLength={80} />
                                <Button type="submit" variant="outline" size="sm">Save</Button>
                            </div>
                        </form>
                        <div className="pt-1 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                            <div>
                                <span className="block font-medium text-gray-700">Member since</span>
                                {format(new Date(userData.createdAt), 'MMMM d, yyyy')}
                            </div>
                            <div>
                                <span className="block font-medium text-gray-700">Role</span>
                                <Badge variant="outline" className="text-[11px] mt-0.5">STUDENT</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Email Preferences */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bell className="h-4 w-4" /> Email Preferences
                        </CardTitle>
                        <CardDescription>Control which emails edUmeetup sends you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={updateNotificationPrefs} className="space-y-5">

                            {/* ── Existing consent toggles ─────────────────── */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Transactional Emails</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">Magic links, meeting reminders, university responses. Always sent.</p>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs shrink-0">Always On</Badge>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-muted-foreground" />
                                        <label htmlFor="consentMarketing" className="text-sm font-medium cursor-pointer">Marketing & Platform Updates</label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">New universities, tips, opportunities, and platform news.</p>
                                </div>
                                <input type="checkbox" id="consentMarketing" name="consentMarketing" defaultChecked={userData.consentMarketing ?? true} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                        <label htmlFor="consentAnalytics" className="text-sm font-medium cursor-pointer">Analytics & Personalisation</label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">Helps tailor university recommendations and improve the platform.</p>
                                </div>
                                <input type="checkbox" id="consentAnalytics" name="consentAnalytics" defaultChecked={userData.consentAnalytics ?? true} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                            </div>

                            {userData.consentWithdrawnAt && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                                    Consent withdrawn on {format(new Date(userData.consentWithdrawnAt), 'MMM d, yyyy')}. Update above and save to re-enable.
                                </p>
                            )}

                            {/* ── Agent notification preferences ────────────── */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">Smart Reminders</span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-4 ml-6">
                                    Automated nudges sent by edUmeetup to help you get the most out of the platform. You&apos;re in control.
                                </p>
                                <div className="space-y-4 ml-6">

                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <label htmlFor="emailNudge" className="text-sm font-medium cursor-pointer">Profile tips & reminders</label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Sent if your profile is incomplete for 3+ days.</p>
                                        </div>
                                        <input type="checkbox" id="emailNudge" name="emailNudge" defaultChecked={emailNudge} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <label htmlFor="emailMeetingReminder" className="text-sm font-medium cursor-pointer">Meeting reminders</label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Sent 24 hours before your scheduled meetings.</p>
                                        </div>
                                        <input type="checkbox" id="emailMeetingReminder" name="emailMeetingReminder" defaultChecked={emailMeetingReminder} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                    </div>

                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <label htmlFor="emailUniversityUpdates" className="text-sm font-medium cursor-pointer">University response alerts</label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Sent when a university responds to your interest.</p>
                                        </div>
                                        <input type="checkbox" id="emailUniversityUpdates" name="emailUniversityUpdates" defaultChecked={emailUniversityUpdates} className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                    </div>

                                </div>
                            </div>

                            <Button type="submit" size="sm" className="w-full">Save Preferences</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Privacy & Data */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Shield className="h-4 w-4" /> Privacy & Data
                        </CardTitle>
                        <CardDescription>Download your data, manage consent history, or request account deletion.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {userData.deletionRequestedAt && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                ⚠️ Account deletion requested on {format(new Date(userData.deletionRequestedAt), 'MMM d, yyyy')}. Contact support to cancel.
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">Full GDPR controls — data export, consent history, and account deletion — are on your Profile page.</p>
                        <Link href="/student/profile">
                            <Button variant="outline" size="sm" className="gap-2">
                                <ExternalLink className="h-3.5 w-3.5" /> Go to Privacy & Data Controls
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
