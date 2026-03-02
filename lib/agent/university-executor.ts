/**
 * lib/agent/university-executor.ts
 *
 * Executes UniversityAgentActions:
 *   1. Creates UniversityNotification (in-app)
 *   2. Sends branded premium email via lib/email.ts
 *   3. Logs to AuditLog (prevents re-firing)
 *
 * Also exports: calculateResponseRate()
 */

import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import type { UniversityAgentAction } from './university-triggers'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'
const PLATFORM_AVG_RESPONSE_RATE = 67

async function logAgentAction(action: string, entityId: string, metadata?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { action, entityType: 'AGENT', entityId, actorId: null, metadata: metadata ?? {} },
  })
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Response Rate ─────────────────────────────────────────────────────────────
export async function calculateResponseRate(universityId: string, slaHours = 48): Promise<number> {
  const allInterests = await prisma.interest.findMany({
    where: {
      universityId,
      status: 'INTERESTED',
      createdAt: { lt: new Date(Date.now() - slaHours * 60 * 60 * 1000) },
    },
    select: { createdAt: true, universityNote: true, updatedAt: true },
  })

  if (allInterests.length === 0) return 100

  const responded = allInterests.filter(i => {
    if (!i.universityNote) return false
    return (i.updatedAt.getTime() - i.createdAt.getTime()) <= slaHours * 60 * 60 * 1000
  })

  const rate = Math.round((responded.length / allInterests.length) * 100)
  await prisma.university.update({ where: { id: universityId }, data: { responseRate: rate } })
  return rate
}

// ── New Interest ──────────────────────────────────────────────────────────────
async function executeNewInterestAlert(action: UniversityAgentAction) {
  const { universityId, universityEmail, universityName, repName,
    interestId, studentName, studentEmail, programName } = action
  if (!interestId) return

  const greeting = repName ? `Hi ${repName}` : `Hi ${universityName} team`

  await prisma.universityNotification.create({
    data: {
      universityId,
      title: '🎓 New Student Interest',
      message: `${studentName} is interested${programName ? ` in your ${programName} programme` : ' in your university'}.`,
      type: 'INFO',
      actionUrl: '/university/interests',
    },
  })

  const content = `
    <p>${greeting},</p>
    <p>A student has expressed interest in your university on <strong>edUmeetup</strong>.</p>
    <div class="info-box" style="background:#f0fdf4;border-color:#bbf7d0;">
      <div class="info-row"><span class="info-label">Student:</span> <strong>${studentName}</strong></div>
      ${programName ? `<div class="info-row"><span class="info-label">Programme:</span> ${programName}</div>` : ''}
      ${studentEmail ? `<div class="info-row"><span class="info-label">Contact:</span> <a href="mailto:${studentEmail}">${studentEmail}</a></div>` : ''}
    </div>
    <p>Students who receive a response within <strong>48 hours</strong> are 4x more likely to book a meeting.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/university/interests" class="btn">View Student Profile →</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;">Manage preferences: <a href="${BASE_URL}/university/settings">University Settings</a></p>
  `

  await sendEmail({
    to: universityEmail,
    subject: `🎓 ${studentName} is interested in ${universityName}`,
    html: generateEmailHtml('New Student Interest', content),
  })

  await logAgentAction('AGENT_NEW_INTEREST_ALERTED', interestId, { universityId, studentName })
  console.log(`[AGENT:UNI] New interest → ${universityEmail}`)
}

