'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, MapPin, Video } from 'lucide-react'
import { cancelStudentMeeting } from '@/app/actions/meeting-student'
import { acceptMeetingReschedule, declineMeetingReschedule } from '@/app/actions/meeting-reschedule'
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
    rescheduleProposedBy?: string | null
    rescheduleProposedTime?: Date | null
    university: {
        institutionName: string
        country: string
        city: string | null
    }
    rep?: { name?: string | null; email?: string | null } | null
}

export default function StudentMeetingListHardened({ meetings }: { meetings: Meeting[] }) {
    const router = useRouter()
    const [processing, setProcessing] = useState<string | null>(null)

    const run = async (id: string, action: () => Promise<{ success?: boolean; error?: string }>) => {
        setProcessing(id)
        const result = await action()
        setProcessing(null)
        if (result.error) alert(result.error)
        else router.refresh()
    }

    if (!meetings.length) {
        return (
            <div className="text-center py-12">
                <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                <p className="text-gray-500">No meetings yet.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-4">
            {meetings.map((meeting) => {
                const date = new Date(meeting.proposedDatetime)
                const proposed = meeting.rescheduleProposedTime ? new Date(meeting.rescheduleProposedTime) : null
                return (
                    <Card key={meeting.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">{meeting.university.institutionName}</CardTitle>
                                    <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                                        <MapPin className="h-3.5 w-3.5" />
                                        {[meeting.university.city, meeting.university.country].filter(Boolean).join(', ')}
                                    </div>
                                </div>
                                <span className="rounded-full border px-2 py-1 text-xs font-medium">{meeting.status}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{date.toLocaleDateString()}</div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4" />{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meeting.durationMinutes} min</div>
                            <div><strong>Purpose:</strong> {meeting.meetingPurpose}</div>
                            {meeting.rep?.name && <div><strong>Representative:</strong> {meeting.rep.name}</div>}
                            {meeting.status === 'CONFIRMED' && meeting.meetingLink && (
                                <a className="inline-flex items-center gap-1 text-green-700 hover:underline" href={meeting.meetingLink} target="_blank" rel="noreferrer">
                                    <Video className="h-4 w-4" /> Join meeting
                                </a>
                            )}
                            {meeting.status === 'RESCHEDULE_PROPOSED' && proposed && (
                                <div className="rounded-md border bg-amber-50 p-3 text-amber-900">
                                    Proposed new time: <strong>{proposed.toLocaleString()}</strong>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-wrap justify-end gap-2">
                            {(meeting.status === 'PENDING' || meeting.status === 'CONFIRMED') && (
                                <>
                                    {meeting.status === 'CONFIRMED' && (
                                        <RescheduleModal meetingId={meeting.id} currentDate={date} onSuccess={() => router.refresh()} />
                                    )}
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        disabled={processing === meeting.id}
                                        onClick={() => run(meeting.id, () => cancelStudentMeeting(meeting.id))}
                                    >Cancel Meeting</Button>
                                </>
                            )}

                            {meeting.status === 'RESCHEDULE_PROPOSED' && meeting.rescheduleProposedBy !== 'STUDENT' && (
                                <>
                                    <Button
                                        size="sm"
                                        disabled={processing === meeting.id}
                                        onClick={() => run(meeting.id, () => acceptMeetingReschedule(meeting.id))}
                                    >Accept Reschedule</Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={processing === meeting.id}
                                        onClick={() => run(meeting.id, () => declineMeetingReschedule(meeting.id))}
                                    >Keep Current Time</Button>
                                </>
                            )}

                            {meeting.status === 'RESCHEDULE_PROPOSED' && meeting.rescheduleProposedBy === 'STUDENT' && (
                                <span className="text-sm text-gray-500">Waiting for the university to respond.</span>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    )
}
