'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { uniNotifRateLimiter } from '@/lib/ratelimit'
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
            // Fetch the field categories of all programs this university offers
            programs: {
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
    const fieldCategories = (uni.programs ?? []).map(p => p.fieldCategory as string)
    const ids = await resolveSegment(uni.id, segment, since, fieldCategories)
    return { count: Math.min(ids.length, MAX_STUDENTS_PER_CAMPAIGN) }
}

// ── Campaign stats for the dashboard header cards ────────────────────────────

export async function getUniversityCampaignStats() {
    const session = await auth()
    if (session?.user?.role !== 'UNIVERSITY') return null

    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return null

    const [totalInterested, totalMeetings] = await Promise.all([
        prisma.interest.count({ where: { universityId: uni.id } }),
        prisma.meeting.count({ where: { universityId: uni.id, studentId: { not: null } } }),
    ])

    // Count this week's campaigns by counting distinct minute "buckets" of
    // [University]-prefixed notifications sent to this university's students
    const interestedIds = await prisma.interest.findMany({
        where: { universityId: uni.id },
        select: { studentId: true },
        distinct: ['studentId']
    })
    const uniStudentIds = interestedIds.map(i => i.studentId)

    let campaignsUsedThisWeek = 0
    if (uniStudentIds.length > 0) {
        const recentNotifs = await prisma.studentNotification.findMany({
            where: {
                studentId: { in: uniStudentIds },
                title: { startsWith: '[University]' },
                createdAt: { gte: startOfWeek() }
            },
            select: { createdAt: true }
        })
        const minuteBuckets = new Set(
            recentNotifs.map(n => {
                const d = new Date(n.createdAt)
                return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`
            })
        )
        campaignsUsedThisWeek = minuteBuckets.size
    }

    return {
        totalInterested,
        totalMeetings,
        campaignsUsedThisWeek,
        weeklyQuota: uni.notifQuota,
        notifPaused: uni.notifPaused,
    }
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

    // ── Layer 1: 6-hour burst limiter (in-memory) ─────────────────────────────
    const uni = await getUniversityProfile(session.user.id)
    if (!uni) return { error: 'University profile not found' }

    if (!uniNotifRateLimiter.check(uni.id)) {
        return { error: '⏱ You can only send one campaign every 6 hours. Please wait before sending again.' }
    }

    // ── Layer 2: Admin kill switch ────────────────────────────────────────────
    if (uni.notifPaused) {
        return { error: 'Your notification access has been paused by the platform admin. Please contact support.' }
    }

    // ── Collect target students ───────────────────────────────────────────────
    const since = new Date(Date.now() - dayRange * 24 * 60 * 60 * 1_000)
    const fieldCategories = (uni.programs ?? []).map(p => p.fieldCategory as string)
    const allStudentIds = await resolveSegment(uni.id, segment, since, fieldCategories)

    if (allStudentIds.length === 0) {
        return { error: 'No students found in this segment. Try a wider time range or a different segment.' }
    }

    // ── Layer 3: Weekly campaign quota ────────────────────────────────────────
    const weekNotifs = await prisma.studentNotification.findMany({
        where: {
            studentId: { in: allStudentIds },
            title: { startsWith: '[University]' },
            createdAt: { gte: startOfWeek() }
        },
        select: { createdAt: true }
    })
    const minuteBuckets = new Set(
        weekNotifs.map(n => {
            const d = new Date(n.createdAt)
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`
        })
    )
    const campaignsThisWeek = minuteBuckets.size

    if (campaignsThisWeek >= uni.notifQuota) {
        return {
            error: `📊 Weekly limit reached (${uni.notifQuota} campaigns/week). Quota resets every Monday. Contact support to increase your limit.`
        }
    }

    // ── Hard cap: 500 students max ────────────────────────────────────────────
    const cappedIds = allStudentIds.slice(0, MAX_STUDENTS_PER_CAMPAIGN)
    const wasCapped = allStudentIds.length > MAX_STUDENTS_PER_CAMPAIGN
    const taggedTitle = `[University] ${title}`

    // ── Bulk in-app notifications (single DB round trip) ─────────────────────
    await prisma.studentNotification.createMany({
        data: cappedIds.map(studentId => ({
            studentId,
            title: taggedTitle,
            message,
            type: 'INFO',
            actionUrl: `/universities/${uni.id}`,
        })),
        skipDuplicates: true,
    })

    // ── Optional email (only to consented students) ───────────────────────────
    let emailedCount = 0
    if (withEmail) {
        const students = await prisma.student.findMany({
            where: { id: { in: cappedIds } },
            select: { user: { select: { email: true, consentMarketing: true } } }
        })
        const emailHtml = generateEmailHtml(title, EmailTemplates.announcement(title, message))
        for (const s of students) {
            if (s.user.consentMarketing) {
                await sendMarketingEmail({
                    userEmail: s.user.email,
                    to: s.user.email,
                    subject: `[edUmeetup] ${title}`,
                    html: emailHtml
                })
                emailedCount++
            }
        }
    }

    return {
        success: true,
        notifiedCount: cappedIds.length,
        emailedCount,
        wasCapped,
        campaignsUsedThisWeek: campaignsThisWeek + 1,
        weeklyQuota: uni.notifQuota,
    }
}
