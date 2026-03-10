'use server'

/**
 * app/university/actions/group-sessions.ts
 *
 * All server actions for the Group Session feature.
 *
 * Key design decisions:
 *  - joinGroupSession uses a Prisma $transaction with _count to prevent overbooking
 *  - status transitions: OPEN → FILLING (>50%) → FULL (capacity reached) → LIVE → COMPLETED
 *  - When FULL, a follow-up DRAFT session is auto-created and stored as followUpDraftId
 *  - Waitlisted students are promoted automatically when a seat is freed
 */

import { prisma } from '@/lib/prisma'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://edumeetup.com'

// ─── Auth helpers ──────────────────────────────────────────────────────────────

async function requireUniversity() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, name: true, email: true, universityId: true },
    })

    if (!user || (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP')) {
        return { error: 'Unauthorized' as const, user: null, uni: null }
    }

    const uni = await prisma.university.findFirst({
        where: user.role === 'UNIVERSITY' ? { userId: user.id } : { id: user.universityId! },
        select: { id: true, institutionName: true, verificationStatus: true },
    })

    if (!uni) return { error: 'University profile not found' as const, user: null, uni: null }
    if (uni.verificationStatus !== 'VERIFIED') {
        return { error: 'Only verified universities can manage group sessions' as const, user: null, uni: null }
    }

    return { error: null, user, uni }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CreateGroupSessionInput = {
    title: string
    agenda?: string
    programId?: string
    targetField?: string
    scheduledAt: string   // ISO string
    durationMinutes?: number
    capacity?: number
}

// ─── 1. createGroupSession ─────────────────────────────────────────────────────

export async function createGroupSession(
    input: CreateGroupSessionInput
): Promise<{ success?: boolean; sessionId?: string; error?: string; audiencePreview?: AudiencePreview }> {
    const { error, uni } = await requireUniversity()
    if (error || !uni) return { error: error ?? 'Unauthorized' }

    const capacity = Math.min(input.capacity ?? 10, 10) // Hard cap at 10
    const scheduledAt = new Date(input.scheduledAt)

    if (isNaN(scheduledAt.getTime())) return { error: 'Invalid scheduled date' }
    if (scheduledAt <= new Date()) return { error: 'Session must be scheduled in the future' }

    const session = await prisma.groupSession.create({
        data: {
            universityId: uni.id,
            programId: input.programId || null,
            targetField: input.targetField || null,
            title: input.title,
            agenda: input.agenda || null,
            scheduledAt,
            durationMinutes: input.durationMinutes ?? 45,
            capacity,
            status: 'OPEN',
        },
    })

    // Build audience preview (tiered matching — do NOT send yet)
    const preview = await buildAudiencePreview(uni.id, input.programId, input.targetField)

    revalidatePath('/university/dashboard')
    revalidatePath('/university/group-sessions')

    return { success: true, sessionId: session.id, audiencePreview: preview }
}

// ─── 2. notifyMatchedStudents ──────────────────────────────────────────────────

export async function notifyMatchedStudents(
    sessionId: string,
    studentIds?: string[]  // if undefined, notify all matched students
): Promise<{ success?: boolean; notified?: number; error?: string }> {
    const { error, uni } = await requireUniversity()
    if (error || !uni) return { error: error ?? 'Unauthorized' }

    const session = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        select: { id: true, universityId: true, title: true, scheduledAt: true, capacity: true, targetField: true, programId: true, agenda: true },
    })

    if (!session || session.universityId !== uni.id) return { error: 'Session not found' }

    // Build audience if not explicitly provided
    const targets = studentIds ?? await getMatchedStudentIds(uni.id, session.programId, session.targetField)

    if (targets.length === 0) return { success: true, notified: 0 }

    const students = await prisma.student.findMany({
        where: { id: { in: targets }, user: { consentMarketing: true, consentWithdrawnAt: null, isActive: true } },
        select: { id: true, fullName: true, user: { select: { email: true } } },
    })

    const dateStr = new Date(session.scheduledAt).toLocaleString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    }) + ' IST'

    await Promise.all(students.map(async (student) => {
        // In-app notification
        await prisma.studentNotification.create({
            data: {
                studentId: student.id,
                title: `🎓 ${uni.institutionName} is hosting a group info session`,
                message: `${session.title} — ${dateStr}. ${session.capacity} seats available. Reserve yours before it fills up!`,
                type: 'INFO',
                actionUrl: `/universities?session=${session.id}`,
            },
        })

        // Email
        await sendEmail({
            to: student.user.email,
            subject: `${uni.institutionName} is hosting a group session — grab your seat`,
            html: generateEmailHtml(`${uni.institutionName} Group Info Session`, `
                <p>Hi ${student.fullName?.split(' ')[0] || 'there'},</p>
                <p><strong>${uni.institutionName}</strong> is hosting a group information session and you're invited.</p>
                <div class="info-box">
                    <div class="info-row"><span class="info-label">Session:</span> <span>${session.title}</span></div>
                    <div class="info-row"><span class="info-label">When:</span> <span>${dateStr}</span></div>
                    <div class="info-row"><span class="info-label">Seats:</span> <span>${session.capacity} (limited)</span></div>
                    ${session.agenda ? `<div class="info-row"><span class="info-label">Agenda:</span> <span>${session.agenda}</span></div>` : ''}
                </div>
                <p style="text-align:center;margin-top:24px;">
                    <a href="${BASE_URL}/student/dashboard?tab=group-sessions" class="btn">Reserve My Seat →</a>
                </p>
                <p style="font-size:12px;color:#94a3b8;">Seats are limited and fill up fast. First come, first served.</p>
            `),
        })
    }))

    // Update notified count
    await prisma.groupSession.update({
        where: { id: sessionId },
        data: { notifiedCount: { increment: students.length } },
    })

    revalidatePath('/university/group-sessions')
    return { success: true, notified: students.length }
}

