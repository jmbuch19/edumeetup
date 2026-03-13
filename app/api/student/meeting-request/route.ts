import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { notifyUniversity, notifyStudent } from '@/lib/notify'
import { generateEmailHtml, sendEmail, EmailTemplates } from '@/lib/email'
import { studentInteractionSchema } from '@/lib/schemas'

export async function POST(req: Request) {
    try {
        const user = await requireUser()
        if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const validation = studentInteractionSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input data' }, { status: 400 })
        }

        const { universityId, programId } = validation.data

        const student = await prisma.student.findUnique({
            where: { userId: user.id },
            include: { user: true }
        })
        if (!student) return NextResponse.json({ error: 'Student profile not found' }, { status: 404 })

        const university = await prisma.university.findUnique({
            where: { id: universityId },
            include: { user: true }
        })
        if (!university) return NextResponse.json({ error: 'University not found' }, { status: 404 })

        // Create MeetingRequest
        const meetingReq = await prisma.meetingRequest.create({
            data: {
                studentId: student.id,
                universityId,
                programId: programId || null,
                status: 'PENDING'
            }
        })

        // Notify University
        await createNotification({
            userId: university.user.id,
            type: 'MEETING_REQUEST',
            title: 'New Meeting Request',
            message: `${student.fullName} has requested a meeting with you.`,
            payload: { studentId: student.id, meetingRequestId: meetingReq.id },
            emailTo: university.contactEmail || university.user.email,
            emailSubject: `New Meeting Request from ${student.fullName}`,
            emailHtml: generateEmailHtml(`Meeting Request from ${student.fullName}`, `
                <p>${student.fullName} would like to schedule a meeting with your admissions team.</p>
                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/dashboard" style="background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">View Request</a>
            `),
            replyTo: student.user.email
        })

        await notifyUniversity(universityId, {
            title: 'New Meeting Request',
            message: `${student.fullName} has requested a meeting.`,
            type: 'INFO',
            actionUrl: '/university/dashboard'
        })

        // Notify Student
        await notifyStudent(student.id, {
            title: 'Meeting Request Sent',
            message: `Your meeting request to ${university.institutionName} has been sent.`,
            type: 'INFO',
            actionUrl: `/universities/${universityId}`
        })

        return NextResponse.json({ success: true, meetingRequestId: meetingReq.id })
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 })
    }
}