// ── Meeting Booked ────────────────────────────────────────────────────────────
async function executeMeetingBookedAlert(action: UniversityAgentAction) {
  const { universityId, universityEmail, universityName, repName,
    meetingId, meetingTitle, meetingStartTime, meetingDuration,
    meetingJoinUrl, studentName } = action
  if (!meetingId) return

  const greeting = repName ? `Hi ${repName}` : `Hi ${universityName} team`
  const timeStr = meetingStartTime ? formatDate(meetingStartTime) : 'See dashboard'

  await prisma.universityNotification.create({
    data: {
      universityId,
      title: '📅 Meeting Booked',
      message: `${studentName} booked "${meetingTitle}" for ${timeStr}.`,
      type: 'INFO',
      actionUrl: '/university/meetings',
    },
  })

  const content = `
    <p>${greeting},</p>
    <p>A student has booked a meeting with your team.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Student:</span> <strong>${studentName}</strong></div>
      <div class="info-row"><span class="info-label">Meeting:</span> ${meetingTitle}</div>
      <div class="info-row"><span class="info-label">Time:</span> ${timeStr}</div>
      <div class="info-row"><span class="info-label">Duration:</span> ${meetingDuration || 30} minutes</div>
      ${meetingJoinUrl ? `<div class="info-row"><span class="info-label">Join Link:</span> <a href="${meetingJoinUrl}">${meetingJoinUrl}</a></div>` : ''}
    </div>
    <p>Please confirm from your dashboard so the student receives their confirmation.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/university/meetings" class="btn">View & Confirm Meeting →</a>
    </p>
  `

  await sendEmail({
    to: universityEmail,
    subject: `📅 ${studentName} booked a meeting with ${universityName}`,
    html: generateEmailHtml('Meeting Booked', content),
  })

  await logAgentAction('AGENT_MEETING_BOOKED_ALERTED', meetingId, { universityId, studentName })
  console.log(`[AGENT:UNI] Meeting booked → ${universityEmail}`)
}

// ── Meeting Cancelled ─────────────────────────────────────────────────────────
async function executeMeetingCancelledAlert(action: UniversityAgentAction) {
  const { universityId, universityEmail, universityName, repName,
    meetingId, meetingTitle, meetingStartTime, studentName, cancelReason } = action
  if (!meetingId) return

  const greeting = repName ? `Hi ${repName}` : `Hi ${universityName} team`
  const timeStr = meetingStartTime ? formatDate(meetingStartTime) : 'N/A'

  await prisma.universityNotification.create({
    data: {
      universityId,
      title: '❌ Meeting Cancelled',
      message: `${studentName} cancelled "${meetingTitle}" (was ${timeStr}).`,
      type: 'WARNING',
      actionUrl: '/university/meetings',
    },
  })

  const content = `
    <p>${greeting},</p>
    <p>A student has cancelled their meeting with your team.</p>
    <div class="info-box" style="background:#fef2f2;border-color:#fecaca;">
      <div class="info-row"><span class="info-label">Student:</span> <strong>${studentName}</strong></div>
      <div class="info-row"><span class="info-label">Meeting:</span> ${meetingTitle}</div>
      <div class="info-row"><span class="info-label">Was scheduled:</span> ${timeStr}</div>
      ${cancelReason ? `<div class="info-row"><span class="info-label">Reason:</span> ${cancelReason}</div>` : ''}
    </div>
    <p>The time slot is now free. You may reach out directly to reschedule.</p>
    <p style="text-align:center;margin-top:24px;">
      <a href="${BASE_URL}/university/meetings" class="btn">View Meetings →</a>
    </p>
  `

  await sendEmail({
    to: universityEmail,
    subject: `❌ ${studentName} cancelled their meeting with ${universityName}`,
    html: generateEmailHtml('Meeting Cancelled', content),
  })

  await logAgentAction('AGENT_MEETING_CANCELLED_ALERTED', meetingId, { universityId, studentName, cancelReason })
  console.log(`[AGENT:UNI] Meeting cancelled → ${universityEmail}`)
}

