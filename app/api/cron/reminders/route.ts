import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'

/**
 * Meeting Reminder Cron
 * 
 * Sends:
 *   - 24h reminder to both student & rep when meeting is 24h away
 *   - 1h reminder to both student & rep when meeting is 1h away
 *
 * Designed to be called by Vercel Cron (every 30 minutes is fine).
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    // --- Auth ---
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const now = new Date()

        // Windows: 23h–25h away (captures "~24h before" even if cron runs every 30m)
        const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
        const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000)

        // Window: 50m–70m away
        const window1hStart = new Date(now.getTime() + 50 * 60 * 1000)
        const window1hEnd = new Date(now.getTime() + 70 * 60 * 1000)

        let sent24h = 0
        let sent1h = 0

        // ── 24h Reminders ─────────────────────────────────────────────────
        const meetings24h = await prisma.meeting.findMany({
            where: {
                status: 'CONFIRMED',
                reminder24hSent: false,
                startTime: { gte: window24hStart, lte: window24hEnd }
            },
            include: {
                university: { include: { user: true } },
                participants: { include: { user: true } }
            }
        })

        for (const meeting of meetings24h) {
            const title = meeting.title || `Meeting on ${new Date(meeting.startTime).toLocaleDateString()}`
            const timeStr = new Date(meeting.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            const duration = meeting.durationMinutes ?? Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)
            const emailBody = generateEmailHtml(
                'Meeting Reminder — Tomorrow',
                EmailTemplates.meetingReminder(title, timeStr + ' IST', duration, meeting.joinUrl || undefined, meeting.meetingCode || undefined)
            )

            // Notify each participant
            for (const p of meeting.participants) {
                if (p.user?.email) {
                    await sendEmail({
                        to: p.user.email,
                        subject: `Reminder: "${title}" is tomorrow`,
                        html: emailBody
                    })
                }
            }

            // Mark as sent
            await prisma.meeting.update({
                where: { id: meeting.id },
                data: { reminder24hSent: true }
            })

            sent24h++
        }

        // ── 1h Reminders ──────────────────────────────────────────────────
        const meetings1h = await prisma.meeting.findMany({
            where: {
                status: 'CONFIRMED',
                reminder1hSent: false,
                startTime: { gte: window1hStart, lte: window1hEnd }
            },
            include: {
                university: { include: { user: true } },
                participants: { include: { user: true } }
            }
        })

        for (const meeting of meetings1h) {
            const title = meeting.title || `Meeting on ${new Date(meeting.startTime).toLocaleDateString()}`
            const timeStr = new Date(meeting.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
            const duration = meeting.durationMinutes ?? Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000)
            const emailBody = generateEmailHtml(
                'Starting in 1 Hour!',
                EmailTemplates.meetingReminder(title, timeStr + ' IST', duration, meeting.joinUrl || undefined, meeting.meetingCode || undefined)
            )

            for (const p of meeting.participants) {
                if (p.user?.email) {
                    await sendEmail({
                        to: p.user.email,
                        subject: `Starting soon: "${title}" in 1 hour`,
                        html: emailBody
                    })
                }
            }

            await prisma.meeting.update({
                where: { id: meeting.id },
                data: { reminder1hSent: true }
            })

            sent1h++
        }

        return NextResponse.json({
            success: true,
            reminders24hSent: sent24h,
            reminders1hSent: sent1h
        })

    } catch (error: any) {
        console.error('[Reminders Cron] Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
