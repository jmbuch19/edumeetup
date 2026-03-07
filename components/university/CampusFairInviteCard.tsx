'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, CheckCircle2, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { declineFairInvitation } from '@/app/university/fairs/actions'
import { FairResponsePanel } from './FairResponsePanel'

// ─── Types ────────────────────────────────────────────────────────────────────

type FairInvitationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED'

interface FairEventShape {
    id: string
    name: string
    city: string | null
    venue: string | null
    startDate: string | Date
    rsvpDeadline: string | Date | null
    totalRegistered?: number
}

interface InvitationShape {
    id: string
    status: FairInvitationStatus
    respondedAt?: string | Date | null
    repsAttending?: number | null
    programsShowcasing?: string[]
}

interface ProgramShape {
    id: string
    name?: string         // legacy
    programName?: string  // spec
    degreeLevel?: string | null
}

interface CampusFairInviteCardProps {
    notification: {
        id: string
        createdAt: string | Date
        metadata?: Record<string, string> | null
    }
    // Accept both prop names — new spec uses fairEvent, notifications-center uses fair
    fairEvent?: FairEventShape | null
    fair?: FairEventShape | null
    invitation?: InvitationShape | null
    programs?: ProgramShape[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: string | Date, style: 'date' | 'datetime' = 'date') {
    const d = typeof date === 'string' ? new Date(date) : date
    return style === 'date'
        ? format(d, 'd MMM yyyy')
        : format(d, 'd MMM yyyy · h:mm a')
}

function progName(p: ProgramShape): string {
    return p.programName ?? p.name ?? ''
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CampusFairInviteCard({
    notification,
    fairEvent,
    fair: fairLegacy,
    invitation,
    programs = [],
}: CampusFairInviteCardProps) {
    // Normalise — accept both prop names
    const event = fairEvent ?? fairLegacy ?? null

    const [panelOpen, setPanelOpen] = useState(false)
    const [optimisticStatus, setOptimisticStatus] = useState<FairInvitationStatus | null>(
        invitation?.status ?? null
    )
    const [declining, setDeclining] = useState(false)

    if (!event) return null

    const status = optimisticStatus ?? invitation?.status ?? 'PENDING'
    const isDeadlinePassed = event.rsvpDeadline
        ? new Date() > new Date(event.rsvpDeadline)
        : false

    // ── CONFIRMED state ───────────────────────────────────────────────────────
    if (status === 'CONFIRMED') {
        return (
            <Card className="border-teal-200 bg-teal-50/40">
                <CardHeader className="pb-2 flex flex-row items-start gap-3">
                    <div className="p-2 rounded-full bg-teal-100 text-teal-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm text-teal-800 leading-tight">
                            You're attending {event.name}
                        </p>
                        <p className="text-xs text-teal-600 mt-0.5">
                            {[event.city, fmt(event.startDate)].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </CardHeader>
                <CardFooter className="pt-0">
                    <a href={`/university/fairs/${event.id}/students`}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-teal-700 border-teal-300 hover:bg-teal-50 flex items-center gap-1.5"
                        >
                            <Users className="h-3.5 w-3.5" />
                            View Registered Students
                            <ExternalLink className="h-3 w-3 opacity-60" />
                        </Button>
                    </a>
                </CardFooter>
            </Card>
        )
    }

    // ── DECLINED state ────────────────────────────────────────────────────────
    if (status === 'DECLINED') {
        return (
            <Card className="border-gray-200 bg-gray-50/60 opacity-70">
                <CardContent className="flex items-center gap-2.5 py-4">
                    <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">
                            You declined this fair invitation
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{event.name}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // ── PENDING state (default) ───────────────────────────────────────────────
    async function handleDecline() {
        setDeclining(true)
        // Optimistic: immediately show DECLINED
        setOptimisticStatus('DECLINED')
        const result = await declineFairInvitation(event!.id)
        if (!result.ok) {
            // Rollback
            setOptimisticStatus(invitation?.status ?? 'PENDING')
            toast.error(result.error)
        }
        setDeclining(false)
    }

    return (
        <>
            <Card className="border-blue-200 bg-white">
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-blue-100 text-blue-600 shrink-0 mt-0.5">
                                <span className="text-base leading-none">🏛️</span>
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-gray-900">
                                        Campus Fair Invitation
                                    </p>
                                    <Badge variant="secondary" className="text-[10px]">
                                        RSVP needed
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {fmt(notification.createdAt, 'datetime')}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0 pb-3 space-y-1.5">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                        {event.name}
                    </p>
                    {(event.venue || event.city) && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            {[event.venue, event.city].filter(Boolean).join(', ')}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        {fmt(event.startDate)}
                    </div>
                    {event.rsvpDeadline && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                                RSVP by:{' '}
                                <span className={isDeadlinePassed ? 'text-red-500 font-medium' : 'font-medium'}>
                                    {fmt(event.rsvpDeadline)}
                                </span>
                            </span>
                        </div>
                    )}
                    {typeof event.totalRegistered === 'number' && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Users className="h-3.5 w-3.5 flex-shrink-0" />
                            {event.totalRegistered} students registered
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-0">
                    {isDeadlinePassed ? (
                        <p className="text-xs text-gray-400">
                            RSVP closed · {fmt(event.rsvpDeadline!)}
                        </p>
                    ) : (
                        <div className="flex items-center gap-3 w-full">
                            <Button
                                size="sm"
                                onClick={() => setPanelOpen(true)}
                                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Yes, We're Attending
                            </Button>
                            <button
                                onClick={handleDecline}
                                disabled={declining}
                                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 disabled:opacity-50 flex items-center gap-1"
                            >
                                {declining && <Loader2 className="h-3 w-3 animate-spin" />}
                                decline quietly
                            </button>
                        </div>
                    )}
                </CardFooter>
            </Card>

            {/* Slide-in response panel */}
            <FairResponsePanel
                open={panelOpen}
                onClose={() => setPanelOpen(false)}
                onConfirmed={() => {
                    setOptimisticStatus('CONFIRMED')
                    setPanelOpen(false)
                }}
                onSuccess={() => {
                    setOptimisticStatus('CONFIRMED')
                    setPanelOpen(false)
                }}
                fair={{
                    id: event.id,
                    name: event.name,
                    city: event.city ?? null,
                    startDate: fmt(event.startDate),
                }}
                fairEventId={event.id}
                fairName={event.name}
                fairDate={fmt(event.startDate)}
                programs={programs.map(p => ({ id: p.id, name: progName(p), programName: progName(p), degreeLevel: p.degreeLevel }))}
            />
        </>
    )
}