// ─── 3. joinGroupSession (ATOMIC — race-condition safe) ────────────────────────

export async function joinGroupSession(
    sessionId: string
): Promise<{ success?: boolean; status?: 'CONFIRMED' | 'WAITLISTED'; waitlistPos?: number; error?: string }> {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true },
    })

    if (!user || user.role !== 'STUDENT') return { error: 'Only students can join group sessions' }

    const student = await prisma.student.findFirst({
        where: { userId: user.id },
        select: { id: true },
    })
    if (!student) return { error: 'Student profile not found' }

    // Check not already in session
    const existing = await prisma.groupSessionSeat.findUnique({
        where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
    })
    if (existing && existing.status !== 'CANCELLED') {
        return { error: 'You already have a seat in this session', status: existing.status as 'CONFIRMED' | 'WAITLISTED' }
    }

    try {
        const seat = await prisma.$transaction(async (tx) => {
            // Lock and count confirmed seats
            const gs = await tx.groupSession.findUnique({
                where: { id: sessionId },
                select: {
                    capacity: true,
                    status: true,
                    title: true,
                    scheduledAt: true,
                    universityId: true,
                    _count: { select: { seats: { where: { status: 'CONFIRMED' } } } },
                },
            })

            if (!gs) throw new Error('Session not found')
            if (gs.status === 'CANCELLED' || gs.status === 'COMPLETED') {
                throw new Error('This session is no longer available')
            }

            const confirmed = gs._count.seats

            if (confirmed >= gs.capacity) {
                // Auto-waitlist — never reject silently
                const waitlistCount = await tx.groupSessionSeat.count({
                    where: { groupSessionId: sessionId, status: 'WAITLISTED' },
                })

                // Upsert in case they previously cancelled
                return await tx.groupSessionSeat.upsert({
                    where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
                    update: { status: 'WAITLISTED', waitlistPos: waitlistCount + 1 },
                    create: { groupSessionId: sessionId, studentId: student.id, status: 'WAITLISTED', waitlistPos: waitlistCount + 1 },
                })
            }

            // Claim seat atomically
            const newConfirmed = confirmed + 1
            const newStatus = newConfirmed >= gs.capacity ? 'FULL'
                : newConfirmed > gs.capacity / 2 ? 'FILLING'
                : 'OPEN'

            const [newSeat] = await Promise.all([
                tx.groupSessionSeat.upsert({
                    where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
                    update: { status: 'CONFIRMED', waitlistPos: null },
                    create: { groupSessionId: sessionId, studentId: student.id, status: 'CONFIRMED' },
                }),
                newStatus !== gs.status
                    ? tx.groupSession.update({ where: { id: sessionId }, data: { status: newStatus as any } })
                    : Promise.resolve(),
            ])

            // If just hit FULL → auto-create follow-up DRAFT
            if (newStatus === 'FULL') {
                const draft = await tx.groupSession.create({
                    data: {
                        universityId: gs.universityId,
                        title: gs.title, // same title, time TBD
                        scheduledAt: new Date(gs.scheduledAt.getTime() + 24 * 60 * 60 * 1000), // placeholder: +1 day
                        capacity: gs.capacity,
                        status: 'DRAFT',
                    },
                })
                await tx.groupSession.update({
                    where: { id: sessionId },
                    data: { followUpDraftId: draft.id },
                })
            }

            return newSeat
        })

        revalidatePath('/student/dashboard')
        revalidatePath('/university/group-sessions')

        return {
            success: true,
            status: seat.status as 'CONFIRMED' | 'WAITLISTED',
            waitlistPos: seat.waitlistPos ?? undefined,
        }
    } catch (e: any) {
        return { error: e.message || 'Failed to join session' }
    }
}

