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
import {
    User, Bell, Shield, ExternalLink, Mail,
    BarChart2, CheckCircle2, XCircle, Zap, Calendar, School
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function StudentSettingsPage() {
    const user = await requireUser()
    if (user.role !== 'STUDENT') redirect('/')

    const [userData, student] = await Promise.all([
        prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                emailVerified: true,
                consentMarketing: true,
                consentAnalytics: true,
                consentWithdrawnAt: true,
                deletionRequestedAt: true,
            }
        }),
        prisma.student.findFirst({
            where: { userId: user.id },
            select: { notificationPrefs: true }
        })
    ])

    const prefs = (student?.notificationPrefs ?? {}) as Record<string, boolean>

    if (!userData) redirect('/')

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
            <p className="text-muted-foreground text-sm mb-8">
                Manage your account, notifications, and privacy preferences.
            </p>

            <div className="space-y-6">

                {/* ── Account Info ───────────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="h-4 w-4" /> Account
                        </CardTitle>
                        <CardDescription>Your login details and membership info.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Email — read-only */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{userData.email}</span>
                                {userData.emailVerified
                                    ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
                                    : <span className="flex items-center gap-1 text-xs text-amber-600"><XCircle className="h-3.5 w-3.5" /> Unverified</span>
                                }
                            </div>
                            <p className="text-xs text-muted-foreground">Email cannot be changed. Sign in via magic link.</p>
                        </div>

                        {/* Display name — editable */}
                        <form action={updateDisplayName} className="space-y-2">
                            <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wide">Display Name</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="name"
                                    name="name"
                                    defaultValue={userData.name || ''}
                                    placeholder="Your full name"
                                    className="flex-1"
                                    maxLength={80}
                                />
                                <Button type="submit" variant="outline" size="sm">Save</Button>
                            </div>
                        </form>

                        {/* Meta */}
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

                {/* ── Email Preferences ──────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bell className="h-4 w-4" /> Email Preferences
                        </CardTitle>
                        <CardDescription>Control which emails edUmeetup sends you.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={updateNotificationPrefs} className="space-y-5">
                            {/* Transactional — always on */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium">Transactional Emails</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                        Magic links, meeting reminders, university responses. Always sent — required for the platform to work.
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs shrink-0">Always On</Badge>
                            </div>

                            {/* Marketing */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-4 w-4 text-muted-foreground" />
                                        <label htmlFor="consentMarketing" className="text-sm font-medium cursor-pointer">
                                            Marketing & Platform Updates
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                        New universities, tips, opportunities, and platform news.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="consentMarketing"
                                    name="consentMarketing"
                                    defaultChecked={userData.consentMarketing ?? true}
                                    className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0"
                                />
                            </div>

                            {/* Analytics */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <BarChart2 className="h-4 w-4 text-muted-foreground" />
                                        <label htmlFor="consentAnalytics" className="text-sm font-medium cursor-pointer">
                                            Analytics & Personalisation
                                        </label>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                                        Helps us tailor university recommendations and improve the platform.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    id="consentAnalytics"
                                    name="consentAnalytics"
                                    defaultChecked={userData.consentAnalytics ?? true}
                                    className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0"
                                />
                            </div>

                            {userData.consentWithdrawnAt && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                                    Consent withdrawn on {format(new Date(userData.consentWithdrawnAt), 'MMM d, yyyy')}. Update above and save to re-enable.
                                </p>
                            )}

                            {/* ── Agent Notification Prefs ─────────────────── */}
                            <div className="pt-3 border-t border-gray-100 space-y-4">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Agent Notifications</p>

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <label htmlFor="emailMeetingReminder" className="text-sm font-medium cursor-pointer">Meeting Reminders</label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">24h email reminder before confirmed meetings.</p>
                                    </div>
                                    <input type="checkbox" id="emailMeetingReminder" name="emailMeetingReminder"
                                        defaultChecked={prefs.emailMeetingReminder ?? true}
                                        className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-4 w-4 text-muted-foreground" />
                                            <label htmlFor="emailNudge" className="text-sm font-medium cursor-pointer">Profile Completion Nudges</label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">Weekly reminder to complete your profile (stops once complete).</p>
                                    </div>
                                    <input type="checkbox" id="emailNudge" name="emailNudge"
                                        defaultChecked={prefs.emailNudge ?? true}
                                        className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <School className="h-4 w-4 text-muted-foreground" />
                                            <label htmlFor="emailUniversityUpdates" className="text-sm font-medium cursor-pointer">University Response Alerts</label>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">Notify you when universities respond to your interest.</p>
                                    </div>
                                    <input type="checkbox" id="emailUniversityUpdates" name="emailUniversityUpdates"
                                        defaultChecked={prefs.emailUniversityUpdates ?? true}
                                        className="mt-1 h-4 w-4 accent-primary cursor-pointer shrink-0" />
                                </div>
                            </div>

                            <Button type="submit" size="sm" className="w-full">Save Preferences</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* ── Privacy & Data ─────────────────────────────────────────── */}
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
                                ⚠️ Account deletion requested on{' '}
                                {format(new Date(userData.deletionRequestedAt), 'MMM d, yyyy')}.
                                Contact support to cancel.
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                            Full GDPR controls — including data export, consent history, and account deletion — are available on your Profile page.
                        </p>
                        <Link href="/student/profile">
                            <Button variant="outline" size="sm" className="gap-2">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Go to Privacy & Data Controls
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
