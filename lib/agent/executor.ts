/**
 * lib/agent/executor.ts
 *
 * Executes a list of AgentActions produced by triggers.ts.
 * All side effects live here: DB writes, emails, notifications, AuditLog.
 * Each action type is handled independently — one failure never blocks others.
 */

import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'
import type { AgentAction } from './triggers'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ── Mark action as fired in AuditLog ─────────────────────────────────────────
async function markFired(action: string, entityType: string, entityId: string) {
    await prisma.auditLog.create({
        data: { action, entityType, entityId }
    })
}

// ── Execute a single action ───────────────────────────────────────────────────
export async function executeAction(action: AgentAction): Promise<void> {
    switch (action.type) {

        // ── T1: Profile Complete ──────────────────────────────────────────────
        case 'NOTIFY_PROFILE_COMPLETE': {
            const { studentId, studentEmail, studentName } = action
            if (!studentId || !studentEmail) return

            await prisma.studentNotification.create({
                data: {
                    studentId,
                    title: '🎉 Profile Complete!',
                    message: 'Your profile is live. Universities can now discover and reach out to you.',
                    type: 'SUCCESS',
                    actionUrl: '/student/dashboard',
                }
            })

            await sendEmail({
                to: studentEmail,
                subject: 'Your EdUmeetup profile is complete!',
                html: generateEmailHtml(
                    'Profile Complete 🎉',
                    EmailTemplates.welcomeStudent(studentName ?? studentEmail.split('@')[0])
                )
            })

            await markFired('AGENT_PROFILE_COMPLETE_NOTIFIED', 'Student', studentId)
            break
        }

        // ── T2: Inactive Nudge ────────────────────────────────────────────────
        case 'NOTIFY_INACTIVE_NUDGE': {
            const { studentId, studentEmail, studentName } = action
            if (!studentId || !studentEmail) return
            const name = studentName ?? studentEmail.split('@')[0]

            await prisma.studentNotification.create({
                data: {
                    studentId,
                    title: '👋 Complete your profile',
                    message: 'Universities are browsing right now — a complete profile gets you noticed. Takes less than 5 minutes!',
                    type: 'INFO',
                    actionUrl: '/student/profile',
                }
            })

            await sendEmail({
                to: studentEmail,
                subject: `${name}, your EdUmeetup profile is incomplete`,
                html: generateEmailHtml(
                    'Complete Your Profile',
                    `
                    <p>Hi ${name},</p>
                    <p>You're just a few steps away from connecting with top universities worldwide.</p>
                    <p>A complete profile helps universities find you — and it only takes a few minutes.</p>
                    <p style="text-align:center;margin-top:24px;">
                        <a href="${BASE_URL}/student/profile" class="btn">Complete My Profile →</a>
                    </p>
                    <p style="font-size:13px;color:#94a3b8;">
                        You'll receive a reminder once a week until your profile is complete.
                    </p>
                    `
                )
            })

            await markFired('AGENT_INACTIVE_NUDGE_SENT', 'Student', studentId)
            break
        }

        // ── T3: University Response Delay ─────────────────────────────────────
        case 'NOTIFY_UNIVERSITY_RESPONSE_DELAY': {
            const { universityId, universityEmail, universityName, interestId, payload } = action
            if (!universityId || !universityEmail || !interestId) return

            const studentName = (payload?.studentName as string) || 'A student'
            const hoursWaiting = (payload?.hoursWaiting as number) || 48

            await prisma.universityNotification.create({
                data: {
                    universityId,
                    title: '⏰ Student awaiting your response',
                    message: `${studentName} expressed interest ${hoursWaiting}h ago and hasn't received a response yet.`,
                    type: 'WARNING',
                    actionUrl: '/university/dashboard',
                }
            })

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
                        <a href="${BASE_URL}/university/dashboard" class="btn">View & Respond →</a>
                    </p>
                    `
                )
            })

            await markFired('AGENT_RESPONSE_DELAY_NOTIFIED', 'Interest', interestId)
            break
        }

        // ── T4: Meeting Reminder — Student ────────────────────────────────────
        case 'NOTIFY_MEETING_REMINDER_STUDENT': {
            const { meetingId, studentId, studentEmail, studentName, meetingTitle, meetingStartTime, meetingDuration, meetingJoinUrl, meetingCode, studentTimezone } = action
            if (!meetingId || !studentEmail) return

            const name = studentName ?? studentEmail.split('@')[0]
            const tz = studentTimezone || 'UTC'
            const timeStr = meetingStartTime
                ? new Date(meetingStartTime).toLocaleString('en-US', { timeZone: tz }) + ' ' + tz
                : 'See your dashboard'
            const duration = meetingDuration ?? 30
            const title = meetingTitle ?? 'Your Meeting'

            if (studentId) {
                await prisma.studentNotification.create({
                    data: {
                        studentId,
                        title: `⏰ Reminder: "${title}" is tomorrow`,
                        message: `Your meeting is scheduled for ${timeStr}. Don't forget to join on time!`,
                        type: 'INFO',
                        actionUrl: '/student/meetings',
                    }
                })
            }

            await sendEmail({
                to: studentEmail,
                subject: `Reminder: "${title}" is tomorrow`,
                html: generateEmailHtml(
                    'Meeting Reminder — Tomorrow',
                    EmailTemplates.meetingReminder(title, timeStr, duration, meetingJoinUrl, meetingCode ?? undefined)
                )
            })

            // Mark reminder sent at meeting level (only once for all student actions)
            await prisma.meeting.update({
                where: { id: meetingId },
                data: { reminder24hSent: true }
            })
            break
        }

        // ── T4: Meeting Reminder — University ─────────────────────────────────
        case 'NOTIFY_MEETING_REMINDER_UNIVERSITY': {
            const { universityId, universityEmail, universityName, meetingTitle, meetingStartTime, meetingDuration, meetingJoinUrl, meetingCode, repTimezone } = action
            if (!universityEmail) return

            const tz = repTimezone || 'UTC'
            const timeStr = meetingStartTime
                ? new Date(meetingStartTime).toLocaleString('en-US', { timeZone: tz }) + ' ' + tz
                : 'See your dashboard'
            const duration = meetingDuration ?? 30
            const title = meetingTitle ?? 'Student Meeting'

            if (universityId) {
                await prisma.universityNotification.create({
                    data: {
                        universityId,
                        title: `⏰ Reminder: "${title}" is tomorrow`,
                        message: `Student meeting scheduled for ${timeStr}.`,
                        type: 'INFO',
                        actionUrl: '/university/meetings',
                    }
                })
            }

            await sendEmail({
                to: universityEmail,
                subject: `Reminder: "${title}" is tomorrow`,
                html: generateEmailHtml(
                    'Meeting Reminder — Tomorrow',
                    EmailTemplates.meetingReminder(title, timeStr, duration, meetingJoinUrl, meetingCode ?? undefined)
                )
            })
            // reminder24hSent is set by the STUDENT action — no double-write needed
            break
        }
    }
}

// ── Run all actions ───────────────────────────────────────────────────────────
export async function executeActions(actions: AgentAction[]): Promise<{
    succeeded: number
    failed: number
    errors: string[]
}> {
    let succeeded = 0
    let failed = 0
    const errors: string[] = []

    for (const action of actions) {
        try {
            await executeAction(action)
            succeeded++
        } catch (err: any) {
            failed++
            const msg = `[${action.type}] ${err?.message ?? 'Unknown error'}`
            errors.push(msg)
            console.error('[Agent Executor]', msg, err)
        }
    }

    return { succeeded, failed, errors }
}
