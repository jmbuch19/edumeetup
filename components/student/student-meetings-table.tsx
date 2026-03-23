'use client'

import { useState } from 'react'
import { updateRSVP } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Video, Check, X } from 'lucide-react'

interface MeetingParticipantWithDetails {
    id: string
    meetingId: string
    rsvpStatus: string
    meeting: {
        id: string
        title: string
        startTime: Date
        endTime: Date
        meetingType: string
        joinUrl: string | null
        agenda: string | null
        timezone: string | null
        university: {
            institutionName: string
        }
    }
}

export function StudentMeetingsTable({ meetings }: { meetings: MeetingParticipantWithDetails[] }) {
    const [loadingId, setLoadingId] = useState<string | null>(null)

    const handleRSVP = async (meetingId: string, status: 'ACCEPTED' | 'DECLINED') => {
        setLoadingId(meetingId)
        const formData = new FormData()
        formData.append('meetingId', meetingId)
        formData.append('status', status)

        await updateRSVP(formData)
        setLoadingId(null)
    }

    if (meetings.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                <p className="text-gray-500">No meetings scheduled yet.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {meetings.map((participant) => {
                const { meeting } = participant
                const now = new Date()
                const startTime = new Date(meeting.startTime)
                const endTime = new Date(meeting.endTime)
                const isPast = endTime < now
                const timeDiff = startTime.getTime() - now.getTime()
                const isCloseEnough = timeDiff <= 15 * 60 * 1000 // 15 mins
                const isOngoing = now >= startTime && now <= endTime
                const showJoin = (isCloseEnough || isOngoing) && !isPast && meeting.joinUrl && participant.rsvpStatus === 'ACCEPTED'

                return (
                    <div key={participant.meetingId} className="glass-card hover-lift p-6 rounded-2xl relative overflow-hidden transition-all duration-200">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                {/* Status Dot */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${participant.rsvpStatus === 'ACCEPTED' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                                    <span style={{ fontFamily: 'var(--font-jakarta)', fontSize: 11, fontWeight: 700, color: '#888888', letterSpacing: '0.05em' }} className="uppercase">
                                        {isPast ? 'COMPLETED' : participant.rsvpStatus}
                                    </span>
                                </div>

                                <h3 style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 16, color: '#0B1340' }} className="leading-tight mb-0.5">
                                    {meeting.university.institutionName}
                                </h3>
                                <p className="text-sm font-medium text-gray-700 mb-2">{meeting.title}</p>

                                <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }} className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-1 text-[#0B1340]">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {startTime.toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {meeting.timezone && <span>({meeting.timezone})</span>}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5">{meeting.meetingType}</Badge>
                                </div>
                                {meeting.agenda && (
                                    <p className="text-xs text-gray-500 mt-3 p-2 rounded-lg max-w-md" style={{ backgroundColor: 'rgba(11, 19, 64, 0.04)' }}>
                                        <span className="font-semibold text-[#0B1340]">Agenda:</span> {meeting.agenda}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-5 pt-4 gap-4" style={{ borderTop: '1px solid #E8EAF6' }}>
                            {showJoin ? (
                                <a href={meeting.joinUrl!} target="_blank" rel="noopener noreferrer">
                                    <Button variant="indigo" className="gap-2">
                                        <Video className="h-4 w-4" />
                                        Join Meeting
                                    </Button>
                                </a>
                            ) : (
                                <div style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#888888' }}>
                                    {isPast ? "Meeting has ended" :
                                        participant.rsvpStatus !== 'ACCEPTED' ? "Accept to see join link" :
                                            !meeting.joinUrl ? "No link provided yet" :
                                                `Join link available 15 mins before start`}
                                </div>
                            )}

                            {!isPast && (
                                <div className="flex gap-2">
                                    {participant.rsvpStatus !== 'ACCEPTED' && (
                                        <Button
                                            size="sm"
                                            variant="outline-indigo"
                                            onClick={() => handleRSVP(meeting.id, 'ACCEPTED')}
                                            disabled={loadingId === meeting.id}
                                        >
                                            <Check className="h-4 w-4 mr-1" /> Accept
                                        </Button>
                                    )}
                                    {participant.rsvpStatus !== 'DECLINED' && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRSVP(meeting.id, 'DECLINED')}
                                            disabled={loadingId === meeting.id}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <X className="h-4 w-4 mr-1" /> Decline
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Follow-up Action for Past Group Meetings */}
                        {isPast && meeting.meetingType === 'GROUP' && participant.rsvpStatus === 'ACCEPTED' && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        if (!confirm("Request a 1:1 follow-up with this university?")) return
                                        setLoadingId(meeting.id)
                                        // Dynamic import for action to avoid client-side bundling issues if any
                                        const { requestFollowUp } = await import('@/app/actions/availability')
                                        const res = await requestFollowUp(meeting.id)
                                        if (res.success) {
                                            alert("Follow-up request sent!")
                                        } else {
                                            alert(res.error || "Failed to send request")
                                        }
                                        setLoadingId(null)
                                    }}
                                    disabled={loadingId === meeting.id}
                                >
                                    Request 1:1 Follow-up
                                </Button>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
