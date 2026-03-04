/**
 * Fair Mode Email Templates
 *
 * All four emails use the existing email infrastructure from lib/email.ts:
 * - generateEmailHtml(title, content) for consistent styling
 * - Resend client via sendEmail pattern
 * Never throws — always returns { success: boolean, error?: string }
 */

import { generateEmailHtml } from '@/lib/email'
import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
    if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!)
    return _resend
}

const FROM = process.env.EMAIL_FROM || 'edUmeetup <noreply@edumeetup.com>'
const BASE_URL = process.env.NEXTAUTH_URL || 'https://edumeetup.com'

async function dispatch(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[FAIR EMAIL SIM] To: ${to} | Subject: ${subject}`)
        return { success: true }
    }
    try {
        const { error } = await getResend().emails.send({ from: FROM, to, subject, html })
        if (error) return { success: false, error: error.message }
        return { success: true }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('[fair-notifications] sendEmail error:', message)
        return { success: false, error: message }
    }
}

function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
}

// ── Types (minimal, avoids importing Prisma types here) ───────────────────────
interface FairEventMini {
    id: string
    name: string
    slug: string
    city: string | null
    venue: string | null
    country: string | null
    startDate: Date | string
    endDate: Date | string
}

interface UniMini {
    institutionName: string
    repName: string | null
    repEmail: string | null
    contactEmail: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Fair Invite → University
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFairInviteToUniversity(
    university: UniMini,
    fairEvent: FairEventMini,
): Promise<{ success: boolean; error?: string }> {
    const email = university.repEmail ?? university.contactEmail
    if (!email) return { success: false, error: 'No email address for university' }

    const year = new Date(fairEvent.startDate).getFullYear()
    const subject = `You're invited — edUmeetup ${fairEvent.city ?? ''} Fair ${year}`
    const repGreeting = university.repName ? `Hi ${university.repName.split(' ')[0]},` : 'Hello,'

    const content = `
        <p>${repGreeting}</p>
        <p>We're hosting the <strong>${fairEvent.name}</strong> and would love to have <strong>${university.institutionName}</strong> participate.</p>

        <div class="info-box">
            <div class="info-row"><span class="info-label">Event</span>${fairEvent.name}</div>
            <div class="info-row"><span class="info-label">Date</span>${formatDate(fairEvent.startDate)}</div>
            ${fairEvent.venue ? `<div class="info-row"><span class="info-label">Venue</span>${fairEvent.venue}</div>` : ''}
            ${fairEvent.city ? `<div class="info-row"><span class="info-label">City</span>${fairEvent.city}${fairEvent.country ? `, ${fairEvent.country}` : ''}</div>` : ''}
        </div>

        <p>University booths are free. You'll get access to a live QR scanner, automatic lead capture, and a detailed post-fair report.</p>
        <p style="margin:28px 0;">
            <a href="${BASE_URL}/admin" class="btn">Register Your Booth →</a>
        </p>
        <p style="color:#64748b;font-size:14px;">Questions? Reply directly to this email and our team will respond within 24 hours.</p>

        <hr>
        <p style="font-size:12px;color:#94a3b8;">
            You're receiving this because your institution is registered with edUmeetup and has fair-opportunity notifications enabled.
            To opt out, log in to your university dashboard → Settings.
        </p>
    `

    return dispatch(email, subject, generateEmailHtml(subject, content))
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Fair Announcement → Student
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFairAnnouncementToStudent(
    userEmail: string,
    studentName: string,
    fairEvent: FairEventMini,
): Promise<{ success: boolean; error?: string }> {
    const firstName = studentName.split(' ')[0]
    const subject = `A fair is coming to ${fairEvent.city ?? 'your city'} — get your free pass`

    const content = `
        <p>Hi ${firstName},</p>
        <p>Great news — <strong>${fairEvent.name}</strong> is happening near you and entry is completely free.</p>

        <div class="info-box">
            <div class="info-row"><span class="info-label">Event</span>${fairEvent.name}</div>
            <div class="info-row"><span class="info-label">Date</span>${formatDate(fairEvent.startDate)}</div>
            ${fairEvent.venue ? `<div class="info-row"><span class="info-label">Venue</span>${fairEvent.venue}</div>` : ''}
            ${fairEvent.city ? `<div class="info-row"><span class="info-label">City</span>${fairEvent.city}${fairEvent.country ? `, ${fairEvent.country}` : ''}</div>` : ''}
        </div>

        <p style="margin:28px 0;">
            <a href="${BASE_URL}/fair?eventId=${fairEvent.id}" class="btn">Get Your QR Pass →</a>
        </p>

        <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;font-size:14px;color:#15803d;">
            ✅&nbsp; <strong>Free entry.</strong> No agent fees. Talk directly to universities from the UK, USA, Canada, Australia &amp; more.
        </p>

        <hr>
        <p style="font-size:12px;color:#94a3b8;">
            You're receiving this because you're registered on edUmeetup.
            <a href="${BASE_URL}/student/settings" style="color:#94a3b8;">Update notification preferences</a>
        </p>
    `

    return dispatch(userEmail, subject, generateEmailHtml(subject, content))
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fair Go-Live Alert → University
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFairGoLiveToUniversity(
    university: UniMini,
    fairEvent: FairEventMini,
): Promise<{ success: boolean; error?: string }> {
    const email = university.repEmail ?? university.contactEmail
    if (!email) return { success: false, error: 'No email address for university' }

    const subject = `🟢 Fair is LIVE now — ${fairEvent.name}`
    const repGreeting = university.repName ? `Hi ${university.repName.split(' ')[0]},` : 'Hello,'

    const content = `
        <p>${repGreeting}</p>
        <p>
            <span style="display:inline-block;background:#dcfce7;color:#15803d;border-radius:6px;padding:3px 10px;font-weight:700;font-size:13px;letter-spacing:0.5px;">
                🟢 FAIR IS LIVE
            </span>
        </p>
        <p><strong>${fairEvent.name}</strong> has started. Your booth scanner is ready to use.</p>

        <p style="margin:28px 0;">
            <a href="${BASE_URL}/event/${fairEvent.slug}/scan" class="btn" style="background:#16a34a;">Open Scanner Now →</a>
        </p>

        <div class="info-box">
            <p style="margin:0 0 8px 0;font-weight:600;color:#374151;">Your fair links</p>
            <div class="info-row">
                <span class="info-label">Scanner</span>
                <a href="${BASE_URL}/event/${fairEvent.slug}/scan">${BASE_URL}/event/${fairEvent.slug}/scan</a>
            </div>
            <div class="info-row">
                <span class="info-label">Report</span>
                <a href="${BASE_URL}/dashboard/university/fair-report/${fairEvent.id}">${BASE_URL}/dashboard/university/fair-report/${fairEvent.id}</a>
            </div>
        </div>

        <p style="font-size:14px;color:#64748b;">Leads appear in your report automatically as students are scanned. No need to contact admin.</p>
        <hr>
        <p style="font-size:12px;color:#94a3b8;">Sent on behalf of edUmeetup fair management.</p>
    `

    return dispatch(email, subject, generateEmailHtml(subject, content))
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Fair Ended — Lead Report → University
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFairEndReportToUniversity(
    university: UniMini,
    fairEvent: FairEventMini,
    leadCount: number,
): Promise<{ success: boolean; error?: string }> {
    const email = university.repEmail ?? university.contactEmail
    if (!email) return { success: false, error: 'No email address for university' }

    const subject = `Fair ended — your ${leadCount} lead${leadCount !== 1 ? 's are' : ' is'} ready`
    const repGreeting = university.repName ? `Hi ${university.repName.split(' ')[0]},` : 'Hello,'

    const content = `
        <p>${repGreeting}</p>
        <p><strong>${fairEvent.name}</strong> has ended. Thank you for participating!</p>

        <div style="text-align:center;margin:24px 0;padding:24px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
            <p style="font-size:48px;font-weight:800;color:#4f46e5;margin:0;">${leadCount}</p>
            <p style="color:#64748b;margin:4px 0 0 0;font-size:15px;">student lead${leadCount !== 1 ? 's' : ''} collected</p>
        </div>

        <p style="margin:28px 0;text-align:center;">
            <a href="${BASE_URL}/dashboard/university/fair-report/${fairEvent.id}" class="btn">View Full Report &amp; Export CSV →</a>
        </p>

        <div class="info-box">
            <p style="margin:0 0 8px 0;font-weight:600;color:#374151;">What's in your report</p>
            <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;">
                <li>Full student profiles (name, email, phone, course, year)</li>
                <li>Matched programs per student</li>
                <li>Rep notes captured at booth</li>
                <li>Follow-up status tracking (Hot / Warm / Cold)</li>
                <li>One-click CSV export for your CRM</li>
            </ul>
        </div>

        <p style="font-size:14px;color:#64748b;">Leads are available immediately. No need to contact admin — everything is in your dashboard.</p>
        <hr>
        <p style="font-size:12px;color:#94a3b8;">edUmeetup Fair Management · ${fairEvent.name}</p>
    `

    return dispatch(email, subject, generateEmailHtml(subject, content))
}
