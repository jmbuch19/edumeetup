'use client'

import { useState } from 'react'
import { updateRSVP } from '@/app/actions/meeting'
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
                    <div key={participant.meetingId} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                        {/* ... existing header ... */}

                        {/* We need to be careful with replace, verifying context. 
                           Actually, better to replace the specific block inside the map.
                           I will target the map function start or just the render part.
                        */}

                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{meeting.title}</h3>
                                <p className="text-sm text-gray-600 font-medium">{meeting.university.institutionName}</p>

                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {startTime.toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {meeting.timezone && <span className="text-xs text-gray-400">({meeting.timezone})</span>}
                                    </div>
                                    <Badge variant="outline">{meeting.meetingType}</Badge>
                                </div>
                                {meeting.agenda && (
                                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded max-w-md">
                                        <span className="font-semibold">Agenda:</span> {meeting.agenda}
                                    </p>
                                )}
                            </div>

                            {/* ... status badge ... */}
                            <div className="text-right">
                                <Badge className={
                                    isPast ? 'bg-gray-100 text-gray-800' :
                                        participant.rsvpStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                            participant.rsvpStatus === 'DECLINED' ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                                'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                                }>
                                    {isPast ? 'COMPLETED' : participant.rsvpStatus}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 pt-4 border-t border-gray-100 gap-4">
                            {showJoin ? (
                                <a href={meeting.joinUrl!} target="_blank" rel="noopener noreferrer">
                                    <Button className="gap-2 animate-pulse bg-blue-600 hover:bg-blue-700">
                                        <Video className="h-4 w-4" />
                                        Join Meeting
                                    </Button>
                                </a>
                            ) : (
                                <div className="text-sm text-gray-500">
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
                                            onClick={() => handleRSVP(meeting.id, 'ACCEPTED')}
                                            disabled={loadingId === meeting.id}
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Check className="h-4 w-4 mr-1" /> Accept
                                        </Button>
                                    )}
                                    {participant.rsvpStatus !== 'DECLINED' && (
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleRSVP(meeting.id, 'DECLINED')}
                                            disabled={loadingId === meeting.id}
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
