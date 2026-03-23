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
            <div className="glass-card hover-lift p-5 rounded-2xl relative overflow-hidden transition-all duration-200 shadow-sm" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                        <p style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 16, color: '#0B1340' }} className="leading-tight truncate">
                            Attending {event.name}
                        </p>
                        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }} className="mt-0.5">
                            {[event.city, fmt(event.startDate)].filter(Boolean).join(' · ')}
                        </p>
                    </div>
                </div>
                <div className="pt-4" style={{ borderTop: '1px solid #E8EAF6' }}>
                    <a href={`/university/fairs/${event.id}/students`}>
                        <Button
                            variant="outline-indigo"
                            className="w-full sm:w-auto h-8 text-xs flex items-center gap-1.5"
                        >
                            <Users className="h-3.5 w-3.5" />
                            View Registered Students
                            <ExternalLink className="h-3 w-3 opacity-60" />
                        </Button>
                    </a>
                </div>
            </div>
        )
    }

    // ── DECLINED state ────────────────────────────────────────────────────────
    if (status === 'DECLINED') {
        return (
            <div className="glass-card p-4 rounded-2xl relative overflow-hidden transition-all duration-200 shadow-sm opacity-60" style={{ borderLeft: '4px solid #E8EAF6' }}>
                <div className="flex items-center gap-2.5">
                    <XCircle className="h-4 w-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500">
                            You declined this fair invitation
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{event.name}</p>
                    </div>
                </div>
            </div>
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
            <div className="glass-card hover-lift p-5 rounded-2xl relative overflow-hidden transition-all duration-200 shadow-sm" style={{ borderLeft: '4px solid #C9A84C' }}>
                <div className="flex items-start gap-4 mb-4">
                    {/* Date chip */}
                    <div className="flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-xl bg-indigo-gradient text-white shadow-md">
                        <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} className="opacity-90">
                            {format(new Date(event.startDate), 'MMM')}
                        </span>
                        <span style={{ fontFamily: 'var(--font-fraunces)', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                            {format(new Date(event.startDate), 'dd')}
                        </span>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-900 border-amber-200">
                                RSVP needed
                            </Badge>
                        </div>
                        <h3 className="leading-tight mb-2 truncate" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 16, color: '#0B1340' }}>
                            {event.name}
                        </h3>

                        <div className="flex flex-wrap gap-2">
                             {(event.city || event.venue) && (
                                <span className="px-2.5 py-1 rounded-full whitespace-nowrap inline-flex items-center gap-1" style={{ backgroundColor: '#FDF6E3', color: '#A8873A', fontFamily: 'var(--font-jakarta)', fontSize: 12, border: '1px solid #C9A84C', fontWeight: 600 }}>
                                    <MapPin className="h-3 w-3" />
                                    {[event.venue, event.city].filter(Boolean).join(', ')}
                                </span>
                             )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-1 gap-3" style={{ borderTop: '1px solid #E8EAF6' }}>
                    {isDeadlinePassed ? (
                        <p style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }}>
                            RSVP closed · {fmt(event.rsvpDeadline!)}
                        </p>
                    ) : (
                        <>
                            {event.rsvpDeadline ? (
                                <div className="flex items-center gap-1.5" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 12, color: '#888888' }}>
                                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>RSVP by <span className="font-semibold text-[#0B1340]">{fmt(event.rsvpDeadline)}</span></span>
                                </div>
                            ) : <div />}

                            <div className="flex items-center gap-3 justify-end flex-1">
                                <button
                                    onClick={handleDecline}
                                    disabled={declining}
                                    style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13 }}
                                    className="text-gray-400 hover:text-[#0B1340] underline underline-offset-2 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                >
                                    {declining && <Loader2 className="h-3 w-3 animate-spin" />}
                                    decline
                                </button>
                                <Button
                                    variant="gold"
                                    onClick={() => setPanelOpen(true)}
                                    className="flex items-center gap-1.5 shadow-sm hover-lift"
                                >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Register
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

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
