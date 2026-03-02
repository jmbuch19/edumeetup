'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar, Clock, MapPin, Video, CheckCircle, XCircle,
    User, FileText, ChevronDown, ChevronUp, CalendarClock
} from 'lucide-react'
import { updateMeetingStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { RescheduleModal } from '@/components/meeting/RescheduleModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meeting {
    id: string
    meetingPurpose: string
    proposedDatetime: Date
    durationMinutes: number
    status: string
    studentQuestions?: string | null
    meetingIdCode?: string | null
    meetingLink?: string | null
    videoProvider?: string | null
    student: {
        id?: string
        fullName: string
        country: string | null
        cvFileName?: string | null
        user: { email: string }
    }
    nextAvailableSlots?: string[]  // ISO strings of suggested next slots
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
    'Time conflict — please choose another slot',
    'Student profile not a fit for our programs',
    'Please reschedule — see suggested times below',
    'Slot already taken — please book a new time',
    'Other (see note below)',
]

function statusBadge(status: string) {
    const map: Record<string, string> = {
        CONFIRMED: 'bg-green-100 text-green-800 border-green-200',
        PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
        CANCELLED: 'bg-red-100 text-red-800 border-red-200',
        REJECTED: 'bg-red-100 text-red-800 border-red-200',
        COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
        RESCHEDULE_PROPOSED: 'bg-purple-100 text-purple-800 border-purple-200',
    }
    return map[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
}

function fmtDate(dt: Date) {
    return new Date(dt).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
function fmtTime(dt: Date) {
    return new Date(dt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MeetingList({ meetings, compact }: { meetings: Meeting[]; compact?: boolean }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // Confirm flow
    const [meetingLink, setMeetingLink] = useState('')
    const [showLinkInputFor, setShowLinkInputFor] = useState<string | null>(null)

    // Reject-with-reason flow
    const [showRejectFor, setShowRejectFor] = useState<string | null>(null)
    const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0])
    const [customNote, setCustomNote] = useState('')

    const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id))

    const handleConfirm = async (id: string) => {
        if (!showLinkInputFor) { setShowLinkInputFor(id); return }
        setProcessingId(id)
        const res = await updateMeetingStatus(id, 'CONFIRMED', meetingLink)
        setProcessingId(null)
        setShowLinkInputFor(null)
        setMeetingLink('')
        if (res.error) alert(res.error)
        else router.refresh()
    }

    const handleReject = async (id: string) => {
        const fullReason = customNote ? `${selectedReason}\n\nNote: ${customNote}` : selectedReason
        setProcessingId(id)
        const res = await updateMeetingStatus(id, 'REJECTED', undefined, fullReason)
        setProcessingId(null)
        setShowRejectFor(null)
        setSelectedReason(REJECTION_REASONS[0])
        setCustomNote('')
        if (res.error) alert(res.error)
        else router.refresh()
    }

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this confirmed meeting?')) return
        setProcessingId(id)
        const res = await updateMeetingStatus(id, 'CANCELLED')
        setProcessingId(null)
        if (res.error) alert(res.error)
        else router.refresh()
    }

    if (meetings.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No meetings found</h3>
                <p className="text-gray-500 text-sm mt-1">When students request meetings, they will appear here.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {meetings.map((meeting) => {
                const isExpanded = expandedId === meeting.id
                const dt = new Date(meeting.proposedDatetime)

                return (
                    <Card key={meeting.id} className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary/30">

                        {/* ── Card Header (always visible) ── */}
                        <CardHeader
                            className="bg-gray-50/50 pb-3 cursor-pointer select-none"
                            onClick={() => toggleExpand(meeting.id)}
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg flex-shrink-0">
                                        {meeting.student.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900">
                                            {meeting.student.fullName}
                                        </CardTitle>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="h-3 w-3" />
                                            {meeting.student.country || 'International'}
                                            <span className="mx-1 text-gray-300">·</span>
                                            <Calendar className="h-3 w-3" />
                                            {fmtDate(dt)}
                                            <span className="mx-1 text-gray-300">·</span>
                                            <Clock className="h-3 w-3" />
                                            {fmtTime(dt)} ({meeting.durationMinutes} min)
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {meeting.student.id && meeting.student.cvFileName && (
                                        <a
                                            href={`/api/cv/${meeting.student.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-xs text-primary border border-primary/30 rounded-md px-2 py-1 hover:bg-primary/5 transition-colors"
                                        >
                                            <FileText className="h-3.5 w-3.5" />
                                            CV
                                        </a>
                                    )}
                                    {/* Surfaced join link for CONFIRMED meetings */}
                                    {meeting.status === 'CONFIRMED' && meeting.meetingLink && (
                                        <a
                                            href={meeting.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded-md px-2 py-1 transition-colors font-medium"
                                        >
                                            <Video className="h-3.5 w-3.5" />
                                            Join
                                        </a>
                                    )}
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge(meeting.status)}`}>
                                        {meeting.status}
                                    </span>
                                    {isExpanded
                                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                        : <ChevronDown className="h-4 w-4 text-gray-400" />
                                    }
                                </div>
                            </div>
                        </CardHeader>

                        {/* ── Expanded timetable detail panel ── */}
                        {isExpanded && (
                            <CardContent className="pt-4 grid gap-4 border-t border-gray-100">

                                {/* Timetable block */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-primary/5 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500 mb-1">Date</div>
                                        <div className="font-semibold text-gray-900 text-sm">
                                            {new Date(dt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500 mb-1">Time</div>
                                        <div className="font-semibold text-gray-900 text-sm">{fmtTime(dt)}</div>
                                    </div>
                                    <div className="bg-primary/5 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500 mb-1">Duration</div>
                                        <div className="font-semibold text-gray-900 text-sm">{meeting.durationMinutes} min</div>
                                    </div>
                                    <div className="bg-primary/5 rounded-lg p-3 text-center">
                                        <div className="text-xs text-gray-500 mb-1">Platform</div>
                                        <div className="font-semibold text-gray-900 text-sm">{meeting.videoProvider || '—'}</div>
                                    </div>
                                </div>

                                {/* Student details */}
                                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <User className="h-4 w-4 text-primary flex-shrink-0" />
                                        <span className="font-medium">{meeting.student.fullName}</span>
                                        <span className="text-gray-400">·</span>
                                        <a href={`mailto:${meeting.student.user.email}`} className="text-blue-600 hover:underline">
                                            {meeting.student.user.email}
                                        </a>
                                    </div>
                                    <div className="pl-6 text-gray-600">
                                        <span className="font-medium text-gray-700">Purpose:</span> {meeting.meetingPurpose}
                                    </div>
                                    {meeting.studentQuestions && (
                                        <div className="pl-6 text-gray-600 italic border-l-2 border-primary/20 ml-5">
                                            "{meeting.studentQuestions}"
                                        </div>
                                    )}
                                </div>

                                {/* Confirmed meeting link */}
                                {meeting.status === 'CONFIRMED' && (
                                    <div className="flex flex-col gap-1 text-sm text-green-700 bg-green-50 p-3 rounded border border-green-100">
                                        <div className="flex items-center gap-2 font-medium">
                                            <CheckCircle className="h-4 w-4" />
                                            Meeting Confirmed · ID: {meeting.meetingIdCode}
                                        </div>
                                        {meeting.meetingLink && (
                                            <div className="pl-6">
                                                <a href={meeting.meetingLink} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">
                                                    Join Meeting Link
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Next available slots (if provided) */}
                                {meeting.nextAvailableSlots && meeting.nextAvailableSlots.length > 0 && (
                                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                                        <div className="flex items-center gap-2 font-semibold text-blue-800 mb-2">
                                            <CalendarClock className="h-4 w-4" />
                                            Next Available Slots
                                        </div>
                                        <ul className="space-y-1 pl-6">
                                            {meeting.nextAvailableSlots.map((slot, i) => (
                                                <li key={i} className="text-blue-700">
                                                    {fmtDate(new Date(slot))} at {fmtTime(new Date(slot))}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        )}

                        {/* ── Action footer ── */}
                        <CardFooter className="bg-gray-50/30 pt-3 pb-3 flex flex-wrap justify-end gap-2">

                            {/* PENDING actions */}
                            {meeting.status === 'PENDING' && (
                                <>
                                    {/* Reject flow */}
                                    {showRejectFor === meeting.id ? (
                                        <div className="w-full space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <div className="text-sm font-medium text-gray-700">Rejection reason:</div>
                                            <select
                                                className="w-full text-sm border rounded-md px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none"
                                                value={selectedReason}
                                                onChange={e => setSelectedReason(e.target.value)}
                                            >
                                                {REJECTION_REASONS.map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                            <textarea
                                                className="w-full text-sm border rounded-md px-3 py-2 focus:ring-2 focus:ring-red-400 outline-none resize-none"
                                                rows={2}
                                                placeholder="Optional: add a personal note or suggest alternative times…"
                                                value={customNote}
                                                onChange={e => setCustomNote(e.target.value)}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setShowRejectFor(null)}>
                                                    Back
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                    disabled={processingId === meeting.id}
                                                    onClick={() => handleReject(meeting.id)}
                                                >
                                                    {processingId === meeting.id ? 'Sending…' : 'Send Rejection'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            onClick={() => { setShowRejectFor(meeting.id); if (!isExpanded) toggleExpand(meeting.id) }}
                                        >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Reject
                                        </Button>
                                    )}

                                    {/* Accept / link flow */}
                                    {showRejectFor !== meeting.id && (
                                        showLinkInputFor === meeting.id ? (
                                            <div className="flex gap-2 items-center animate-in slide-in-from-right-5 fade-in duration-200">
                                                <input
                                                    type="url"
                                                    placeholder="Paste Google Meet / Zoom link…"
                                                    className="text-sm border rounded px-2 py-1.5 w-64 focus:ring-2 focus:ring-green-500 outline-none"
                                                    value={meetingLink}
                                                    onChange={e => setMeetingLink(e.target.value)}
                                                    autoFocus
                                                />
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleConfirm(meeting.id)}
                                                    disabled={processingId === meeting.id || !meetingLink}
                                                >
                                                    {processingId === meeting.id ? 'Confirming…' : 'Confirm'}
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setShowLinkInputFor(null)}>Cancel</Button>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => handleConfirm(meeting.id)}
                                                disabled={processingId === meeting.id}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Accept Request
                                            </Button>
                                        )
                                    )}
                                </>
                            )}

                            {/* CONFIRMED actions */}
                            {meeting.status === 'CONFIRMED' && (
                                <>
                                    <RescheduleModal
                                        meetingId={meeting.id}
                                        currentDate={new Date(meeting.proposedDatetime)}
                                        onSuccess={() => router.refresh()}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleCancel(meeting.id)}
                                        disabled={processingId === meeting.id}
                                    >
                                        {processingId === meeting.id ? 'Cancelling…' : 'Cancel Meeting'}
                                    </Button>
                                </>
                            )}

                            {/* RESCHEDULE_PROPOSED actions */}
                            {meeting.status === 'RESCHEDULE_PROPOSED' && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="default" onClick={() => handleConfirm(meeting.id)}>
                                        Accept Reschedule
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleCancel(meeting.id)}>
                                        Decline
                                    </Button>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
