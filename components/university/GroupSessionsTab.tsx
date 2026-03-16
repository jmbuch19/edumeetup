'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    Users, Plus, Bell, Video, Clock, Calendar,
    ChevronDown, ChevronUp, Share2
} from 'lucide-react'
import {
    createGroupSession,
    notifyMatchedStudents,
    shareRecap,
    createFollowUpSession,
} from '@/app/university/group-sessions/actions'

interface GroupSession {
    id: string
    title: string
    agenda: string | null
    scheduledAt: Date
    durationMinutes: number
    capacity: number
    status: string
    joinUrl: string | null
    recapUrl: string | null
    notifiedCount: number
    followUpDraftId: string | null
    seats: {
        id: string
        status: string
        waitlistPos: number | null
        student: {
            fullName: string | null
            user: { email: string }
        }
    }[]
}

interface Props {
    universityId: string
    sessions: GroupSession[]
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        DRAFT:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600' },
        OPEN:      { label: 'Open',      className: 'bg-green-100 text-green-700' },
        FILLING:   { label: 'Filling',   className: 'bg-blue-100 text-blue-700' },
        FULL:      { label: 'Full 🔥',   className: 'bg-orange-100 text-orange-700' },
        LIVE:      { label: 'Live Now',  className: 'bg-red-100 text-red-700 animate-pulse' },
        COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-500' },
        CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-400' },
    }
    const { label, className } = map[status] ?? { label: status, className: '' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${className}`}>{label}</span>
}

const confirmedCount = (s: GroupSession) =>
    s.seats.filter(seat => seat.status === 'CONFIRMED').length

const waitlistCount = (s: GroupSession) =>
    s.seats.filter(seat => seat.status === 'WAITLISTED').length

export function GroupSessionsTab({  sessions }: Props) {
    const [createOpen, setCreateOpen] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)
    const [followUpOpen, setFollowUpOpen] = useState(false)
    const [followUpSessionId, setFollowUpSessionId] = useState<string | null>(null)
    const [followUpDate, setFollowUpDate] = useState('')
    const [recapOpen, setRecapOpen] = useState(false)
    const [recapSessionId, setRecapSessionId] = useState<string | null>(null)
    const [recapUrl, setRecapUrl] = useState('')
    const [isPending, startTransition] = useTransition()

    // Create session form state
    const [title, setTitle] = useState('')
    const [agenda, setAgenda] = useState('')
    const [scheduledAt, setScheduledAt] = useState('')
    const [durationMinutes, setDurationMinutes] = useState(45)
    const [capacity, setCapacity] = useState(10)
    const [joinUrl, setJoinUrl] = useState('')
    const [targetField, setTargetField] = useState('')

    function toggleExpand(id: string) {
        setExpanded(prev => prev === id ? null : id)
    }

    function handleNotify(sessionId: string) {
        startTransition(async () => {
            const res = await notifyMatchedStudents(sessionId)
            if (res.error) toast.error(res.error)
            else toast.success(`✅ ${res.notifiedCount} students notified`)
        })
    }

    function openFollowUp(sessionId: string) {
        setFollowUpSessionId(sessionId)
        setFollowUpOpen(true)
    }

    function handleFollowUp() {
        if (!followUpSessionId || !followUpDate) return
        startTransition(async () => {
            const res = await createFollowUpSession(followUpSessionId, followUpDate)
            if (res.error) toast.error(res.error)
            else {
                toast.success(`✅ Follow-up created. ${res.notifiedWaitlist} waitlisted students notified.`)
                setFollowUpOpen(false)
                setFollowUpDate('')
            }
        })
    }

    function openRecap(sessionId: string) {
        setRecapSessionId(sessionId)
        setRecapOpen(true)
    }

    function handleRecap() {
        if (!recapSessionId || !recapUrl.trim()) return
        startTransition(async () => {
            const res = await shareRecap(recapSessionId, recapUrl)
            if (res.error) toast.error(res.error)
            else {
                toast.success(`✅ Recap shared with ${res.notifiedCount} students`)
                setRecapOpen(false)
                setRecapUrl('')
            }
        })
    }

    function handleCreateSession() {
        if (!title.trim() || !scheduledAt) {
            toast.error("Please fill in title and date.")
            return
        }
        startTransition(async () => {
            const res = await createGroupSession({
                title,
                agenda,
                scheduledAt,
                durationMinutes,
                capacity,
                joinUrl,
                targetField
            })
            
            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success(`Session created! ${res.matchedCount} matching students found.`)
                setCreateOpen(false)
                setTitle('')
                setAgenda('')
                setScheduledAt('')
                setDurationMinutes(45)
                setCapacity(10)
                setJoinUrl('')
                setTargetField('')
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold">Group Sessions</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Host up to 10 students in a single info session
                    </p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" /> New Group Session
                </Button>
            </div>

            {/* Sessions list */}
            {sessions.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-xl">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-medium text-gray-600">No group sessions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create your first session to host multiple students at once
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sessions.map(session => (
                        <Card key={session.id} className={`
                            ${session.status === 'FULL' ? 'border-orange-300 bg-orange-50/30' : ''}
                            ${session.status === 'CANCELLED' ? 'opacity-50' : ''}
                        `}>
                            <CardContent className="p-5">
                                {/* Row 1: Title + Status badge + expand toggle */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{session.title}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            <Calendar className="inline h-3 w-3 mr-1" />
                                            {new Date(session.scheduledAt).toLocaleDateString('en-IN', {
                                                weekday: 'short', day: 'numeric', month: 'short',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                            <Clock className="inline h-3 w-3 ml-3 mr-1" />
                                            {session.durationMinutes} mins
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={session.status} />
                                        <button onClick={() => toggleExpand(session.id)}>
                                            {expanded === session.id
                                                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                                : <ChevronDown className="h-4 w-4 text-gray-400" />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Seat progress bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>
                                            {confirmedCount(session)} confirmed
                                            {waitlistCount(session) > 0 &&
                                                <span className="text-amber-600 ml-2">
                                                    +{waitlistCount(session)} waitlisted
                                                </span>
                                            }
                                        </span>
                                        <span>{session.capacity} seats total</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                confirmedCount(session) >= session.capacity
                                                    ? 'bg-orange-500'
                                                    : confirmedCount(session) > session.capacity / 2
                                                        ? 'bg-blue-500'
                                                        : 'bg-green-500'
                                            }`}
                                            style={{ width: `${Math.min((confirmedCount(session) / session.capacity) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Row 3: Action buttons */}
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {/* Notify students */}
                                    {['OPEN', 'FILLING'].includes(session.status) && (
                                        <Button size="sm" variant="outline" className="gap-1.5"
                                            onClick={() => handleNotify(session.id)}
                                            disabled={isPending}
                                        >
                                            <Bell className="h-3.5 w-3.5" />
                                            Notify Students
                                            {session.notifiedCount > 0 &&
                                                <span className="text-xs text-muted-foreground ml-1">
                                                    ({session.notifiedCount} notified)
                                                </span>
                                            }
                                        </Button>
                                    )}

                                    {/* Video link */}
                                    {session.joinUrl && (
                                        <Button size="sm" variant="outline" className="gap-1.5" asChild>
                                            <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                                                <Video className="h-3.5 w-3.5" /> Join Link
                                            </a>
                                        </Button>
                                    )}

                                    {/* Follow-up session — shown when FULL and no follow-up exists */}
                                    {session.status === 'FULL' && !session.followUpDraftId && (
                                        <Button size="sm" className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                                            onClick={() => openFollowUp(session.id)}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Open Follow-up Session
                                            {waitlistCount(session) > 0 &&
                                                <span className="ml-1">
                                                    ({waitlistCount(session)} waiting)
                                                </span>
                                            }
                                        </Button>
                                    )}

                                    {/* Follow-up already created */}
                                    {session.followUpDraftId && (
                                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                                            ✅ Follow-up session created
                                        </Badge>
                                    )}

                                    {/* Share recap — shown after COMPLETED */}
                                    {session.status === 'COMPLETED' && (
                                        <Button size="sm" variant="outline" className="gap-1.5"
                                            onClick={() => openRecap(session.id)}
                                        >
                                            <Share2 className="h-3.5 w-3.5" /> Share Recap
                                        </Button>
                                    )}
                                </div>

                                {/* Expanded — student list */}
                                {expanded === session.id && (
                                    <div className="mt-4 border-t pt-4 space-y-2">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                                            Registered Students
                                        </p>
                                        {session.seats.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No students yet.</p>
                                        ) : (
                                            session.seats.map(seat => (
                                                <div key={seat.id}
                                                    className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                                                    <span className="font-medium text-gray-700">
                                                        {seat.student.fullName ?? seat.student.user.email}
                                                    </span>
                                                    <Badge variant={
                                                        seat.status === 'CONFIRMED' ? 'default' :
                                                        seat.status === 'WAITLISTED' ? 'secondary' : 'outline'
                                                    } className="text-xs">
                                                        {seat.status === 'WAITLISTED'
                                                            ? `Waitlist #${seat.waitlistPos}`
                                                            : seat.status}
                                                    </Badge>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Session Modal */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Create Group Session</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                placeholder="e.g. MS in Computer Science Info Session"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="agenda">Agenda</Label>
                            <Textarea
                                id="agenda"
                                placeholder="What will be covered?"
                                value={agenda}
                                onChange={e => setAgenda(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="date">Date & Time *</Label>
                                <Input
                                    id="date"
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={e => setScheduledAt(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="duration">Duration (mins)</Label>
                                <select 
                                    id="duration" 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={durationMinutes}
                                    onChange={e => setDurationMinutes(Number(e.target.value))}
                                >
                                    <option value={30}>30 mins</option>
                                    <option value={45}>45 mins</option>
                                    <option value={60}>60 mins</option>
                                    <option value={90}>90 mins</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="capacity">Max Seats</Label>
                                <select 
                                    id="capacity" 
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={capacity}
                                    onChange={e => setCapacity(Number(e.target.value))}
                                >
                                    {[2,3,4,5,6,7,8,9,10].map(n => (
                                        <option key={n} value={n}>{n} seats</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="targetField">Target Field</Label>
                                <Input
                                    id="targetField"
                                    placeholder="e.g. Computer Science"
                                    value={targetField}
                                    onChange={e => setTargetField(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="joinUrl">Video Link</Label>
                            <Input
                                id="joinUrl"
                                placeholder="Paste Zoom/Meet/Teams URL"
                                value={joinUrl}
                                onChange={e => setJoinUrl(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSession} disabled={isPending}>
                            {isPending ? 'Creating...' : 'Create Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Follow-up modal */}
            <Dialog open={followUpOpen} onOpenChange={setFollowUpOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Schedule Follow-up Session</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Waitlisted students will be notified first when you publish this session.
                    </p>
                    <div className="space-y-2">
                        <Label>New Date & Time</Label>
                        <Input
                            type="datetime-local"
                            value={followUpDate}
                            onChange={e => setFollowUpDate(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFollowUpOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleFollowUp} disabled={!followUpDate || isPending}>
                            {isPending ? 'Creating...' : 'Create & Notify Waitlist →'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Recap modal */}
            <Dialog open={recapOpen} onOpenChange={setRecapOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Session Recap</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        All registered and waitlisted students will receive a notification with this link.
                    </p>
                    <div className="space-y-2">
                        <Label>Recap URL</Label>
                        <Input
                            placeholder="https://drive.google.com/..."
                            value={recapUrl}
                            onChange={e => setRecapUrl(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRecapOpen(false)}>Cancel</Button>
                        <Button onClick={handleRecap} disabled={!recapUrl.trim() || isPending}>
                            {isPending ? 'Sharing...' : 'Share with All Students →'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    )
}
