'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Send, Users, CalendarDays, Megaphone, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { sendUniversityNotification, getUniversityCampaignStats, getSegmentCount } from './actions'

type Stats = {
    totalInterested: number
    totalMeetings: number
    campaignsUsedThisWeek: number
    weeklyQuota: number
    notifPaused: boolean
}

export default function UniversityEngagementPage() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [segment, setSegment] = useState('interested')
    const [dayRange, setDayRange] = useState('30')
    const [segmentPreview, setSegmentPreview] = useState<number | null>(null)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [sendEmailToo, setSendEmailToo] = useState(false)

    useEffect(() => {
        loadStats()
    }, [])

    useEffect(() => {
        if (segment && dayRange) previewSegment()
    }, [segment, dayRange])

    async function loadStats() {
        const data = await getUniversityCampaignStats()
        setStats(data)
    }

    async function previewSegment() {
        setPreviewLoading(true)
        const res = await getSegmentCount(segment, parseInt(dayRange))
        if (!('error' in res)) setSegmentPreview(res.count)
        setPreviewLoading(false)
    }

    async function handleSubmit(formData: FormData) {
        formData.set('segment', segment)
        formData.set('dayRange', dayRange)
        formData.set('sendEmail', sendEmailToo ? 'on' : 'off')
        setIsSubmitting(true)
        const res = await sendUniversityNotification(formData)

        if (res.error) {
            toast.error(res.error)
        } else if (res.success) {
            const msg = res.wasCapped
                ? `Sent to ${res.notifiedCount} students (capped at 500).${res.emailedCount ? ` ${res.emailedCount} emails sent.` : ''} Campaign ${res.campaignsUsedThisWeek}/${res.weeklyQuota} this week.`
                : `✅ Sent to ${res.notifiedCount} students!${res.emailedCount ? ` ${res.emailedCount} emails sent.` : ''} Campaign ${res.campaignsUsedThisWeek}/${res.weeklyQuota} this week.`
            toast.success(msg, { duration: 6000 })
            loadStats()
            const form = document.getElementById('eng-form') as HTMLFormElement
            form?.reset()
        }
        setIsSubmitting(false)
    }

    const quotaExhausted = stats && stats.campaignsUsedThisWeek >= stats.weeklyQuota
    const remaining = stats ? stats.weeklyQuota - stats.campaignsUsedThisWeek : 0

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Engagement & Notifications</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Send targeted in-app notifications to students based on their engagement with your university.
                </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Users className="h-3.5 w-3.5" /> Interested Students
                        </div>
                        <div className="text-2xl font-bold">{stats?.totalInterested ?? '—'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <CalendarDays className="h-3.5 w-3.5" /> Meeting Students
                        </div>
                        <div className="text-2xl font-bold">{stats?.totalMeetings ?? '—'}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <Megaphone className="h-3.5 w-3.5" /> Campaigns This Week
                        </div>
                        <div className="text-2xl font-bold">
                            {stats ? `${stats.campaignsUsedThisWeek} / ${stats.weeklyQuota}` : '—'}
                        </div>
                    </CardContent>
                </Card>
                <Card className={stats?.notifPaused ? 'border-red-400 bg-red-50' : 'border-green-300 bg-green-50'}>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-xs mb-1">
                            {stats?.notifPaused ? <ShieldAlert className="h-3.5 w-3.5 text-red-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                            <span className={stats?.notifPaused ? 'text-red-600' : 'text-green-700'}>Status</span>
                        </div>
                        <div className={`text-sm font-semibold ${stats?.notifPaused ? 'text-red-600' : 'text-green-700'}`}>
                            {stats?.notifPaused ? 'Paused by Admin' : 'Active'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Paused banner */}
            {stats?.notifPaused && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    <strong>Notifications paused.</strong> Your notification access has been paused by the platform admin. Please contact support to resolve this.
                </div>
            )}

            {/* Quota exhausted banner */}
            {quotaExhausted && !stats?.notifPaused && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                    <strong>Weekly limit reached.</strong> You've used all {stats.weeklyQuota} campaigns this week. Quota resets every Monday. Contact support to request a higher limit.
                </div>
            )}

            {/* Compose form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        Send Notification Campaign
                        {remaining > 0 && (
                            <Badge variant="outline" className="ml-auto text-xs font-normal">
                                {remaining} campaign{remaining !== 1 ? 's' : ''} remaining this week
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form id="eng-form" action={handleSubmit} className="space-y-5">

                        {/* Segment + Day range */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Who to notify</Label>
                                <Select value={segment} onValueChange={setSegment}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="interested">Students who expressed interest</SelectItem>
                                        <SelectItem value="meetings">Students who had a meeting with us</SelectItem>
                                        <SelectItem value="all">All engaged students (interest + meetings)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Time window</Label>
                                <Select value={dayRange} onValueChange={setDayRange}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">Last 7 days</SelectItem>
                                        <SelectItem value="30">Last 30 days</SelectItem>
                                        <SelectItem value="90">Last 90 days</SelectItem>
                                        <SelectItem value="365">Last 12 months</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Segment preview */}
                        <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            {previewLoading ? (
                                <span className="text-muted-foreground">Calculating...</span>
                            ) : segmentPreview !== null ? (
                                <span>
                                    <strong>{segmentPreview}</strong> student{segmentPreview !== 1 ? 's' : ''} will receive this notification
                                    {segmentPreview === 500 && <span className="text-amber-600 ml-1">(capped at 500)</span>}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">Select a segment to preview reach</span>
                            )}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title <span className="text-muted-foreground font-normal">(max 100 chars)</span></Label>
                            <Input
                                id="title"
                                name="title"
                                required
                                maxLength={100}
                                placeholder="e.g. New Scholarship Opening — Apply Now!"
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <Label htmlFor="message">Message <span className="text-muted-foreground font-normal">(max 1000 chars)</span></Label>
                            <Textarea
                                id="message"
                                name="message"
                                required
                                maxLength={1000}
                                rows={4}
                                placeholder="Write your message here. Students will see this in their notification bell and (optionally) receive it by email."
                            />
                        </div>

                        {/* Email toggle */}
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="h-4 w-4 accent-primary"
                                checked={sendEmailToo}
                                onChange={e => setSendEmailToo(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">
                                Also send as email to students who have opted in to marketing
                            </span>
                        </label>

                        {/* Limits info */}
                        <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-700 space-y-1">
                            <div>⏱ <strong>6-hour cooldown</strong> between campaigns</div>
                            <div>📊 <strong>Weekly limit:</strong> {stats?.weeklyQuota ?? '—'} campaigns/week (resets every Monday)</div>
                            <div>👥 <strong>Max 500 students</strong> per campaign</div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting || !!stats?.notifPaused || !!quotaExhausted || (segmentPreview !== null && segmentPreview === 0)}
                            className="w-full md:w-auto"
                        >
                            {isSubmitting
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                : <><Send className="mr-2 h-4 w-4" /> Send Campaign</>
                            }
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
