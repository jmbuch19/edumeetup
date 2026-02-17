'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Video, XCircle, ExternalLink } from 'lucide-react'
import { cancelMeetingByStudent } from '@/app/actions'
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
    videoProvider?: string | null
    university: {
        institutionName: string
        country: string
        city: string | null
    }
    rep?: {
        name?: string | null
        email?: string | null
    } | null
}

export default function StudentMeetingList({ meetings }: { meetings: Meeting[] }) {
    const router = useRouter()
    const [cancellingId, setCancellingId] = useState<string | null>(null)

    const handleCancel = async (id: string) => {
        if (!confirm('Are you sure you want to cancel this meeting?')) return

        setCancellingId(id)
        const res = await cancelMeetingByStudent(id, "Student requested cancellation")
        setCancellingId(null)

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
                <h3 className="text-lg font-medium text-gray-900">No meetings yet</h3>
                <p className="text-gray-500 mb-6">Book a meeting with a university to see it here.</p>
                <Button onClick={() => router.push('/universities')}>Browse Universities</Button>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {meetings.map((meeting) => (
                <Card key={meeting.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gray-50/50 pb-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">
                                    {meeting.university.institutionName}
                                </CardTitle>
                                <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {meeting.university.city}, {meeting.university.country}
                                </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                                {meeting.status}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 grid gap-3">
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span className="font-medium">
                                {new Date(meeting.proposedDatetime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-700">Purpose:</span>
                            <span>{meeting.meetingPurpose}</span>
                        </div>

                        {meeting.status === 'CONFIRMED' && (
                            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-100">
                                <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                                    <Video className="h-4 w-4" />
                                    Meeting Link
                                </div>
                                <a
                                    href="https://meet.google.com"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm text-green-700 hover:underline flex items-center gap-1"
                                >
                                    Join Google Meet <ExternalLink className="h-3 w-3" />
                                </a>
                                <div className="text-xs text-green-600 mt-1">
                                    ID: {meeting.meetingIdCode}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-gray-50/30 pt-3 pb-3 flex justify-end gap-2">
                        {(meeting.status === 'PENDING' || meeting.status === 'CONFIRMED') && (
                            <>
                                {meeting.status === 'CONFIRMED' && (
                                    <RescheduleModal
                                        meetingId={meeting.id}
                                        currentDate={new Date(meeting.proposedDatetime)}
                                        onSuccess={() => router.refresh()}
                                    />
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleCancel(meeting.id)}
                                    disabled={cancellingId === meeting.id}
                                >
                                    {cancellingId === meeting.id ? 'Cancelling...' : 'Cancel Meeting'}
                                </Button>
                            </>
                        )}
                        {meeting.status === 'RESCHEDULE_PROPOSED' && (
                            <div className="flex bg-yellow-50 p-2 rounded text-yellow-800 text-sm items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>Reschedule Proposed pending confirmation.</span>
                            </div>
                        )}
                        {meeting.status === 'CANCELLED' && (
                            <span className="text-xs text-gray-500 italic">Cancelled</span>
                        )}
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}
