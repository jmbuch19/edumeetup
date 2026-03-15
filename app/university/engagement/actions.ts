'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendMarketingEmail, generateEmailHtml, EmailTemplates } from '@/lib/email'

// ── Constants ─────────────────────────────────────────────────────────────────
/** Hard cap: max students per single campaign */
const MAX_STUDENTS_PER_CAMPAIGN = 500

function startOfWeek(): Date {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
}

async function getUniversityProfile(userId: string) {
    return prisma.university.findUnique({
        where: { userId },
        select: {
            id: true,
            institutionName: true,
            notifQuota: true,
            notifPaused: true,
            lastCampaignAt: true,
            programList: {
                select: { fieldCategory: true },
                distinct: ['fieldCategory']
            }
        }
    })
}

/**
 * Smart field-of-interest filter.
 * Given a list of student IDs and the university's program categories,
 * return only students whose fieldOfInterest is blank (unknown, always include)
 * OR matches one of the university's program fieldCategories.
 *
 * A liberal arts school won't burn quota on CS/Engineering students.
 */
async function filterByFieldMatch(
    studentIds: string[],
    universityFieldCategories: string[]
): Promise<string[]> {
    // If the university has no programs yet, skip the filter entirely
    // (don't penalize new universities who haven't set up programs)
    if (universityFieldCategories.length === 0) return studentIds

    const normalised = universityFieldCategories.map(f => f.toLowerCase().trim())

    const students = await prisma.student.findMany({
        where: { id: { in: studentIds } },
        select: { id: true, fieldOfInterest: true }
    })

    return students
        .filter(s => {
            // No preference set → always include (we can't rule them out)
            if (!s.fieldOfInterest) return true
            const studentField = s.fieldOfInterest.toLowerCase().trim()
            // Include if at least one university category is a substring match
            return normalised.some(cat => cat.includes(studentField) || studentField.includes(cat))
        })
        .map(s => s.id)
}

/** Return deduplicated, field-matched student IDs based on the chosen segment */
async function resolveSegment(
    universityId: string,
    segment: string,
    since: Date,
    uniFieldCategories: string[]
): Promise<string[]> {
    const studentIdSet = new Set<string>()

    if (segment === 'interested' || segment === 'all') {
        const interests = await prisma.interest.findMany({
            where: { universityId, createdAt: { gte: since } },
            select: { studentId: true },
            distinct: ['studentId']
        })
        interests.forEach(i => studentIdSet.add(i.studentId))
    }

    if (segment === 'meetings' || segment === 'all') {
        const meetings = await prisma.meeting.findMany({
            where: { universityId, createdAt: { gte: since }, studentId: { not: null } },
            select: { studentId: true },
            distinct: ['studentId']
        })
        meetings.forEach(m => { if (m.studentId) studentIdSet.add(m.studentId) })
    }

    const rawIds = [...studentIdSet]

    // ── Smart field-of-interest filter ────────────────────────────────────────
    // Students who expressed interest in a meeting are always more committed,
    // so apply the filter only if we got >10 students to keep UX responsive.
    if (rawIds.length > 10) {
        return filterByFieldMatch(rawIds, uniFieldCategories)
    }
    return rawIds
}

// ── Segment preview — shown to university before sending ──────────────────────

export async function getSegmentCount(segment: string, dayRange: number = 30) {
    const session = await auth()
    if (session?.user?.role !== 'UNIVERSITY') return { error: 'Unauthorized' }

    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return { error: 'University profile not found' }

    const since = new Date(Date.now() - dayRange * 24 * 60 * 60 * 1_000)
    const fieldCategories = (uni.programList ?? []).map(p => p.fieldCategory as string)
    const ids = await resolveSegment(uni.id, segment, since, fieldCategories)
    return { count: Math.min(ids.length, MAX_STUDENTS_PER_CAMPAIGN) }
}

// ── Campaign stats for the dashboard header cards ────────────────────────────

export async function getUniversityCampaignStats() {
    const session = await auth()
    if (session?.user?.role !== 'UNIVERSITY') return null

    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return null

    const [totalInterested, totalMeetings, campaignsUsedThisWeek] = await Promise.all([
        prisma.interest.count({ where: { universityId: uni.id } }),
        prisma.meeting.count({ where: { universityId: uni.id, studentId: { not: null } } }),
        // Campaign count from the dedicated log table — fast, exact, no heuristics
        prisma.notificationCampaign.count({
            where: { universityId: uni.id, createdAt: { gte: startOfWeek() } }
        }),
    ])

    return {
        totalInterested,
        totalMeetings,
        campaignsUsedThisWeek,
        weeklyQuota: uni.notifQuota,
        notifPaused: uni.notifPaused,
    }
}

// ── Campaign history ─────────────────────────────────────────────────────────

export async function getCampaignHistory() {
    const session = await auth()
    if (session?.user?.role !== 'UNIVERSITY') return []

    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return []

    return prisma.notificationCampaign.findMany({
        where: { universityId: uni.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })
}

// ── Per-student dedup cap ─────────────────────────────────────────────────────

/** Max university campaign notifications a single student can receive per 7 days */
const PER_STUDENT_WEEKLY_CAP = 3

/**
 * Filters out students who have already received >= PER_STUDENT_WEEKLY_CAP
 * UNIVERSITY_CAMPAIGN notifications in the last 7 days.
 * Uses a single groupBy query for efficiency.
 */
async function applyPerStudentCap(studentIds: string[]): Promise<{
    eligible: string[]
    skippedCount: number
}> {
    if (studentIds.length === 0) return { eligible: [], skippedCount: 0 }

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000)

    const recentCounts = await prisma.studentNotification.groupBy({
        by: ['studentId'],
        where: {
            studentId: { in: studentIds },
            type: 'UNIVERSITY_CAMPAIGN',
            createdAt: { gte: since },
        },
        _count: { id: true },
    })

    const countMap = new Map<string, number>(
        recentCounts.map(r => [r.studentId, r._count.id])
    )

    const eligible = studentIds.filter(id => (countMap.get(id) ?? 0) < PER_STUDENT_WEEKLY_CAP)
    return { eligible, skippedCount: studentIds.length - eligible.length }
}

