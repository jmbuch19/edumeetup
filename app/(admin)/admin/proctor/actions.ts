'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import type { ProctorRequestStatus } from '@prisma/client'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

const STATUS_LABELS: Record<ProctorRequestStatus, string> = {
    PENDING: 'Pending Review',
    UNDER_REVIEW: 'Under Review',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
}

const STATUS_MESSAGES: Record<ProctorRequestStatus, string> = {
    PENDING: '',
    UNDER_REVIEW: 'Our team is currently reviewing your request and will confirm shortly.',
    CONFIRMED: 'Your proctor arrangement has been confirmed. EdUmeetup / IAES will be your official proctor site.',
    COMPLETED: 'Your exam has been completed. Thank you for using EdUmeetup proctoring services.',
    CANCELLED: 'Your proctor request has been cancelled. Please contact us if you need assistance.',
}

export async function updateProctorRequestStatus(formData: FormData) {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/admin/dashboard')

    const requestId = formData.get('requestId') as string
    const newStatus = formData.get('newStatus') as ProctorRequestStatus
    const adminNotes = (formData.get('adminNotes') as string)?.trim() || null
    const universityId = formData.get('universityId') as string
    const universityEmail = formData.get('universityEmail') as string
    const universityName = formData.get('universityName') as string
    const subjects = formData.get('subjects') as string
    const examStartDate = new Date(formData.get('examStartDate') as string)

    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    // Update the request
    await prisma.proctorRequest.update({
        where: { id: requestId },
        data: {
            status: newStatus,
            adminNotes,
            ...(newStatus === 'CONFIRMED' ? { confirmedAt: new Date() } : {}),
            ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
    })

    // In-app notification to university
    const notifConfig = {
        UNDER_REVIEW: { title: '🔍 Proctor Request Under Review', type: 'INFO' as const },
        CONFIRMED: { title: '✅ Proctor Request Confirmed!', type: 'INFO' as const },
        COMPLETED: { title: '🎓 Proctor Service Completed', type: 'INFO' as const },
        CANCELLED: { title: '❌ Proctor Request Cancelled', type: 'WARNING' as const },
    }

    const notif = notifConfig[newStatus as keyof typeof notifConfig]
    if (notif) {
        await prisma.universityNotification.create({
            data: {
                universityId,
                title: notif.title,
                message: `Status update for "${subjects}" (${fmt(examStartDate)}): ${STATUS_LABELS[newStatus]}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
                type: notif.type,
                actionUrl: '/university/proctor',
            },
        })
    }

    // Email to university on meaningful status changes
    if (['UNDER_REVIEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        const statusColor = newStatus === 'CONFIRMED' ? '#16a34a'
            : newStatus === 'CANCELLED' ? '#dc2626'
                : '#3333CC'

        const content = `
      <p>Dear ${universityName} team,</p>
      <p>There is an update on your proctor services request.</p>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Subject(s):</span> ${subjects}</div>
        <div class="info-row"><span class="info-label">Exam Date:</span> ${fmt(examStartDate)}</div>
        <div class="info-row"><span class="info-label">New Status:</span>
          <strong style="color:${statusColor};">${STATUS_LABELS[newStatus]}</strong>
        </div>
      </div>
      <p>${STATUS_MESSAGES[newStatus]}</p>
      ${adminNotes ? `
      <div class="info-box" style="background:#f0fdf4;border-color:#bbf7d0;">
        <p style="margin:0 0 6px 0;font-weight:600;color:#166534;">Note from our team:</p>
        <p style="margin:0;color:#15803d;">${adminNotes}</p>
      </div>` : ''}
      <p style="text-align:center;margin-top:24px;">
        <a href="${BASE_URL}/university/proctor" class="btn">View Request →</a>
      </p>
    `

        await sendEmail({
            to: universityEmail,
            subject: `${newStatus === 'CONFIRMED' ? '✅' : newStatus === 'CANCELLED' ? '❌' : '🔍'} Proctor Request Update — ${STATUS_LABELS[newStatus]}`,
            html: generateEmailHtml(`Proctor Request: ${STATUS_LABELS[newStatus]}`, content),
        })
    }

    revalidatePath('/admin/proctor')
    revalidatePath('/university/proctor')
    revalidatePath('/university/dashboard')
}
