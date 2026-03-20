import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml } from '@/lib/email'

/**
 * Fair Partial Profile Nudge
 * Nudges walk-in students (isPartialProfile = true) who attended a fair
 * to complete their edUmeetup profile so universities can contact them properly.
 * Runs once: 3 days after the fair ends.
 * Called by the agent Netlify function (hourly).
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('Authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

    try {
        // Fairs that ended 3–4 days ago (1-day window to avoid re-sending)
        const recentlyEndedFairs = await prisma.fairEvent.findMany({
            where: {
                status: 'COMPLETED',
                endedAt: { gte: fourDaysAgo, lte: threeDaysAgo },
            },
            select: { id: true, name: true },
        })

        let nudgesSent = 0
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.edumeetup.com'

        for (const fair of recentlyEndedFairs) {
            const walkInPasses = await prisma.fairStudentPass.findMany({
                where: {
                    fairEventId: fair.id,
                    isPartialProfile: true,
                    studentId: null,             // truly unregistered walk-in
                    emailConsent: true,          // only contact those who consented
                },
                select: { id: true, email: true, fullName: true },
            })

            for (const pass of walkInPasses) {
                try {
                    const firstName = (pass.fullName ?? 'there').split(' ')[0]

                    await sendEmail({
                        to: pass.email,
                        subject: `🎓 Complete your profile — universities from ${fair.name} are waiting`,
                        html: generateEmailHtml(
                            'Your fair connections are waiting',
                            `<p>Hi ${firstName},</p>
                             <p>You met several universities at <strong>${fair.name}</strong>. 
                                Create a free EdUmeetup profile so they can view your full details 
                                and reach out directly.</p>
                             <p>It takes less than 2 minutes and gives you:</p>
                             <ul>
                               <li>Direct messages from university admissions teams</li>
                               <li>Personalised programme matches</li>
                               <li>Meeting booking with your preferred universities</li>
                             </ul>
                             <p style="text-align:center;margin-top:24px;">
                               <a href="${baseUrl}/student/register" class="btn">Create My Free Profile →</a>
                             </p>
                             <p style="font-size:13px;color:#94a3b8;">
                               If you prefer not to receive these emails, simply disregard this message —
                               your walk-in data is automatically deleted after 90 days.
                             </p>`
                        ),
                    })
                    nudgesSent++
                } catch (err) {
                    console.error(`[fair-partial-profile-nudge] Failed for pass id=${pass.id}:`)
                }
            }
        }

        return NextResponse.json({ success: true, nudgesSent })
    } catch (error) {
        console.error('[fair-partial-profile-nudge] Error:')
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
