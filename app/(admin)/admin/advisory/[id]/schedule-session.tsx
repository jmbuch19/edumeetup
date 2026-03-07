'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { scheduleAdvisorySession } from '@/app/actions/admin-advisory-actions'
import { CalendarCheck, Link2, Clock, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Adviser {
    id: string
    name: string | null
    email: string
}

interface ScheduleSessionProps {
    requestId: string
    advisers: Adviser[]
    currentAdviserId?: string | null
    currentSessionLink?: string | null
    currentScheduledAt?: Date | null
}

export function ScheduleSession({
    requestId,
    advisers,
    currentAdviserId,
    currentSessionLink,
    currentScheduledAt,
}: ScheduleSessionProps) {
    const [adviserId, setAdviserId] = useState(currentAdviserId ?? '')
    const [sessionLink, setSessionLink] = useState(currentSessionLink ?? '')
    // Initialise datetime-local value from existing scheduledAt (convert to local ISO)
    const toLocalISO = (d: Date | null | undefined) => {
        if (!d) return ''
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        return local.toISOString().slice(0, 16)
    }
    const [scheduledAt, setScheduledAt] = useState(toLocalISO(currentScheduledAt))
    const [done, setDone] = useState(false)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!adviserId) { toast.error('Please select an adviser'); return }
        if (!sessionLink.startsWith('http')) { toast.error('Please enter a valid session URL'); return }
        if (!scheduledAt) { toast.error('Please pick a date and time for the session'); return }

        startTransition(async () => {
            const result = await scheduleAdvisorySession(requestId, adviserId, sessionLink, scheduledAt)
            if (result.success) {
                setDone(true)
                toast.success('Session scheduled! Student has been notified by email.')
            } else {
                toast.error(result.error ?? 'Failed to schedule session')
            }
        })
    }

    const isAlreadyScheduled = !done && currentAdviserId && currentSessionLink

    if (done || isAlreadyScheduled) {
        const displayDate = done
            ? scheduledAt
                ? new Date(scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : null
            : currentScheduledAt
                ? new Date(currentScheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                : null

        return (
            <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" /> Session Scheduled
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                    <p className="text-muted-foreground">
                        Adviser: <strong>{advisers.find(a => a.id === (adviserId || currentAdviserId))?.name ?? 'Assigned'}</strong>
                    </p>
                    {displayDate && (
                        <div className="flex items-center gap-2 text-green-800 font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            {displayDate} IST
                        </div>
                    )}
                    <a href={(sessionLink || currentSessionLink) ?? '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline break-all text-xs">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {sessionLink || currentSessionLink}
                    </a>
                    <p className="text-xs text-green-600 mt-1">✉️ Student notified by email</p>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs"
                        onClick={() => setDone(false)}
                    >
                        Edit / Reschedule
                    </Button>
                </CardContent>
            </Card>
        )
    }

    // Min datetime = now (prevent scheduling in the past)
    const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString().slice(0, 16)

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4 text-indigo-500" />
                    Schedule Session
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Adviser */}
                    <div className="space-y-1.5">
                        <Label htmlFor="adviser-select">Assign Adviser</Label>
                        <select
                            id="adviser-select"
                            value={adviserId}
                            onChange={e => setAdviserId(e.target.value)}
                            className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            <option value="">— Select adviser —</option>
                            {advisers.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.name ?? a.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date & Time */}
                    <div className="space-y-1.5">
                        <Label htmlFor="session-datetime">
                            Session Date &amp; Time
                            <span className="text-muted-foreground text-xs font-normal ml-1">(your local time)</span>
                        </Label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                id="session-datetime"
                                type="datetime-local"
                                min={minDateTime}
                                value={scheduledAt}
                                onChange={e => setScheduledAt(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This exact time will be shown in the student&apos;s email notification.
                        </p>
                    </div>

                    {/* Session Link */}
                    <div className="space-y-1.5">
                        <Label htmlFor="session-link">Google Meet / Zoom Link</Label>
                        <div className="relative">
                            <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="session-link"
                                placeholder="https://meet.google.com/..."
                                value={sessionLink}
                                onChange={e => setSessionLink(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</>
                        ) : (
                            <><CalendarCheck className="mr-2 h-4 w-4" /> Schedule &amp; Notify Student</>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
