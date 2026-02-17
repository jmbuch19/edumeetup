'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Video, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react'
import { updateMeetingStatus } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { RescheduleModal } from '@/components/meeting/RescheduleModal'

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
        fullName: string
        country: string | null
        user: {
            email: string
        }
    }
}

export default function MeetingList({ meetings }: { meetings: Meeting[] }) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [meetingLink, setMeetingLink] = useState<string>('')
    const [showLinkInputFor, setShowLinkInputFor] = useState<string | null>(null)

    const handleStatusUpdate = async (id: string, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') => {
        if (status === 'REJECTED' && !confirm('Are you sure you want to reject this meeting request?')) return
        if (status === 'CANCELLED' && !confirm('Are you sure you want to cancel this confirmed meeting?')) return

        if (status === 'CONFIRMED' && !showLinkInputFor) {
            setShowLinkInputFor(id)
            return
        }

        setProcessingId(id)
        const res = await updateMeetingStatus(id, status, meetingLink)
        setProcessingId(null)
        setShowLinkInputFor(null)
        setMeetingLink('')

        if (res.error) {
            alert(res.error)
        } else {
            router.refresh()
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-800'
            case 'PENDING': return 'bg-yellow-100 text-yellow-800'
            case 'REJECTED': return 'bg-red-100 text-red-800'
            case 'CANCELLED': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    if (meetings.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No meetings found</h3>
                <p className="text-gray-500">When students request meetings, they will appear here.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {meetings.map((meeting) => (
                <Card key={meeting.id} className="overflow-hidden hover:shadow-md transition-shadow border-l-4 border-l-primary/10">
                    <CardHeader className="bg-gray-50/50 pb-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    {meeting.student.fullName.charAt(0)}
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900">
                                        {meeting.student.fullName}
                                    </CardTitle>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {meeting.student.country || 'International'}
                                    </div>
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                                {meeting.status}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid gap-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                    {new Date(meeting.proposedDatetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-primary" />
                                <span>
                                    {new Date(meeting.proposedDatetime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                    <span className="text-gray-400 mx-1">•</span>
                                    {meeting.durationMinutes} mins
                                </span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg text-sm">
                            <div className="font-semibold text-gray-700 mb-1">Purpose:</div>
                            <div className="text-gray-600">{meeting.meetingPurpose}</div>
                            {meeting.studentQuestions && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                    <div className="font-semibold text-gray-700 mb-1">Questions/Notes:</div>
                                    <div className="text-gray-600 italic">"{meeting.studentQuestions}"</div>
                                </div>
                            )}
                        </div>

                        {meeting.status === 'CONFIRMED' && (
                            <div className="flex flex-col gap-2 text-sm text-green-700 bg-green-50 p-3 rounded border border-green-100">
                                <div className="flex items-center gap-2 font-medium">
                                    <Video className="h-4 w-4" />
                                    <span>Meeting Confirmed</span>
                                </div>
                                <div className="pl-6 text-xs text-green-800">
                                    ID: {meeting.meetingIdCode}
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
                    </CardContent>
                    <CardFooter className="bg-gray-50/30 pt-3 pb-3 flex justify-end gap-2">
                        {meeting.status === 'PENDING' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleStatusUpdate(meeting.id, 'REJECTED')}
                                    disabled={processingId === meeting.id}
                                >
                                    Reject
                                </Button>
                                {showLinkInputFor === meeting.id ? (
                                    <div className="flex gap-2 items-center animate-in slide-in-from-right-5 fade-in duration-200">
                                        <input
                                            type="text"
                                            placeholder="Paste Meeting Link (e.g. Google Meet)"
                                            className="text-sm border rounded px-2 py-1 w-60 focus:ring-2 focus:ring-green-500 outline-none"
                                            value={meetingLink}
                                            onChange={(e) => setMeetingLink(e.target.value)}
                                            autoFocus
                                        />
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => handleStatusUpdate(meeting.id, 'CONFIRMED')}
                                            disabled={processingId === meeting.id || !meetingLink}
                                        >
                                            Confirm
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setShowLinkInputFor(null)}>Cancel</Button>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => handleStatusUpdate(meeting.id, 'CONFIRMED')}
                                        disabled={processingId === meeting.id}
                                    >
                                        Accept Request
                                    </Button>
                                )}
                            </>
                        )}
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
                                    onClick={() => handleStatusUpdate(meeting.id, 'CANCELLED')}
                                    disabled={processingId === meeting.id}
                                >
                                    {processingId === meeting.id ? 'Cancelling...' : 'Cancel Meeting'}
                                </Button>
                            </>
                        )}
                        {meeting.status === 'RESCHEDULE_PROPOSED' && (
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleStatusUpdate(meeting.id, 'CONFIRMED')}
                                >
                                    Accept Reschedule
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleStatusUpdate(meeting.id, 'CANCELLED')}
                                >
                                    Decline
                                </Button>
                            </div>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
