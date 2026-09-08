'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getStudentMeetingsSafe() {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    if (!user?.id || user.role !== 'STUDENT') return []

    const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
    })
    if (!student) return []

    const meetings = await prisma.meeting.findMany({
        where: { studentId: student.id },
        include: {
            university: true,
            rep: { select: { name: true, email: true } },
        },
        orderBy: { startTime: 'asc' },
    })

    return meetings.map((meeting) => ({
        id: meeting.id,
        meetingPurpose: meeting.title || meeting.purpose,
        proposedDatetime: meeting.startTime,
        durationMinutes: meeting.durationMinutes,
        status: meeting.status,
        studentQuestions: meeting.studentQuestions || meeting.agenda,
        meetingIdCode: meeting.meetingCode,
        meetingLink: meeting.joinUrl || meeting.videoLink,
        videoProvider: meeting.videoProvider,
        rescheduleProposedBy: meeting.rescheduleProposedBy,
        rescheduleProposedTime: meeting.rescheduleProposedTime,
        university: {
            institutionName: meeting.university.institutionName,
            country: meeting.university.country,
            city: meeting.university.city,
        },
        rep: meeting.rep ? { name: meeting.rep.name, email: meeting.rep.email } : null,
    }))
}

export async function getUniversityMeetingsSafe() {
    const session = await auth()
    const user = session?.user as { id?: string; role?: string } | undefined
    if (!user?.id || !['UNIVERSITY', 'UNIVERSITY_REP'].includes(user.role || '')) return []

    const ownershipWhere = user.role === 'UNIVERSITY'
        ? { university: { userId: user.id } }
        : { repId: user.id }

    const meetings = await prisma.meeting.findMany({
        where: ownershipWhere,
        include: {
            student: { include: { user: true } },
            university: true,
        },
        orderBy: { startTime: 'asc' },
    })

    return meetings.map((meeting) => ({
        id: meeting.id,
        meetingPurpose: meeting.title || meeting.purpose,
        proposedDatetime: meeting.startTime,
        durationMinutes: meeting.durationMinutes,
        status: meeting.status,
        studentQuestions: meeting.studentQuestions || meeting.agenda,
        meetingIdCode: meeting.meetingCode,
        meetingLink: meeting.joinUrl || meeting.videoLink,
        hostRoomUrl: meeting.hostRoomUrl,
        videoProvider: meeting.videoProvider,
        rescheduleProposedBy: meeting.rescheduleProposedBy,
        rescheduleProposedTime: meeting.rescheduleProposedTime,
        student: {
            id: meeting.student?.id,
            fullName: meeting.student?.fullName || meeting.student?.user?.name || 'Unknown Student',
            country: meeting.student?.country || null,
            cvFileName: meeting.student?.cvFileName || null,
            user: { email: meeting.student?.user?.email || '' },
        },
    }))
}
