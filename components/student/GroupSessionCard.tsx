'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Calendar, Clock, Video, Users, GraduationCap, ExternalLink } from 'lucide-react'
import { joinGroupSession, leaveGroupSession } from '@/app/university/group-sessions/actions'
import { type StudentGroupSession, type DiscoverableGroupSession } from '@/app/university/actions/group-sessions'
import { useRouter } from 'next/navigation'

// ── Shared helper ─────────────────────────────────────────────────────────────
function formatSessionDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit'
    })
}

function SeatBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
    const pct = Math.min((confirmed / capacity) * 100, 100)
    const color = confirmed >= capacity ? 'bg-orange-500'
        : confirmed > capacity / 2 ? 'bg-blue-500'
        : 'bg-green-500'
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{confirmed} / {capacity} seats taken</span>
                {confirmed >= capacity
                    ? <span className="text-orange-600 font-medium">Full</span>
                    : <span className="text-green-600">{capacity - confirmed} left</span>
                }
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`}
                    style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}

// ── Discover Session Card (For the horizontal list) ──────────────────────────
export function DiscoverSessionCard({ session }: { session: DiscoverableGroupSession }) {
    const [joinOpen, setJoinOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{
        status?: string
        waitlistPos?: number | null
    } | null>(null)
    const router = useRouter()

    function handleJoin() {
        startTransition(async () => {
            const res = await joinGroupSession(session.id)
            if (res.error) {
                toast.error(res.error)
                setJoinOpen(false)
            } else {
                setResult({
                    status: res.status,
                    waitlistPos: res.waitlistPos
                })
                router.refresh()
            }
        })
    }

    const isFull = session.confirmedCount >= session.capacity
    const remaining = session.capacity - session.confirmedCount

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                    {/* Row 1: University + session title */}
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">
                            {session.universityName}
                        </p>
                        <h3 className="font-semibold text-gray-900 mt-0.5">
                            {session.title}
                        </h3>
                        {session.programName && (
                            <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {session.programName}
                            </p>
                        )}
                    </div>

                    {/* Row 2: Date + duration */}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatSessionDate(session.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {session.durationMinutes} mins
                        </span>
                    </div>

                    {/* Row 3: Agenda */}
                    {session.agenda && (
                        <p className="text-xs text-gray-600 line-clamp-2">
                            {session.agenda}
                        </p>
                    )}

                    {/* Row 4: Seat bar */}
                    <SeatBar
                        confirmed={session.confirmedCount}
                        capacity={session.capacity}
                    />

                    {/* Row 5: CTA */}
                    <Button
                        className="w-full"
                        size="sm"
                        variant={isFull ? 'outline' : 'default'}
                        onClick={() => setJoinOpen(true)}
                    >
                        {isFull
                            ? '⏳ Join Waitlist'
                            : `Reserve My Seat (${remaining} left)`
                        }
                    </Button>
                </CardContent>
            </Card>

            {/* Join confirmation modal */}
            <Dialog open={joinOpen} onOpenChange={open => {
                if (!open) {
                    setJoinOpen(false)
                    setResult(null)
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {result
                                ? result.status === 'CONFIRMED'
                                    ? '🎉 Seat Confirmed!'
                                    : `⏳ You're on the Waitlist`
                                : isFull
                                    ? 'Join Waitlist'
                                    : 'Reserve Your Seat'
                            }
                        </DialogTitle>
                    </DialogHeader>

                    {/* Pre-join confirmation */}
                    {!result && (
                        <div className="space-y-3">
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                <p className="font-medium">{session.title}</p>
                                <p className="text-muted-foreground">
                                    {session.universityName}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatSessionDate(session.scheduledAt)}
                                </p>
                                {isFull && (
                                    <p className="text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 text-xs">
                                        This session is full. You'll be added to the waitlist and notified if a seat opens.
                                    </p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setJoinOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleJoin} disabled={isPending}>
                                    {isPending
                                        ? 'Reserving...'
                                        : isFull
                                            ? 'Join Waitlist'
                                            : 'Confirm My Seat →'
                                    }
                                </Button>
                            </DialogFooter>
                        </div>
                    )}

                    {/* Post-join result */}
                    {result && (
                        <div className="space-y-4 text-center py-2">
                            {result.status === 'CONFIRMED' ? (
                                <>
                                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                                        🎉
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Your seat is confirmed for{' '}
                                        <strong>
                                            {formatSessionDate(session.scheduledAt)}
                                        </strong>.
                                        You'll receive a reminder before the session.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-3xl">
                                        ⏳
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        You're <strong>#{result.waitlistPos}</strong> on the waitlist. We'll notify you the moment a seat becomes available.
                                    </p>
                                </>
                            )}
                            <DialogFooter>
                                <Button className="w-full" onClick={() => {
                                    setJoinOpen(false)
                                    setResult(null)
                                }}>
                                    Done
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

// ── My Sessions List (The main default export) ───────────────────────────────
export default function GroupSessionList({
    seats
}: { seats: StudentGroupSession[] }) {
    const [confirmLeave, setConfirmLeave] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleLeave(seatId: string, sessionId: string) {
        startTransition(async () => {
            const res = await leaveGroupSession(sessionId)
            if (res.error) toast.error(res.error)
            else {
                toast.success('You have left the session.')
                setConfirmLeave(null)
                router.refresh()
            }
        })
    }

    if (seats.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-xl">
                <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-gray-600">No group sessions yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                    Sessions matching your interests will appear below
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {seats.map(({ seatId, seatStatus, waitlistPos, session }) => (
                <Card key={seatId} className={`
                    ${seatStatus === 'CONFIRMED'
                        ? 'border-green-200 bg-green-50/30'
                        : 'border-amber-200 bg-amber-50/30'}
                `}>
                    <CardContent className="p-4 space-y-3">

                        {/* Row 1: University + status badge */}
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground font-medium">
                                    {session.universityName}
                                </p>
                                <h3 className="font-semibold text-gray-900 mt-0.5">
                                    {session.title}
                                </h3>
                                {session.programName && (
                                    <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                        <GraduationCap className="h-3 w-3" />
                                        {session.programName}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                                {seatStatus === 'CONFIRMED' ? (
                                    <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                        ✅ Confirmed
                                    </Badge>
                                ) : (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                        ⏳ Waitlist #{waitlistPos}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Date + duration */}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {formatSessionDate(session.scheduledAt)}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {session.durationMinutes} mins
                            </span>
                        </div>

                        {/* Row 3: Agenda */}
                        {session.agenda && (
                            <p className="text-xs text-gray-600 line-clamp-2">
                                {session.agenda}
                            </p>
                        )}

                        {/* Row 4: Seat bar */}
                        <SeatBar
                            confirmed={session.confirmedCount}
                            capacity={session.capacity}
                        />

                        {/* Row 5: Actions */}
                        <div className="flex gap-2 pt-1">
                            {/* Join link — only for confirmed + session is LIVE */}
                            {seatStatus === 'CONFIRMED' && session.joinUrl && (
                                <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" asChild>
                                    <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                                        <Video className="h-3.5 w-3.5" /> Join Session
                                        <ExternalLink className="h-3 w-3 ml-1" />
                                    </a>
                                </Button>
                            )}

                            {/* Recap link */}
                            {session.recapUrl && (
                                <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                    <a href={session.recapUrl} target="_blank" rel="noopener noreferrer">
                                        🎬 Watch Recap
                                    </a>
                                </Button>
                            )}

                            {/* Leave session */}
                            {session.status !== 'COMPLETED' && session.status !== 'CANCELLED' && (
                                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto text-xs" onClick={() => setConfirmLeave(seatId)}>
                                    Leave
                                </Button>
                            )}
                        </div>

                        {/* Waitlist encouragement */}
                        {seatStatus === 'WAITLISTED' && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                🎯 You're #{waitlistPos} on the waitlist. We'll notify you instantly if a seat opens up.
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}

            {/* Leave confirmation dialog */}
            <Dialog open={!!confirmLeave} onOpenChange={open => !open && setConfirmLeave(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Leave this session?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        If you're confirmed, your seat will be given to the
                        next student on the waitlist.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmLeave(null)}>Cancel</Button>
                        <Button variant="destructive" disabled={isPending} onClick={() => {
                            const seat = seats.find(s => s.seatId === confirmLeave)
                            if (seat && confirmLeave) {
                                handleLeave(confirmLeave, seat.session.id)
                            }
                        }}>
                            {isPending ? 'Leaving...' : 'Yes, Leave Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