// ── Daily Brief ───────────────────────────────────────────────────────────────
async function executeDailyBrief(action: UniversityAgentAction) {
  const { universityId, universityEmail, universityName, repName } = action

  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [newInterests, newMeetings, pendingResponse, meetingsNext24h,
    weeksInterests, weeksMeetings, responseRate] = await Promise.all([
    prisma.interest.count({ where: { universityId, createdAt: { gte: yesterday } } }),
    prisma.meeting.count({ where: { universityId, createdAt: { gte: yesterday }, status: { in: ['PENDING', 'CONFIRMED'] } } }),
    prisma.interest.count({ where: { universityId, status: 'INTERESTED', universityNote: null, createdAt: { lt: fortyEightHoursAgo } } }),
    prisma.meeting.count({ where: { universityId, status: 'CONFIRMED', startTime: { gte: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } } }),
    prisma.interest.count({ where: { universityId, createdAt: { gte: weekAgo } } }),
    prisma.meeting.count({ where: { universityId, createdAt: { gte: weekAgo }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    calculateResponseRate(universityId),
  ])

  // Skip if nothing to report
  if (!newInterests && !newMeetings && !pendingResponse && !meetingsNext24h) {
    await logAgentAction('AGENT_DAILY_BRIEF_SENT', universityId, { skipped: true })
    return
  }

  const greeting = repName ? `Hi ${repName}` : `Hi ${universityName} team`
  const dateStr = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', month: 'long', day: 'numeric' })
  const rateColor = responseRate >= 80 ? '#16a34a' : responseRate >= 60 ? '#d97706' : '#dc2626'
  const rateVsAvg = responseRate >= PLATFORM_AVG_RESPONSE_RATE
    ? `<span style="color:#16a34a;">▲ Above platform average (${PLATFORM_AVG_RESPONSE_RATE}%)</span>`
    : `<span style="color:#d97706;">Below platform average (${PLATFORM_AVG_RESPONSE_RATE}%)</span>`

  const content = `
    <p style="color:#64748b;font-size:13px;margin-bottom:4px;">${dateStr} · 9:00 AM IST</p>
    <p>${greeting},</p>
    <p>Here's your daily recruitment brief.</p>

    ${(newInterests > 0 || newMeetings > 0) ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 10px 0;font-weight:700;color:#166534;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">📥 New Since Yesterday</p>
      ${newInterests > 0 ? `<div style="margin-bottom:4px;">• <strong>${newInterests}</strong> new student interest${newInterests > 1 ? 's' : ''}</div>` : ''}
      ${newMeetings > 0 ? `<div>• <strong>${newMeetings}</strong> meeting${newMeetings > 1 ? 's' : ''} booked</div>` : ''}
    </div>` : ''}

    ${(pendingResponse > 0 || meetingsNext24h > 0) ? `
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 10px 0;font-weight:700;color:#9a3412;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">⏳ Needs Your Attention</p>
      ${pendingResponse > 0 ? `<div style="margin-bottom:4px;">• <strong>${pendingResponse}</strong> student${pendingResponse > 1 ? 's' : ''} waiting 48h+ for a response</div>` : ''}
      ${meetingsNext24h > 0 ? `<div>• <strong>${meetingsNext24h}</strong> meeting${meetingsNext24h > 1 ? 's' : ''} in the next 24 hours</div>` : ''}
    </div>` : ''}

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 12px 0;font-weight:700;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">📊 Your Pipeline This Week</p>
      <div style="display:flex;gap:32px;">
        <div><div style="font-size:28px;font-weight:800;color:#3333CC;">${weeksInterests}</div><div style="font-size:12px;color:#64748b;">Interests</div></div>
        <div><div style="font-size:28px;font-weight:800;color:#3333CC;">${weeksMeetings}</div><div style="font-size:12px;color:#64748b;">Meetings</div></div>
      </div>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0 0 8px 0;font-weight:700;color:#0f172a;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">⭐ Response Rate</p>
      <div style="font-size:32px;font-weight:800;color:${rateColor};">${responseRate}%</div>
      <div style="font-size:12px;margin-top:4px;">${rateVsAvg}</div>
    </div>

    <p style="text-align:center;margin-top:28px;">
      <a href="${BASE_URL}/university/dashboard" class="btn" style="font-size:15px;padding:14px 36px;">Open My Dashboard →</a>
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:24px;text-align:center;">
      <a href="${BASE_URL}/university/settings">Manage notification preferences →</a>
    </p>
  `

  await sendEmail({
    to: universityEmail,
    subject: `📊 ${universityName} · Daily Brief — ${dateStr}`,
    html: generateEmailHtml(`Daily Brief · ${dateStr}`, content),
  })

  await logAgentAction('AGENT_DAILY_BRIEF_SENT', universityId, {
    newInterests, newMeetings, pendingResponse, meetingsNext24h, responseRate,
  })

  console.log(`[AGENT:UNI] Daily brief → ${universityEmail} (rate: ${responseRate}%)`)
}

// ── Main executor ─────────────────────────────────────────────────────────────
export async function executeUniversityAction(action: UniversityAgentAction): Promise<void> {
  try {
    switch (action.type) {
      case 'ALERT_NEW_INTEREST': await executeNewInterestAlert(action); break
      case 'ALERT_MEETING_BOOKED': await executeMeetingBookedAlert(action); break
      case 'ALERT_MEETING_CANCELLED': await executeMeetingCancelledAlert(action); break
      case 'SEND_DAILY_BRIEF': await executeDailyBrief(action); break
      default: console.warn(`[AGENT:UNI] Unknown action: ${(action as any).type}`)
    }
  } catch (error) {
    console.error(`[AGENT:UNI] Failed to execute ${action.type}:`, error)
  }
}
