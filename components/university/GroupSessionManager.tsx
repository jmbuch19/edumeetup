'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Users, CalendarDays, Clock, Video, ChevronDown, ChevronUp,
    Send, BarChart2, Bell, Share2, Plus, AlertTriangle
} from 'lucide-react'
import {
    notifyMatchedStudents, publishFollowUpDraft, shareRecap, startGroupSession,
    type GroupSessionWithStats
} from '@/app/university/actions/group-sessions'
import { useRouter } from 'next/navigation'

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadge(status: string) {
    const map: Record<string, string> = {
        DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
        OPEN: 'bg-green-100 text-green-800 border-green-200',
        FILLING: 'bg-amber-100 text-amber-800 border-amber-200',
        FULL: 'bg-red-100 text-red-800 border-red-200',
        LIVE: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse',
        COMPLETED: 'bg-purple-100 text-purple-800 border-purple-200',
        CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    }
    return map[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

function fmtDate(dt: Date) {
    return new Date(dt).toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}

// ─── Seat fill bar ────────────────────────────────────────────────────────────

function SeatBar({ confirmed, capacity }: { confirmed: number; capacity: number }) {
    const pct = Math.round((confirmed / capacity) * 100)
    const color = pct >= 100 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-green-500'
    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{confirmed}/{capacity} seats taken</span>
                <span>{capacity - confirmed} remaining</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
        </div>
    )
}

// ─── Follow-up prompt ─────────────────────────────────────────────────────────

function FollowUpPrompt({ session, followUpDraftId, onDone }: {
    session: GroupSessionWithStats
    followUpDraftId: string
    onDone: () => void
}) {
    const [datetime, setDatetime] = useState('')
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const router = useRouter()

    const handlePublish = async () => {
        if (!datetime) return
        setLoading(true)
        const res = await publishFollowUpDraft(followUpDraftId, new Date(datetime).toISOString())
        setLoading(false)
        if (res.error) alert(res.error)
        else { setDone(true); router.refresh(); onDone() }
    }

    if (done) return null

    return (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900">
                        {session.waitlistedCount} students couldn&apos;t get in. A follow-up draft is ready.
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                        Pick a time and publish — we&apos;ll notify the waitlisted students first.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <input
                            type="datetime-local"
                            className="text-sm border border-amber-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-amber-400 outline-none bg-white"
                            value={datetime}
                            onChange={e => setDatetime(e.target.value)}
                        />
                        <Button
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={!datetime || loading}
                            onClick={handlePublish}
                        >
                            {loading ? 'Publishing…' : 'Set Time & Publish →'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Start Meeting panel ──────────────────────────────────────────────────────

function StartMeetingPanel({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleStart = async () => {
        if (!url) return
        setLoading(true)
        const res = await startGroupSession(sessionId, url)
        setLoading(false)
        if (res.error) alert(res.error)
        else {
            alert(`Session is now LIVE! ${res.notified} student${res.notified !== 1 ? 's' : ''} notified with join link.`)
            router.refresh()
            onDone()
        }
    }

    return (
        <div className="animate-in slide-in-from-bottom-2 duration-300 mt-3 p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
            <p className="text-sm font-semibold text-green-900">Paste your meeting link below</p>
            <p className="text-xs text-green-700">
                Works with any link — Google Meet, Zoom, Teams, Whereby, Jitsi etc.
                Students will receive it by email and in their dashboard instantly.
            </p>
            <div className="flex gap-2 items-center">
                <input
                    type="url"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    className="text-sm border border-green-300 rounded-md px-3 py-2 flex-1 focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    autoFocus
                />
                <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white gap-1.5 whitespace-nowrap"
                    disabled={!url || loading}
                    onClick={handleStart}
                >
                    <Video className="h-3.5 w-3.5" />
                    {loading ? 'Starting…' : 'Start Meeting →'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
            </div>
        </div>
    )
}



function ShareRecapPanel({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleShare = async () => {
        if (!url) return
        setLoading(true)
        const res = await shareRecap(sessionId, url)
        setLoading(false)
        if (res.error) alert(res.error)
        else { alert(`Recap sent to ${res.reached} students.`); router.refresh(); onDone() }
    }

    return (
        <div className="flex gap-2 items-center mt-2 animate-in fade-in duration-200">
            <input
                type="url"
                placeholder="Paste recording / slides URL…"
                className="text-sm border rounded px-2 py-1.5 flex-1 focus:ring-2 focus:ring-purple-400 outline-none"
                value={url}
                onChange={e => setUrl(e.target.value)}
                autoFocus
            />
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={!url || loading} onClick={handleShare}>
                {loading ? 'Sending…' : 'Send Recap'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
        </div>
    )
}

// ─── Single session card ──────────────────────────────────────────────────────

function SessionCard({ session }: { session: GroupSessionWithStats }) {
    const router = useRouter()
    const [expanded, setExpanded] = useState(false)
    const [notifying, setNotifying] = useState(false)
    const [showRecap, setShowRecap] = useState(false)
    const [showStartPanel, setShowStartPanel] = useState(false)

    const handleNotify = async () => {
        setNotifying(true)
        const res = await notifyMatchedStudents(session.id)
        setNotifying(false)
        if (res.error) alert(res.error)
        else { alert(`Notified ${res.notified} students.`); router.refresh() }
    }

    const isFull = session.status === 'FULL'
    const isCompleted = session.status === 'COMPLETED'
    const isDraft = session.status === 'DRAFT'
    const isLive = session.status === 'LIVE'
    const canStart = ['OPEN', 'FILLING', 'FULL'].includes(session.status)

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary/40">
            {/* ── Header ── */}
            <CardHeader
                className="bg-gray-50/50 pb-3 cursor-pointer select-none"
                onClick={() => setExpanded(prev => !prev)}
            >
                <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-gray-900">{session.title}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 mt-0.5">
                                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{fmtDate(session.scheduledAt)}</span>
                                <span className="text-gray-300">·</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{session.durationMinutes} min</span>
                                {session.programName && <><span className="text-gray-300">·</span><span>{session.programName}</span></>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(session.status)}`}>
                            {session.status}
                        </span>
                        {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                </div>

                {/* Seat fill bar always visible */}
                <div className="mt-3">
                    <SeatBar confirmed={session.confirmedCount} capacity={session.capacity} />
                </div>
                {session.waitlistedCount > 0 && (
                    <p className="text-xs text-amber-700 mt-1">+{session.waitlistedCount} on waitlist</p>
                )}
            </CardHeader>

            {/* ── Expanded details ── */}
            {expanded && (
                <CardContent className="pt-4 space-y-4 border-t border-gray-100">
                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { icon: Users, label: 'Confirmed', value: session.confirmedCount, color: 'text-green-700 bg-green-50' },
                            { icon: BarChart2, label: 'Waitlisted', value: session.waitlistedCount, color: 'text-amber-700 bg-amber-50' },
                            { icon: Bell, label: 'Notified', value: session.notifiedCount, color: 'text-blue-700 bg-blue-50' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
                                <Icon className="h-4 w-4 mx-auto mb-1 opacity-70" />
                                <div className="text-lg font-bold">{value}</div>
                                <div className="text-xs">{label}</div>
                            </div>
                        ))}
                    </div>

                    {session.agenda && (
                        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                            <span className="font-medium text-gray-700">Agenda: </span>{session.agenda}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        {!isDraft && !isFull && !isCompleted && !isLive && (
                            <Button size="sm" variant="outline" className="gap-1.5" disabled={notifying} onClick={handleNotify}>
                                <Send className="h-3.5 w-3.5" />
                                {notifying ? 'Notifying…' : 'Notify Matched Students'}
                            </Button>
                        )}

                        {/* Start Meeting CTA — shown when not yet LIVE */}
                        {canStart && (
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                onClick={() => setShowStartPanel(prev => !prev)}
                            >
                                <Video className="h-3.5 w-3.5" />
                                {showStartPanel ? 'Cancel' : 'Start Meeting'}
                            </Button>
                        )}

                        {/* Join session — shown when LIVE */}
                        {isLive && session.joinUrl && (
                            <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 animate-pulse">
                                    <Video className="h-3.5 w-3.5" />
                                    🟢 Join Live Session
                                </Button>
                            </a>
                        )}

                        {isFull && session.waitlistedCount > 0 && (
                            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {session.waitlistedCount} couldn&apos;t get in
                            </span>
                        )}

                        {isCompleted && !session.recapUrl && (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowRecap(true)}>
                                <Share2 className="h-3.5 w-3.5" />
                                Share Recap
                            </Button>
                        )}

                        {session.recapUrl && (
                            <a href={session.recapUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-purple-700 border border-purple-200 rounded-md px-2 py-1 hover:bg-purple-50">
                                <Share2 className="h-3.5 w-3.5" />
                                Recap Shared
                            </a>
                        )}
                    </div>

                    {/* Start Meeting input panel */}
                    {showStartPanel && !isLive && (
                        <StartMeetingPanel sessionId={session.id} onDone={() => setShowStartPanel(false)} />
                    )}

                    {showRecap && (
                        <ShareRecapPanel sessionId={session.id} onDone={() => setShowRecap(false)} />
                    )}

                    {/* Follow-up prompt */}
                    {isFull && session.followUpDraftId && session.waitlistedCount > 0 && (
                        <FollowUpPrompt
                            session={session}
                            followUpDraftId={session.followUpDraftId}
                            onDone={() => router.refresh()}
                        />
                    )}
                </CardContent>
            )}
        </Card>
    )
}

// ─── Main manager component ───────────────────────────────────────────────────

export default function GroupSessionManager({
    sessions,
    onCreateNew,
}: {
    sessions: GroupSessionWithStats[]
    onCreateNew: () => void
}) {
    const active = sessions.filter(s => !['COMPLETED', 'CANCELLED'].includes(s.status))
    const past = sessions.filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status))
    const hasFullWithWaitlist = active.some(s => s.status === 'FULL' && s.waitlistedCount > 0)

    return (
        <div className="space-y-6">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Group Sessions</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Host up to 10 students in one call</p>
                </div>
                <Button onClick={onCreateNew} className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Session
                </Button>
            </div>

            {/* Global follow-up banner */}
            {hasFullWithWaitlist && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-900">
                        Some sessions are full with students on the waitlist. Expand a session below to open a follow-up.
                    </p>
                </div>
            )}

            {sessions.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No group sessions yet</h3>
                    <p className="text-gray-500 text-sm mt-1">Create one to invite up to 10 students simultaneously.</p>
                    <Button className="mt-4 gap-2" onClick={onCreateNew}>
                        <Plus className="h-4 w-4" />
                        Create First Session
                    </Button>
                </div>
            ) : (
                <>
                    {active.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Upcoming & Active</h3>
                            {active.map(s => <SessionCard key={s.id} session={s} />)}
                        </div>
                    )}
                    {past.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Past Sessions</h3>
                            {past.map(s => <SessionCard key={s.id} session={s} />)}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