// ─── 4. leaveGroupSession ──────────────────────────────────────────────────────

export async function leaveGroupSession(
    sessionId: string
): Promise<{ success?: boolean; error?: string }> {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!student) return { error: 'Student profile not found' }

    const seat = await prisma.groupSessionSeat.findUnique({
        where: { groupSessionId_studentId: { groupSessionId: sessionId, studentId: student.id } },
    })
    if (!seat || seat.status === 'CANCELLED') return { error: 'No active seat found' }

    const wasConfirmed = seat.status === 'CONFIRMED'

    await prisma.$transaction(async (tx) => {
        // Cancel the leaving student's seat
        await tx.groupSessionSeat.update({
            where: { id: seat.id },
            data: { status: 'CANCELLED' },
        })

        if (wasConfirmed) {
            // Promote first waitlisted student
            const nextInLine = await tx.groupSessionSeat.findFirst({
                where: { groupSessionId: sessionId, status: 'WAITLISTED' },
                orderBy: { waitlistPos: 'asc' },
                include: {
                    student: { select: { fullName: true, user: { select: { email: true } } } },
                },
            })

            if (nextInLine) {
                await tx.groupSessionSeat.update({
                    where: { id: nextInLine.id },
                    data: { status: 'CONFIRMED', waitlistPos: null, notifiedAt: new Date() },
                })

                // Get session info for notification
                const gs = await tx.groupSession.findUnique({
                    where: { id: sessionId },
                    select: { title: true, scheduledAt: true, universityId: true, status: true, _count: { select: { seats: { where: { status: 'CONFIRMED' } } } } },
                })

                // Flip status back to FILLING if it was FULL
                if (gs?.status === 'FULL') {
                    await tx.groupSession.update({ where: { id: sessionId }, data: { status: 'FILLING' } })
                }

                // Notify promoted student
                await tx.studentNotification.create({
                    data: {
                        studentId: nextInLine.studentId,
                        title: '🎉 A seat just opened up for you!',
                        message: `You've been moved from the waitlist to confirmed for "${gs?.title}". Your spot is secured!`,
                        type: 'SUCCESS',
                        actionUrl: `/student/dashboard?tab=group-sessions`,
                    },
                })

                // Email the promoted student
                if (nextInLine.student?.user?.email) {
                    await sendEmail({
                        to: nextInLine.student.user.email,
                        subject: `🎉 You got a seat! ${gs?.title}`,
                        html: generateEmailHtml('Seat Confirmed!', `
                            <p>Hi ${nextInLine.student.fullName?.split(' ')[0] || 'there'},</p>
                            <p>Great news — a seat just opened up in <strong>${gs?.title}</strong> and you're next in line. Your spot is now <strong>confirmed</strong>.</p>
                            <p style="text-align:center;margin-top:24px;">
                                <a href="${BASE_URL}/student/dashboard?tab=group-sessions" class="btn">View Session →</a>
                            </p>
                        `),
                    })
                }
            }
        }
    })

    revalidatePath('/student/dashboard')
    revalidatePath('/university/group-sessions')
    return { success: true }
}

