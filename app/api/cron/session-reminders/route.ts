import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * Group Session Reminder Cron
 *
 * Sends:
 *   - 24h reminder when session is ~24h away  (notifies confirmed + waitlisted)
 *   - 30m reminder when session is ~30m away  (notifies confirmed only, includes joinUrl if set)
 *
 * Call frequency: every 15 minutes via Netlify scheduled function.
 * Secured with CRON_SECRET bearer token.
 * Idempotent: uses reminder24hSent + reminder30mSent flags on GroupSession.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })

    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()

        // ── Window definitions (wide enough to tolerate cron drift) ───────────
        // 24h reminder: fire when session is 23h–25h away
        const w24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000)
        const w24End   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

        // 30m reminder: fire when session is 20m–40m away
        const w30Start = new Date(now.getTime() + 20 * 60 * 1000)
        const w30End   = new Date(now.getTime() + 40 * 60 * 1000)

        let sent24h = 0
        let sent30m = 0

        // ── 24h Reminders ─────────────────────────────────────────────────────
        const sessions24h = await prisma.groupSession.findMany({
            where: {
                status: { in: ['OPEN', 'FILLING', 'FULL'] },
                reminder24hSent: false,
                scheduledAt: { gte: w24Start, lte: w24End },
            },
            include: {
                university: { select: { institutionName: true, logo: true } },
                seats: {
                    where: { status: { in: ['CONFIRMED', 'WAITLISTED'] } },
                    include: {
                        student: {
                            select: {
                                fullName: true,
                                user: { select: { email: true, consentMarketing: true, consentWithdrawnAt: true, timezone: true } },
                            },
                        },
                    },
                },
            },
        })

        for (const session of sessions24h) {
            for (const seat of session.seats) {
                // Respect marketing consent
                if (!seat.student.user.consentMarketing || seat.student.user.consentWithdrawnAt) continue

                const tz = seat.student.user.timezone || 'UTC'
                const seatTimeStr = new Date(session.scheduledAt).toLocaleString('en-US', {
                    weekday: 'long', day: 'numeric', month: 'long',
                    hour: '2-digit', minute: '2-digit', timeZone: tz,
                }) + ' ' + tz

                const firstName = seat.student.fullName?.split(' ')[0] || 'there'
                const isWaitlisted = seat.status === 'WAITLISTED'

                await prisma.studentNotification.create({
                    data: {
                        studentId: seat.studentId,
                        title: `📅 Session tomorrow: ${session.title}`,
                        message: isWaitlisted
                            ? `You're on the waitlist for tomorrow's session with ${session.university.institutionName}.`
                            : `Your group session with ${session.university.institutionName} is tomorrow at ${seatTimeStr}.`,
                        type: 'INFO',
                        actionUrl: '/student/dashboard',
                    },
                })

                await sendEmail({
                    to: seat.student.user.email,
                    subject: `📅 Tomorrow: ${session.title} with ${session.university.institutionName}`,
                    html: generateEmailHtml('Session Reminder — Tomorrow', `
                        <p>Hi ${firstName},</p>
                        <p>This is a reminder that your group info session with
                        <strong>${session.university.institutionName}</strong> is <strong>tomorrow</strong>.</p>
                        <div class="info-box">
                            <div class="info-row"><span class="info-label">Session:</span> <span>${session.title}</span></div>
                            <div class="info-row"><span class="info-label">When:</span> <span>${seatTimeStr}</span></div>
                            <div class="info-row"><span class="info-label">Duration:</span> <span>${session.durationMinutes} minutes</span></div>
                            <div class="info-row"><span class="info-label">Your status:</span> <span>${isWaitlisted ? '⏳ Waitlisted' : '✅ Confirmed'}</span></div>
                        </div>
                        ${isWaitlisted
                            ? `<p>You're on the waitlist — we'll send your join link immediately if a seat opens up.</p>`
                            : `<p>Your join link will be sent as soon as the university starts the session. Keep an eye on your dashboard and email.</p>`
                        }
                        <p style="text-align:center;margin-top:24px;">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard" class="btn">View in Dashboard →</a>
                        </p>
                    `),
                })
            }

            await prisma.groupSession.update({
                where: { id: session.id },
                data: { reminder24hSent: true },
            })

            sent24h++
        }

        // ── 30m Reminders ─────────────────────────────────────────────────────
        const sessions30m = await prisma.groupSession.findMany({
            where: {
                status: { in: ['OPEN', 'FILLING', 'FULL', 'LIVE'] },
                reminder30mSent: false,
                scheduledAt: { gte: w30Start, lte: w30End },
            },
            include: {
                university: { select: { institutionName: true } },
                seats: {
                    where: { status: 'CONFIRMED' },  // only confirmed for 30m nudge
                    include: {
                        student: {
                            select: {
                                fullName: true,
                                user: { select: { email: true, consentMarketing: true, consentWithdrawnAt: true, timezone: true } },
                            },
                        },
                    },
                },
            },
        })

        for (const session of sessions30m) {
            for (const seat of session.seats) {
                if (!seat.student.user.consentMarketing || seat.student.user.consentWithdrawnAt) continue

                const tz = seat.student.user.timezone || 'UTC'
                const seatTimeStr = new Date(session.scheduledAt).toLocaleString('en-US', {
                    hour: '2-digit', minute: '2-digit', timeZone: tz,
                }) + ' ' + tz

                const firstName = seat.student.fullName?.split(' ')[0] || 'there'

                await prisma.studentNotification.create({
                    data: {
                        studentId: seat.studentId,
                        title: `⏰ Starting in 30 min: ${session.title}`,
                        message: session.joinUrl
                            ? `Your session starts at ${seatTimeStr}. Click to join now.`
                            : `Your session starts at ${seatTimeStr}. Join link will appear in your dashboard when the host starts.`,
                        type: 'INFO',
                        actionUrl: session.joinUrl ?? '/student/dashboard',
                    },
                })

                await sendEmail({
                    to: seat.student.user.email,
                    subject: `⏰ Starting in 30 min — ${session.title}`,
                    html: generateEmailHtml('Starting in 30 Minutes!', `
                        <p>Hi ${firstName},</p>
                        <p>Your group info session with <strong>${session.university.institutionName}</strong>
                        starts in <strong>30 minutes</strong> at ${seatTimeStr}.</p>
                        ${session.joinUrl
                            ? `<p style="text-align:center;margin-top:24px;">
                                <a href="${session.joinUrl}" class="btn">Join the Session Now →</a>
                               </p>`
                            : `<p>Your join link will appear in your dashboard and will be emailed to you
                                as soon as the host starts the session. Stay close!</p>
                               <p style="text-align:center;margin-top:16px;">
                                <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/dashboard" class="btn">Open Dashboard →</a>
                               </p>`
                        }
                    `),
                })
            }

            await prisma.groupSession.update({
                where: { id: session.id },
                data: { reminder30mSent: true },
            })

            sent30m++
        }

        return NextResponse.json({
            success: true,
            reminders24hSent: sent24h,
            reminders30mSent: sent30m,
            checkedAt: now.toISOString(),
        })

    } catch (error: any) {
        console.error('[Session Reminders Cron] Failed:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
