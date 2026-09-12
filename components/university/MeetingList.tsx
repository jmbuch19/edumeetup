'use client'

import MeetingListHardened from '@/components/university/MeetingListHardened'

type LegacyMeeting = {
    id: string
    title?: string | null
    purpose?: string | null
    meetingPurpose?: string | null
    startTime?: string | Date | null
    proposedDatetime?: string | Date | null
    durationMinutes: number
    status: string
    studentQuestions?: string | null
    agenda?: string | null
    meetingCode?: string | null
    meetingIdCode?: string | null
    joinUrl?: string | null
    videoLink?: string | null
    meetingLink?: string | null
    hostRoomUrl?: string | null
    videoProvider?: string | null
    rescheduleProposedBy?: string | null
    rescheduleProposedTime?: string | Date | null
    student?: {
        id?: string
        fullName?: string | null
        country?: string | null
        cvFileName?: string | null
        user?: {
            email?: string | null
            name?: string | null
        } | null
    } | null
}

/**
 * Compatibility adapter for the university dashboard.
 *
 * The dedicated /university/meetings route already renders MeetingListHardened
 * directly. The dashboard still passes raw Prisma Meeting rows through JSON
 * serialization, so this adapter normalizes those rows into the hardened view
 * model without exposing any of the retired legacy meeting actions.
 */
export default function MeetingList({
    meetings,
    compact = false,
}: {
    meetings: LegacyMeeting[]
    compact?: boolean
}) {
    const normalized = meetings.flatMap((meeting) => {
        const rawDate = meeting.startTime ?? meeting.proposedDatetime
        if (!rawDate) return []

        const proposedDatetime = new Date(rawDate)
        if (Number.isNaN(proposedDatetime.getTime())) return []

        const rescheduleProposedTime = meeting.rescheduleProposedTime
            ? new Date(meeting.rescheduleProposedTime)
            : null

        return [{
            id: meeting.id,
            meetingPurpose: meeting.meetingPurpose || meeting.title || meeting.purpose || 'University consultation',
            proposedDatetime,
            durationMinutes: meeting.durationMinutes,
            status: meeting.status,
            studentQuestions: meeting.studentQuestions || meeting.agenda || null,
            meetingIdCode: meeting.meetingIdCode || meeting.meetingCode || '',
            meetingLink: meeting.meetingLink || meeting.joinUrl || meeting.videoLink || null,
            hostRoomUrl: meeting.hostRoomUrl || null,
            videoProvider: meeting.videoProvider || null,
            rescheduleProposedBy: meeting.rescheduleProposedBy || null,
            rescheduleProposedTime:
                rescheduleProposedTime && !Number.isNaN(rescheduleProposedTime.getTime())
                    ? rescheduleProposedTime
                    : null,
            student: {
                id: meeting.student?.id,
                fullName: meeting.student?.fullName || meeting.student?.user?.name || 'Unknown Student',
                country: meeting.student?.country || null,
                cvFileName: meeting.student?.cvFileName || null,
                user: { email: meeting.student?.user?.email || '' },
            },
        }]
    })

    return <MeetingListHardened meetings={compact ? normalized.slice(0, 5) : normalized} />
}