// ─── 5. publishFollowUpDraft ───────────────────────────────────────────────────

export async function publishFollowUpDraft(
    draftSessionId: string,
    scheduledAt: string
): Promise<{ success?: boolean; error?: string }> {
    const { error, uni } = await requireUniversity()
    if (error || !uni) return { error: error ?? 'Unauthorized' }

    const draft = await prisma.groupSession.findUnique({
        where: { id: draftSessionId },
        select: { id: true, universityId: true, status: true },
    })

    if (!draft || draft.universityId !== uni.id) return { error: 'Draft session not found' }
    if (draft.status !== 'DRAFT') return { error: 'This session is not in draft status' }

    const newDate = new Date(scheduledAt)
    if (isNaN(newDate.getTime()) || newDate <= new Date()) {
        return { error: 'Please pick a future date and time' }
    }

    // Publish the draft
    await prisma.groupSession.update({
        where: { id: draftSessionId },
        data: { scheduledAt: newDate, status: 'OPEN' },
    })

    // Find the original (full) session that spawned this draft
    const originalSession = await prisma.groupSession.findFirst({
        where: { followUpDraftId: draftSessionId, universityId: uni.id },
        select: { id: true, title: true },
    })

    // Notify waitlisted students from the original session FIRST
    if (originalSession) {
        const waitlisted = await prisma.groupSessionSeat.findMany({
            where: { groupSessionId: originalSession.id, status: 'WAITLISTED' },
            include: {
                student: { select: { id: true, fullName: true, user: { select: { email: true } } } },
            },
            orderBy: { waitlistPos: 'asc' },
        })

        const dateStr = newDate.toLocaleString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
        }) + ' IST'

        await Promise.all(waitlisted.map(async (ws) => {
            await prisma.studentNotification.create({
                data: {
                    studentId: ws.student.id,
                    title: `${uni.institutionName} opened a new session just for you`,
                    message: `You were on the waitlist for "${originalSession.title}". We opened another session on ${dateStr} — you're first in line.`,
                    type: 'SUCCESS',
                    actionUrl: `/student/dashboard?tab=group-sessions`,
                },
            })

            await sendEmail({
                to: ws.student.user.email,
                subject: `${uni.institutionName} opened a new session for you`,
                html: generateEmailHtml('New Session — You\'re First in Line', `
                    <p>Hi ${ws.student.fullName?.split(' ')[0] || 'there'},</p>
                    <p>You were on the waitlist for a <strong>${uni.institutionName}</strong> session that filled up. 
                    We're happy to let you know they've opened a <strong>new session on ${dateStr}</strong> — 
                    and you're being notified first.</p>
                    <p style="text-align:center;margin-top:24px;">
                        <a href="${BASE_URL}/student/dashboard?tab=group-sessions" class="btn">Reserve My Seat →</a>
                    </p>
                `),
            })
        }))
    }

    revalidatePath('/university/group-sessions')
    return { success: true }
}

// ─── 6. shareRecap ────────────────────────────────────────────────────────────

