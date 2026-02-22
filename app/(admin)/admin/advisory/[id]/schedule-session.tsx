'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { scheduleAdvisorySession } from '@/app/actions/admin-advisory-actions'
import { CalendarCheck, Link2, Loader2, CheckCircle } from 'lucide-react'
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
}

export function ScheduleSession({
    requestId,
    advisers,
    currentAdviserId,
    currentSessionLink,
}: ScheduleSessionProps) {
    const [adviserId, setAdviserId] = useState(currentAdviserId ?? '')
    const [sessionLink, setSessionLink] = useState(currentSessionLink ?? '')
    const [done, setDone] = useState(false)
    const [isPending, startTransition] = useTransition()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!adviserId) { toast.error('Please select an adviser'); return }
        if (!sessionLink.startsWith('http')) { toast.error('Please enter a valid session URL'); return }

        startTransition(async () => {
            const result = await scheduleAdvisorySession(requestId, adviserId, sessionLink)
            if (result.success) {
                setDone(true)
                toast.success('Session scheduled! Student has been notified by email.')
            } else {
                toast.error(result.error ?? 'Failed to schedule session')
            }
        })
    }

    if (done || (currentAdviserId && currentSessionLink)) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" /> Session Scheduled
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                        Adviser: <strong>{advisers.find(a => a.id === (adviserId || currentAdviserId))?.name ?? 'Assigned'}</strong>
                    </p>
                    <a href={(sessionLink || currentSessionLink) ?? '#'} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all text-xs">
                        {sessionLink || currentSessionLink}
                    </a>
                    <p className="text-xs text-green-600 mt-2">✉️ Student notified by email</p>
                </CardContent>
            </Card>
        )
    }

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

                    <div className="space-y-1.5">
                        <Label htmlFor="session-link">Session Link</Label>
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
