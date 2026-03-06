'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { toast } from 'sonner'
import { declineFairInvitation } from '@/app/actions/university/fair-invitation-actions'
import { FairResponsePanel } from './FairResponsePanel'

interface FairInvitationData {
    id: string
    status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
    respondedAt: string | null
}

interface FairEventData {
    id: string
    name: string
    city: string | null
    venue: string | null
    startDate: string
    rsvpDeadline: string | null
    totalRegistered?: number
}

interface UniversityProgram {
    id: string
    name: string
    degreeLevel?: string | null
}

interface CampusFairInviteCardProps {
    notification: {
        id: string
        createdAt: string
        metadata?: Record<string, string> | null
    }
    invitation: FairInvitationData | null
    fair: FairEventData
    programs: UniversityProgram[]
}

export function CampusFairInviteCard({
    notification,
    invitation,
    fair,
    programs,
}: CampusFairInviteCardProps) {
    const [status, setStatus] = useState<'PENDING' | 'CONFIRMED' | 'DECLINED'>(
        invitation?.status ?? 'PENDING'
    )
    const [panelOpen, setPanelOpen] = useState(false)
    const [declining, startDecline] = useTransition()

    const isDeadlinePassed = fair.rsvpDeadline
        ? new Date() > new Date(fair.rsvpDeadline)
        : false

    const handleDecline = () => {
        startDecline(async () => {
            const res = await declineFairInvitation(fair.id)
            if (res.ok) {
                setStatus('DECLINED')
                toast.success('Response recorded.')
            } else {
                toast.error(res.error)
            }
        })
    }

    const handleConfirmed = () => {
        setStatus('CONFIRMED')
        setPanelOpen(false)
    }

    const dateStr = format(new Date(fair.startDate), 'MMMM d, yyyy')
    const deadlineStr = fair.rsvpDeadline
        ? format(new Date(fair.rsvpDeadline), 'MMMM d, yyyy')
        : null

    return (
        <>
            <Card
                className={`border-l-4 transition-all ${status === 'CONFIRMED'
                    ? 'border-l-teal-500 bg-teal-50/30'
                    : status === 'DECLINED'
                        ? 'border-l-slate-200 opacity-60'
                        : 'border-l-blue-500'
                    }`}
            >
                <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🏛️</span>
                            <div>
                                <p className="font-semibold text-navy-900 text-sm leading-tight">
                                    Campus Fair Invitation
                                </p>
                                <p className="text-xs text-gray-400">
                                    {format(new Date(notification.createdAt), 'MMM d')}
                                </p>
                            </div>
                        </div>
                        <StatusBadge status={status} />
                    </div>
                </CardHeader>

                <CardContent className="pb-3 space-y-2">
                    <p className="font-semibold text-gray-900">{fair.name}</p>
                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                        {(fair.city || fair.venue) && (
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                {[fair.venue, fair.city].filter(Boolean).join(' · ')}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {dateStr}
                        </span>
                        {fair.totalRegistered !== undefined && (
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                {fair.totalRegistered}+ students registered
                            </span>
                        )}
                        {deadlineStr && status === 'PENDING' && (
                            <span className="flex items-center gap-1.5 text-amber-600 text-xs">
                                <Clock className="w-3.5 h-3.5" />
                                RSVP by {deadlineStr}
                            </span>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="pt-0">
                    {/* Deadline passed */}
                    {isDeadlinePassed && status === 'PENDING' && (
                        <p className="text-xs text-gray-400 italic">
                            RSVP closed · {deadlineStr}
                        </p>
                    )}

                    {/* Already confirmed */}
                    {status === 'CONFIRMED' && (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 text-sm text-teal-700 font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                You&apos;re confirmed!
                            </span>
                            <a
                                href={`/university/fairs/${fair.id}/students`}
                                className="text-xs text-teal-600 underline underline-offset-2 hover:text-teal-800"
                            >
                                View Registered Students →
                            </a>
                        </div>
                    )}

                    {/* Already declined */}
                    {status === 'DECLINED' && (
                        <p className="text-xs text-gray-400 italic">You declined this fair.</p>
                    )}

                    {/* RSVP open & pending */}
                    {status === 'PENDING' && !isDeadlinePassed && (
                        <div className="flex items-center gap-3">
                            <Button
                                size="sm"
                                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-1.5 text-sm"
                                onClick={() => setPanelOpen(true)}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Yes, We&apos;re Attending
                            </Button>
                            <button
                                onClick={handleDecline}
                                disabled={declining}
                                className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 disabled:opacity-50 flex items-center gap-1"
                            >
                                {declining && <Loader2 className="w-3 h-3 animate-spin" />}
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
                onConfirmed={handleConfirmed}
                fair={fair}
                programs={programs}
            />
        </>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'CONFIRMED')
        return <Badge className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 text-xs">Confirmed ✅</Badge>
    if (status === 'DECLINED')
        return <Badge variant="secondary" className="text-xs">Declined</Badge>
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">Invited</Badge>
}