export async function shareRecap(
    sessionId: string,
    recapUrl: string
): Promise<{ success?: boolean; reached?: number; error?: string }> {
    const { error, uni } = await requireUniversity()
    if (error || !uni) return { error: error ?? 'Unauthorized' }

    const gs = await prisma.groupSession.findUnique({
        where: { id: sessionId },
        select: { id: true, universityId: true, title: true, programId: true, targetField: true, seats: { select: { studentId: true } } },
    })

    if (!gs || gs.universityId !== uni.id) return { error: 'Session not found' }

    // Save recap URL
    await prisma.groupSession.update({ where: { id: sessionId }, data: { recapUrl } })

    // Build recipient list: confirmed + waitlisted + all matched interested students
    const confirmedIds = new Set(gs.seats.map(s => s.studentId))
    const matchedIds = await getMatchedStudentIds(uni.id, gs.programId, gs.targetField)
    const allIds = [...new Set([...confirmedIds, ...matchedIds])]

    const students = await prisma.student.findMany({
        where: { id: { in: allIds }, user: { consentMarketing: true, consentWithdrawnAt: null } },
        select: { id: true, fullName: true, user: { select: { email: true } } },
    })

    await Promise.all(students.map(async (student) => {
        const wasConfirmed = confirmedIds.has(student.id)

        await prisma.studentNotification.create({
            data: {
                studentId: student.id,
                title: wasConfirmed ? `Recap available: ${gs.title}` : `You missed ${gs.title} — here's what happened`,
                message: wasConfirmed
                    ? `The recording and notes from your session with ${uni.institutionName} are ready.`
                    : `The session with ${uni.institutionName} is over, but we've got the recap for you.`,
                type: 'INFO',
                actionUrl: recapUrl,
            },
        })

        await sendEmail({
            to: student.user.email,
            subject: wasConfirmed
                ? `Recap ready: ${gs.title}`
                : `You missed ${uni.institutionName}'s session — here's the recap`,
            html: generateEmailHtml(
                wasConfirmed ? 'Session Recap Ready' : 'Missed the Session? No Worries.',
                `
                <p>Hi ${student.fullName?.split(' ')[0] || 'there'},</p>
                <p>${wasConfirmed
                    ? `Here's the recap from your recent group session with <strong>${uni.institutionName}</strong>.`
                    : `The <strong>${uni.institutionName}</strong> group session just ended. Even though you couldn't make it, we've got the recording and notes for you.`
                }</p>
                <p style="text-align:center;margin-top:24px;">
                    <a href="${recapUrl}" class="btn">View Session Recap →</a>
                </p>
                ${!wasConfirmed ? `<p style="font-size:12px;color:#94a3b8;">Stay tuned — ${uni.institutionName} may run more sessions soon.</p>` : ''}
                `
            ),
        })
    }))

    revalidatePath('/university/group-sessions')
    return { success: true, reached: students.length }
}

// ─── 7. getGroupSessions (University view) ────────────────────────────────────

export async function getGroupSessions(): Promise<{ sessions?: GroupSessionWithStats[]; error?: string }> {
    const { error, uni } = await requireUniversity()
    if (error || !uni) return { error: error ?? 'Unauthorized' }

    const sessions = await prisma.groupSession.findMany({
        where: { universityId: uni.id },
        include: {
            program: { select: { programName: true } },
            seats: { select: { status: true, waitlistPos: true } },
        },
        orderBy: { scheduledAt: 'asc' },
    })

    return {
        sessions: sessions.map(s => ({
            id: s.id,
            title: s.title,
            agenda: s.agenda,
            programName: s.program?.programName ?? null,
            targetField: s.targetField,
            scheduledAt: s.scheduledAt,
            durationMinutes: s.durationMinutes,
            capacity: s.capacity,
            status: s.status,
            joinUrl: s.joinUrl,
            recapUrl: s.recapUrl,
            notifiedCount: s.notifiedCount,
            followUpDraftId: s.followUpDraftId,
            confirmedCount: s.seats.filter(s => s.status === 'CONFIRMED').length,
            waitlistedCount: s.seats.filter(s => s.status === 'WAITLISTED').length,
        }))
    }
}

export type GroupSessionWithStats = {
    id: string
    title: string
    agenda: string | null
    programName: string | null
    targetField: string | null
    scheduledAt: Date
    durationMinutes: number
    capacity: number
    status: string
    joinUrl: string | null
    recapUrl: string | null
    notifiedCount: number
    followUpDraftId: string | null
    confirmedCount: number
    waitlistedCount: number
}

// ─── 8. getStudentGroupSessions ────────────────────────────────────────────────

export async function getStudentGroupSessions(): Promise<{ sessions?: StudentGroupSession[]; error?: string }> {
    const session = await auth()
    if (!session?.user) return { error: 'Unauthorized' }

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
    })
    if (!student) return { error: 'Student profile not found' }

    const seats = await prisma.groupSessionSeat.findMany({
        where: { studentId: student.id, status: { not: 'CANCELLED' } },
        include: {
            groupSession: {
                include: {
                    university: { select: { institutionName: true, logo: true } },
                    program: { select: { programName: true } },
                    _count: { select: { seats: { where: { status: 'CONFIRMED' } } } },
                },
            },
        },
        orderBy: { groupSession: { scheduledAt: 'asc' } },
    })

    return {
        sessions: seats.map(seat => ({
            seatId: seat.id,
            seatStatus: seat.status as 'CONFIRMED' | 'WAITLISTED',
            waitlistPos: seat.waitlistPos,
            session: {
                id: seat.groupSession.id,
                title: seat.groupSession.title,
                agenda: seat.groupSession.agenda,
                scheduledAt: seat.groupSession.scheduledAt,
                durationMinutes: seat.groupSession.durationMinutes,
                capacity: seat.groupSession.capacity,
                confirmedCount: seat.groupSession._count.seats,
                status: seat.groupSession.status,
                joinUrl: seat.groupSession.joinUrl,
                recapUrl: seat.groupSession.recapUrl,
                universityName: seat.groupSession.university.institutionName,
                universityLogo: seat.groupSession.university.logo,
                programName: seat.groupSession.program?.programName ?? null,
            },
        }))
    }
}

export type StudentGroupSession = {
    seatId: string
    seatStatus: 'CONFIRMED' | 'WAITLISTED'
    waitlistPos: number | null
    session: {
        id: string
        title: string
        agenda: string | null
        scheduledAt: Date
        durationMinutes: number
        capacity: number
        confirmedCount: number
        status: string
        joinUrl: string | null
        recapUrl: string | null
        universityName: string
        universityLogo: string | null
        programName: string | null
    }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

type AudiencePreview = {
    tier1Count: number  // direct program match
    tier2Count: number  // field match
    tier3Count: number  // general interest match
    totalCount: number
}

async function buildAudiencePreview(
    universityId: string,
    programId?: string | null,
    targetField?: string | null
): Promise<AudiencePreview> {
    const ids = await getMatchedStudentIdsByTier(universityId, programId, targetField)
    return {
        tier1Count: ids.tier1.length,
        tier2Count: ids.tier2.length,
        tier3Count: ids.tier3.length,
        totalCount: ids.tier1.length + ids.tier2.length + ids.tier3.length,
    }
}

async function getMatchedStudentIds(
    universityId: string,
    programId?: string | null,
    targetField?: string | null
): Promise<string[]> {
    const tiers = await getMatchedStudentIdsByTier(universityId, programId, targetField)
    // Deduplicate across tiers, Tier 1 takes priority
    const seen = new Set<string>()
    const result: string[] = []
    for (const id of [...tiers.tier1, ...tiers.tier2, ...tiers.tier3]) {
        if (!seen.has(id)) { seen.add(id); result.push(id) }
    }
    return result
}

async function getMatchedStudentIdsByTier(
    universityId: string,
    programId?: string | null,
    targetField?: string | null
): Promise<{ tier1: string[], tier2: string[], tier3: string[] }> {

    const baseWhere = {
        profileComplete: true,
        user: { consentMarketing: true, consentWithdrawnAt: null, isActive: true },
    }

    // Tier 1: direct program interest match
    const tier1 = programId ? await prisma.student.findMany({
        where: { ...baseWhere, interests: { some: { universityId, programId } } },
        select: { id: true },
    }) : []

    const tier1Ids = new Set(tier1.map(s => s.id))

    // Tier 2: field match via Interest → Program.fieldCategory
    const tier2Raw = targetField ? await prisma.student.findMany({
        where: {
            ...baseWhere,
            id: { notIn: [...tier1Ids] },
            interests: { some: { universityId, program: { fieldCategory: targetField } } },
        },
        select: { id: true },
    }) : []

    const tier2Ids = new Set(tier2Raw.map(s => s.id))

    // Tier 3: general field of interest on student profile
    const tier3 = targetField ? await prisma.student.findMany({
        where: {
            ...baseWhere,
            id: { notIn: [...tier1Ids, ...tier2Ids] },
            fieldOfInterest: { contains: targetField, mode: 'insensitive' },
        },
        select: { id: true },
        take: 50, // cap to avoid notifying too broadly
    }) : []

    return {
        tier1: tier1.map(s => s.id),
        tier2: tier2Raw.map(s => s.id),
        tier3: tier3.map(s => s.id),
    }
}
