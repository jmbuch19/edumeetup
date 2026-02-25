import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'

const GRACE_DAYS = 7

/**
 * POST /api/my-data/delete
 * Initiates account deletion:
 *   1. Stamps deletionRequestedAt + deletionScheduledFor (+7 days)
 *   2. Sets isActive = false (blocks login immediately)
 *   3. Cancels all upcoming CONFIRMED meetings; emails counter-parties
 *   4. Writes AuditLog entry
 *   5. Sends confirmation email to user
 */
export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, deletionRequestedAt: true }
    })

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.deletionRequestedAt) {
        return NextResponse.json({
            error: 'Deletion already requested',
            scheduledFor: user.deletionRequestedAt
        }, { status: 409 })
    }

    const now = new Date()
    const deletionScheduledFor = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)

    // 1. Mark user for deletion + deactivate — atomic with audit log
    await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                isActive: false,
                deletionRequestedAt: now,
                deletionScheduledFor,
            }
        }),
        prisma.auditLog.create({
            data: {
                action: 'DELETION_REQUESTED',
                entityType: 'USER',
                entityId: userId,
                actorId: userId,
                metadata: {
                    email: user.email,
                    deletionScheduledFor: deletionScheduledFor.toISOString(),
                }
            }
        })
    ])

    // 2. Find and cancel upcoming meetings
    const upcomingMeetings = await prisma.meeting.findMany({
        where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
            startTime: { gte: now },
            AND: [
                {
                    OR: [
                        { student: { userId } },
                        { repId: userId }
                    ]
                }
            ]
        },
        include: {
            student: { include: { user: { select: { email: true, name: true } } } },
            rep: { select: { email: true, name: true } },
            university: { select: { institutionName: true } }
        }
    })

    for (const meeting of upcomingMeetings) {
        await prisma.meeting.update({
            where: { id: meeting.id },
            data: { status: 'CANCELLED' }
        })

        // Notify the other party
        const counterParties: Array<{ email: string; name: string | null }> = []
        if (meeting.student?.user && meeting.student.userId !== userId) {
            counterParties.push(meeting.student.user)
        }
        if (meeting.rep && meeting.repId !== userId) {
            counterParties.push(meeting.rep)
        }

        for (const party of counterParties) {
            if (!party.email) continue
            const html = generateEmailHtml(
                'Meeting Cancelled',
                `<p>Hi ${party.name || 'there'},</p>
                <p>The meeting <strong>"${meeting.title || 'Booked Meeting'}"</strong> scheduled for 
                <strong>${new Date(meeting.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</strong>
                has been cancelled because the other participant has closed their account.</p>
                <p>We apologise for any inconvenience.</p>`
            )
            await sendEmail({
                to: party.email,
                subject: `Meeting Cancelled: "${meeting.title || 'Booked Meeting'}"`,
                html,
            }).catch(err => console.error('[Delete] Cancel email failed:', err))
        }
    }

    // Update audit log with meeting count now that we know it
    await prisma.auditLog.create({
        data: {
            action: 'DELETION_MEETINGS_CANCELLED',
            entityType: 'USER',
            entityId: userId,
            actorId: userId,
            metadata: { meetingsCancelled: upcomingMeetings.length }
        }
    }).catch(() => { /* non-critical */ })

    // 4. Send confirmation email to user
    const graceDeadline = deletionScheduledFor.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    })
    const html = generateEmailHtml(
        'Your Account Deletion Request',
        `<p>Hi ${user.name || 'there'},</p>
        <p>We received a request to permanently delete your edUmeetup account.</p>
        <div class="info-box">
            <div class="info-row"><span class="info-label">Requested:</span> ${now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="info-row"><span class="info-label">Scheduled:</span> ${graceDeadline}</div>
            <div class="info-row"><span class="info-label">Meetings cancelled:</span> ${upcomingMeetings.length}</div>
        </div>
        <p><strong>Your account has been deactivated immediately.</strong> Your data will be permanently deleted on <strong>${graceDeadline}</strong>.</p>
        <p>If you made this request by mistake, please contact <a href="mailto:${process.env.SUPPORT_EMAIL ?? 'support@edumeetup.com'}">${process.env.SUPPORT_EMAIL ?? 'support@edumeetup.com'}</a> before ${graceDeadline}.</p>
        <p>— The edUmeetup Team</p>`
    )

    await sendEmail({
        to: user.email,
        subject: 'Your edUmeetup account is scheduled for deletion',
        html,
    }).catch(err => console.error('[Delete] Confirmation email failed:', err))

    return NextResponse.json({
        success: true,
        deletionScheduledFor: deletionScheduledFor.toISOString(),
        meetingsCancelled: upcomingMeetings.length,
    })
}
