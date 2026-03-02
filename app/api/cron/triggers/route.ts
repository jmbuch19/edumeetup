import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'

/**
 * Hourly Agent Triggers
 *
 * Trigger 1 — Profile Completion
 *   studentComplete=true, no AGENT_PROFILE_COMPLETE_NOTIFIED in AuditLog
 *   → StudentNotification + welcome email
 *
 * Trigger 2 — Inactive Student Nudge
 *   profileComplete=false, updatedAt < 3 days ago, createdAt < 3 days ago
 *   no AGENT_NUDGE_SENT in AuditLog in last 7 days
 *   → StudentNotification + "complete your profile" email
 *
 * Trigger 3 — University Response Delay
 *   interest.status=INTERESTED, createdAt < 48h ago, universityNote IS NULL
 *   no AGENT_RESPONSE_DELAY_SENT in AuditLog
 *   → UniversityNotification + "student waiting" email
 *
 * Secured with CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
        return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    }
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
        profileCompleteNotified: 0,
        nudgesSent: 0,
        responseDelayNotified: 0,
    }

    const now = new Date()

    try {
        // ── TRIGGER 1: Profile Completion ──────────────────────────────────────
        const completedStudents = await prisma.student.findMany({
            where: { profileComplete: true },
            include: { user: { select: { id: true, email: true } } }
        })

        for (const student of completedStudents) {
            if (!student.user?.email) continue

            const alreadySent = await prisma.auditLog.findFirst({
                where: {
                    action: 'AGENT_PROFILE_COMPLETE_NOTIFIED',
                    entityId: student.id,
                }
            })
            if (alreadySent) continue

            // StudentNotification
            await prisma.studentNotification.create({
                data: {
                    studentId: student.id,
                    title: '🎉 Profile Complete!',
                    message: 'Your profile is complete. Universities can now discover and reach out to you.',
                    type: 'SUCCESS',
                    actionUrl: '/student/dashboard',
                }
            })

            // Welcome email
            await sendEmail({
                to: student.user.email,
                subject: 'Your edUmeetup profile is complete!',
                html: generateEmailHtml(
                    'Profile Complete 🎉',
                    EmailTemplates.welcomeStudent(student.fullName || student.user.email.split('@')[0])
                )
            })

            // Mark in AuditLog (idempotency — never fires again for this student)
            await prisma.auditLog.create({
                data: {
                    action: 'AGENT_PROFILE_COMPLETE_NOTIFIED',
                    entityType: 'Student',
                    entityId: student.id,
                }
            })

            results.profileCompleteNotified++
        }

    } catch (err: any) {
        console.error('[Triggers] T1 Profile Complete failed:', err.message)
    }

    try {
        // ── TRIGGER 2: Inactive Student Nudge ──────────────────────────────────
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const inactiveStudents = await prisma.student.findMany({
            where: {
                profileComplete: false,
                updatedAt: { lt: threeDaysAgo },    // proxy for "not active in 3 days"
                createdAt: { lt: threeDaysAgo },    // skip brand-new accounts
            },
            include: { user: { select: { id: true, email: true } } }
        })

        for (const student of inactiveStudents) {
            if (!student.user?.email) continue

            // 7-day window: only nudge once per week
            const recentNudge = await prisma.auditLog.findFirst({
                where: {
                    action: 'AGENT_NUDGE_SENT',
                    entityId: student.id,
                    createdAt: { gte: sevenDaysAgo },
                }
            })
            if (recentNudge) continue

            const studentName = student.fullName || student.user.email.split('@')[0]

            // StudentNotification
            await prisma.studentNotification.create({
                data: {
                    studentId: student.id,
                    title: '👋 Complete your profile',
                    message: 'Universities are browsing edUmeetup — a complete profile gets you noticed. It takes less than 5 minutes!',
                    type: 'INFO',
                    actionUrl: '/student/profile',
                }
            })

            // Nudge email
            await sendEmail({
                to: student.user.email,
                subject: `${studentName}, your edUmeetup profile is incomplete`,
                html: generateEmailHtml(
                    'Complete Your Profile',
                    `
                    <p>Hi ${studentName},</p>
                    <p>You're just a few steps away from connecting with top universities worldwide.</p>
                    <p>A complete profile helps universities find you, and it only takes a few minutes to fill in.</p>
                    <p style="text-align:center;margin-top:24px;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/student/profile" class="btn">
                            Complete My Profile →
                        </a>
                    </p>
                    <p style="font-size:13px;color:#94a3b8;">You'll receive occasional reminders until your profile is complete.</p>
                    `
                )
            })

            // Mark with 7-day window (createdAt used for the window check)
            await prisma.auditLog.create({
                data: {
                    action: 'AGENT_NUDGE_SENT',
                    entityType: 'Student',
                    entityId: student.id,
                }
            })

            results.nudgesSent++
        }

    } catch (err: any) {
        console.error('[Triggers] T2 Inactive Nudge failed:', err.message)
    }

    try {
        // ── TRIGGER 3: University Response Delay ───────────────────────────────
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

        const overdueInterests = await prisma.interest.findMany({
            where: {
                status: 'INTERESTED',
                createdAt: { lt: fortyEightHoursAgo },
                universityNote: null,
            },
            include: {
                university: {
                    select: {
                        id: true,
                        institutionName: true,
                        user: { select: { email: true } }
                    }
                },
                student: {
                    select: {
                        fullName: true,
                        user: { select: { email: true } }
                    }
                }
            }
        })

        for (const interest of overdueInterests) {
            const alreadySent = await prisma.auditLog.findFirst({
                where: {
                    action: 'AGENT_RESPONSE_DELAY_SENT',
                    entityId: interest.id,
                }
            })
            if (alreadySent) continue

            const universityEmail = interest.university?.user?.email
            if (!universityEmail) continue

            const studentName = interest.student?.fullName || 'A student'
            const universityName = interest.university?.institutionName || 'your university'
            const hoursWaiting = Math.floor((now.getTime() - new Date(interest.createdAt).getTime()) / (1000 * 60 * 60))

            // UniversityNotification
            await prisma.universityNotification.create({
                data: {
                    universityId: interest.universityId,
                    title: '⏰ Student awaiting your response',
                    message: `${studentName} expressed interest ${hoursWaiting}h ago and hasn't received a response yet.`,
                    type: 'WARNING',
                    actionUrl: '/university/dashboard',
                }
            })

            // "Student waiting" email to university
            await sendEmail({
                to: universityEmail,
                subject: `${studentName} is waiting for a response from ${universityName}`,
                html: generateEmailHtml(
                    'Student Awaiting Response',
                    `
                    <p>A student who expressed interest in <strong>${universityName}</strong> is still waiting for a response.</p>
                    <div class="info-box">
                        <div class="info-row"><span class="info-label">Student:</span> ${studentName}</div>
                        <div class="info-row"><span class="info-label">Waiting:</span> ${hoursWaiting} hours</div>
                        <div class="info-row"><span class="info-label">Status:</span> No response yet</div>
                    </div>
                    <p>Timely responses significantly improve student experience and conversion rates.</p>
                    <p style="text-align:center;margin-top:24px;">
                        <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'}/university/dashboard" class="btn">
                            View & Respond →
                        </a>
                    </p>
                    `
                )
            })

            // Mark in AuditLog (once per interest, never fires again)
            await prisma.auditLog.create({
                data: {
                    action: 'AGENT_RESPONSE_DELAY_SENT',
                    entityType: 'Interest',
                    entityId: interest.id,
                }
            })

            results.responseDelayNotified++
        }

    } catch (err: any) {
        console.error('[Triggers] T3 Response Delay failed:', err.message)
    }

    return NextResponse.json({ success: true, ...results })
}