// ── Send campaign ─────────────────────────────────────────────────────────────

export async function sendUniversityNotification(formData: FormData) {
    const session = await auth()
    if (session?.user?.role !== 'UNIVERSITY') return { error: 'Unauthorized' }

    const title = (formData.get('title') as string)?.trim()
    const message = (formData.get('message') as string)?.trim()
    const segment = (formData.get('segment') as string) || 'interested'
    const dayRange = parseInt((formData.get('dayRange') as string) || '30', 10)
    const withEmail = formData.get('sendEmail') === 'on'

    if (!title || !message) return { error: 'Title and message are required' }
    if (title.length > 100) return { error: 'Title must be under 100 characters' }
    if (message.length > 1000) return { error: 'Message must be under 1000 characters' }

    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return { error: 'University profile not found' }

    // ── Admin kill switch ─────────────────────────────────────────────────────
    if (uni.notifPaused) {
        return { error: 'Your notification access has been paused by the platform admin. Please contact support.' }
    }

    // ── Weekly campaign quota (DB-backed) ────────────────────────────────────
    const campaignsThisWeek = await prisma.notificationCampaign.count({
        where: { universityId: uni.id, createdAt: { gte: startOfWeek() } }
    })

    if (campaignsThisWeek >= uni.notifQuota) {
        return {
            error: `📊 Weekly limit reached (${uni.notifQuota} campaigns/week). Quota resets every Monday. Contact support to increase your limit.`
        }
    }

    // ── Collect target students ───────────────────────────────────────────────
    const since = new Date(Date.now() - dayRange * 24 * 60 * 60 * 1_000)
    const fieldCategories = (uni.programList ?? []).map(p => p.fieldCategory as string)
    const allStudentIds = await resolveSegment(uni.id, segment, since, fieldCategories)

    if (allStudentIds.length === 0) {
        return { error: 'No students found in this segment. Try a wider time range or a different segment.' }
    }

    // ── Hard cap: 500 students max ────────────────────────────────────────────
    const hardCapped = allStudentIds.slice(0, MAX_STUDENTS_PER_CAMPAIGN)
    const wasCapped = allStudentIds.length > MAX_STUDENTS_PER_CAMPAIGN

    // ── Per-student weekly cap: max 3 UNIVERSITY_CAMPAIGN per student/7 days ─
    const { eligible: cappedIds, skippedCount } = await applyPerStudentCap(hardCapped)

    if (cappedIds.length === 0) {
        return { error: 'All students in this segment have already received the maximum number of university notifications this week. Try again next week.' }
    }

    // ── 6-hour burst limiter (DB-backed — survives cold starts & multi-node) ───
    const BURST_WINDOW_MS = 6 * 60 * 60 * 1_000
    if (uni.lastCampaignAt && Date.now() - uni.lastCampaignAt.getTime() < BURST_WINDOW_MS) {
        const msLeft = BURST_WINDOW_MS - (Date.now() - uni.lastCampaignAt.getTime())
        const hrsLeft = Math.ceil(msLeft / (60 * 60 * 1_000))
        return { error: `⏱ You can only send one campaign every 6 hours. Try again in ~${hrsLeft} hr.` }
    }

    // ── Bulk in-app notifications (single DB round trip) ─────────────────────
    await prisma.studentNotification.createMany({
        data: cappedIds.map(studentId => ({
            studentId,
            title,
            message,
            type: 'UNIVERSITY_CAMPAIGN',
            actionUrl: `/universities/${uni.id}`,
        })),
        skipDuplicates: true,
    })

    // ── Optional email — parallel dispatch, never throws ─────────────────────
    let emailedCount = 0
    if (withEmail) {
        const students = await prisma.student.findMany({
            where: { id: { in: cappedIds } },
            select: { user: { select: { email: true, consentMarketing: true } } }
        })
        const emailHtml = generateEmailHtml(title, EmailTemplates.announcement(title, message))
        const results = await Promise.allSettled(
            students
                .filter(s => s.user.consentMarketing)
                .map(s => sendMarketingEmail({
                    userEmail: s.user.email,
                    to: s.user.email,
                    subject: `[EdUmeetup] ${title}`,
                    html: emailHtml,
                }))
        )
        emailedCount = results.filter(r => r.status === 'fulfilled').length
    }

    // ── Log campaign + stamp lastCampaignAt (single update) ───────────────────
    await Promise.all([
        prisma.notificationCampaign.create({
            data: {
                universityId: uni.id,
                title,
                message,
                segment,
                dayRange,
                withEmail,
                sentCount: cappedIds.length,
                emailedCount,
                skippedCount,
            }
        }),
        prisma.university.update({
            where: { id: uni.id },
            data: { lastCampaignAt: new Date() },
        }),
    ])

    return {
        success: true,
        notifiedCount: cappedIds.length,
        emailedCount,
        skippedCount,
        wasCapped,
        campaignsUsedThisWeek: campaignsThisWeek + 1,
        weeklyQuota: uni.notifQuota,
    }
}
