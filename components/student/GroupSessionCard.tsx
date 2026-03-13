'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Video, Clock, CalendarDays, Users, Loader2, ExternalLink } from 'lucide-react'
import { joinGroupSession, leaveGroupSession, type StudentGroupSession, type DiscoverableGroupSession } from '@/app/university/actions/group-sessions'
import { useRouter } from 'next/navigation'

// ─── Seat fill bar ───────────────────────────────────────────────────────────

export function SeatBar({ confirmed, capacity, muted = false }: { confirmed: number; capacity: number; muted?: boolean }) {
    const pct = Math.round((confirmed / capacity) * 100)
    const color = pct >= 100 ? (muted ? 'bg-gray-400' : 'bg-red-500') : pct >= 70 ? 'bg-amber-500' : 'bg-green-500'
    const remaining = capacity - confirmed

    return (
        <div className="mt-2 text-left w-full">
            <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">{confirmed}/{capacity} seats taken</span>
                <span className={remaining <= 3 && remaining > 0 && !muted ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                    {remaining > 0 ? `${remaining} remaining${remaining <= 3 && !muted ? ' — almost full!' : ''}` : 'Full'}
                </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
        </div>
    )
}

// ─── Waitlist message ────────────────────────────────────────────────────────

function WaitlistBanner({ pos }: { pos: number }) {
    return (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <p className="font-semibold text-amber-900">🔥 This session filled up fast!</p>
            <p className="text-amber-700 mt-0.5">
                You&apos;re #{pos} in line — the university will be notified and may open another slot.
                We&apos;ve saved your spot.
            </p>
        </div>
    )
}

// ─── Individual session card ─────────────────────────────────────────────────

export function GroupSessionCard({ seat }: { seat: StudentGroupSession }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const s = seat.session

    const isConfirmed = seat.seatStatus === 'CONFIRMED'
    const isWaitlisted = seat.seatStatus === 'WAITLISTED'
    const isUpcoming = new Date(s.scheduledAt) > new Date()
    const isLive = s.status === 'LIVE'
    const isCompleted = s.status === 'COMPLETED'

    const handleLeave = async () => {
        if (!confirm('Are you sure you want to give up your seat?')) return
        setLoading(true)
        const res = await leaveGroupSession(s.id)
        setLoading(false)
        if (res.error) alert(res.error)
        else router.refresh()
    }

    return (
        <Card className={`overflow-hidden border-l-4 transition-shadow hover:shadow-md ${
            isLive ? 'border-l-green-500 shadow-green-100/50 shadow-md' :
            isConfirmed ? 'border-l-primary/60' :
            'border-l-amber-400'
        }`}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                        {s.universityLogo ? (
                            <img src={s.universityLogo} alt={s.universityName} className="h-10 w-10 rounded-lg object-contain border border-gray-100" />
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{s.universityName}</p>
                            <p className="text-base font-semibold text-gray-800 mt-0.5">{s.title}</p>
                            {s.programName && <p className="text-xs text-primary mt-0.5">{s.programName}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                            isLive ? 'bg-green-100 text-green-800 border-green-200 animate-pulse' :
                            isConfirmed ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                            {isLive ? '🟢 Live Now' : isConfirmed ? 'Confirmed' : `Waitlist #${seat.waitlistPos}`}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Date/time/duration */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(s.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {s.durationMinutes} min
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Group session
                    </span>
                </div>

                {s.agenda && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{s.agenda}</p>
                )}

                {/* Seat bar — confirmed or waitlisted */}
                {(isConfirmed || isWaitlisted) && (
                    <SeatBar confirmed={s.confirmedCount} capacity={s.capacity} />
                )}

                {/* Waitlist emotional message */}
                {isWaitlisted && seat.waitlistPos && (
                    <WaitlistBanner pos={seat.waitlistPos} />
                )}

                {/* Recap link */}
                {isCompleted && s.recapUrl && (
                    <a href={s.recapUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-purple-700 font-medium hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Session Recap
                    </a>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                    {isLive && s.joinUrl && (
                        <a href={s.joinUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                                <Video className="h-3.5 w-3.5" />
                                Join Now
                            </Button>
                        </a>
                    )}
                    {isConfirmed && isUpcoming && !isLive && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            disabled={loading}
                            onClick={handleLeave}
                        >
                            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Give Up Seat'}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

// ─── Grid view (for dashboard section) ───────────────────────────────────────

export default function GroupSessionList({ seats }: { seats: StudentGroupSession[] }) {
    if (seats.length === 0) {
        return (
            <div className="text-center py-12 text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No group sessions yet. When a university invites you, it&apos;ll appear here.</p>
            </div>
        )
    }

    const upcoming = seats.filter(s => !['COMPLETED', 'CANCELLED'].includes(s.session.status))
    const past = seats.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.session.status))

    return (
        <div className="space-y-6">
            {upcoming.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming & Active</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {upcoming.map(seat => <GroupSessionCard key={seat.seatId} seat={seat} />)}
                    </div>
                </div>
            )}
            {past.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Past Sessions</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {past.map(seat => <GroupSessionCard key={seat.seatId} seat={seat} />)}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Individual discover session card ────────────────────────────────────────

export function DiscoverSessionCard({ session }: { session: DiscoverableGroupSession }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const isFull = session.status === 'FULL'

    const handleJoin = async () => {
        setLoading(true)
        const res = await joinGroupSession(session.id)
        setLoading(false)
        if (res.error) alert(res.error)
        else router.refresh()
    }

    return (
        <Card className={`overflow-hidden border-l-4 transition-shadow hover:shadow-md ${isFull ? 'border-l-gray-300' : 'border-l-blue-400'}`}>
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                        {session.universityLogo ? (
                            <img src={session.universityLogo} alt={session.universityName} className="h-10 w-10 rounded-lg object-contain border border-gray-100" />
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-gray-900 text-sm">{session.universityName}</p>
                            <p className="text-base font-semibold text-gray-800 mt-0.5">{session.title}</p>
                            {session.programName && <p className="text-xs text-primary mt-0.5">{session.programName}</p>}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${isFull ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                            {isFull ? 'Sold Out · Join Waitlist' : 'Open · Join Session'}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {new Date(session.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.durationMinutes} min
                    </span>
                </div>

                {session.agenda && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{session.agenda}</p>
                )}

                <SeatBar confirmed={session.confirmedCount} capacity={session.capacity} muted={isFull} />

                <div className="pt-2">
                    <Button
                        size="sm"
                        className={`w-full gap-2 ${isFull ? 'bg-gray-800 hover:bg-gray-900 text-white' : 'bg-primary hover:bg-primary/90 text-white'}`}
                        disabled={loading}
                        onClick={handleJoin}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {isFull ? 'Join Waitlist' : 'Reserve My Seat'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
