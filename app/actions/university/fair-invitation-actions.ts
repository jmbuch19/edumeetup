'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { sendEmail, generateEmailHtml } from '@/lib/email'
import { redirect } from 'next/navigation'

async function requireUniversity() {
    const session = await auth()
    if (!session?.user) redirect('/login')
    const role = (session.user as any).role
    if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') {
        redirect('/login')
    }
    const uni = await prisma.university.findUnique({ where: { userId: session.user.id! } })
    if (!uni) redirect('/login')
    return uni
}

async function requireAdmin() {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/login')
    return session
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM PARTICIPATION
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmFairParticipation(
    fairEventId: string,
    data: {
        repsAttending: number
        programsShowcasing: string[]
        specialRequirements?: string
    },
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const uni = await requireUniversity()

        // ── Fetch fair + check deadline ───────────────────────────────────────
        const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
        if (!fair) return { ok: false, error: 'Fair event not found.' }
        if (fair.rsvpDeadline && new Date() > fair.rsvpDeadline) {
            return { ok: false, error: 'RSVP deadline has passed for this fair.' }
        }

        // ── Upsert the FairInvitation ─────────────────────────────────────────
        await prisma.fairInvitation.upsert({
            where: { fairEventId_universityId: { fairEventId, universityId: uni.id } },
            create: {
                fairEventId,
                universityId: uni.id,
                status: 'CONFIRMED',
                repsAttending: data.repsAttending,
                programsShowcasing: data.programsShowcasing,
                specialRequirements: data.specialRequirements ?? null,
                respondedAt: new Date(),
            },
            update: {
                status: 'CONFIRMED',
                repsAttending: data.repsAttending,
                programsShowcasing: data.programsShowcasing,
                specialRequirements: data.specialRequirements ?? null,
                respondedAt: new Date(),
            },
        })

        // ── Matched student count ─────────────────────────────────────────────
        // If programs selected → match on fieldOfInterest overlap
        // Otherwise → all registered students for the fair
        let matchedCount = 0
        if (data.programsShowcasing.length > 0) {
            matchedCount = await prisma.fairStudentPass.count({
                where: {
                    fairEventId,
                    fieldOfInterest: { in: data.programsShowcasing },
                },
            })
        } else {
            matchedCount = await prisma.fairStudentPass.count({ where: { fairEventId } })
        }

        // ── Success in-app notification ───────────────────────────────────────
        await prisma.universityNotification.create({
            data: {
                universityId: uni.id,
                title: `✅ Confirmed for ${fair.name}`,
                message: `Your booth is confirmed. ${matchedCount} student${matchedCount !== 1 ? 's' : ''} interested in your programs have already registered. Booth details will be shared 48 hours before the event.`,
                type: 'FAIR_CONFIRMED',
                isRead: false,
                actionUrl: `/university/fairs/${fairEventId}/students`,
            },
        })

        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[confirmFairParticipation]')
        return { ok: false, error: 'Failed to confirm participation. Please try again.' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECLINE INVITATION
// ─────────────────────────────────────────────────────────────────────────────
export async function declineFairInvitation(
    fairEventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        const uni = await requireUniversity()

        const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
        if (!fair) return { ok: false, error: 'Fair event not found.' }
        if (fair.rsvpDeadline && new Date() > fair.rsvpDeadline) {
            return { ok: false, error: 'RSVP deadline has passed for this fair.' }
        }

        await prisma.fairInvitation.upsert({
            where: { fairEventId_universityId: { fairEventId, universityId: uni.id } },
            create: {
                fairEventId,
                universityId: uni.id,
                status: 'DECLINED',
                respondedAt: new Date(),
            },
            update: {
                status: 'DECLINED',
                respondedAt: new Date(),
            },
        })

        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[declineFairInvitation]')
        return { ok: false, error: 'Failed to record your response. Please try again.' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND REMINDER  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendFairInvitationReminder(
    fairEventId: string,
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
    try {
        await requireAdmin()

        const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
        if (!fair) return { ok: false, error: 'Fair event not found.' }

        // All PENDING invitations for this fair
        const pending = await prisma.fairInvitation.findMany({
            where: { fairEventId, status: 'PENDING' },
            include: {
                university: {
                    select: {
                        institutionName: true,
                        repName: true,
                        repEmail: true,
                        contactEmail: true,
                    },
                },
            },
        })

        const dateStr = fair.startDate.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric',
        })

        const results = await Promise.allSettled(
            pending.map((inv) => {
                const email = inv.university.repEmail ?? inv.university.contactEmail
                if (!email) return Promise.resolve({ skipped: true })
                return sendEmail({
                    to: email,
                    subject: `Reminder: Please confirm your participation in ${fair.name}`,
                    html: generateEmailHtml(
                        'Fair Participation Reminder',
                        `<p>Hi ${inv.university.repName ?? inv.university.institutionName},</p>
                        <p>This is a friendly reminder that <strong>${fair.name}</strong> is happening on <strong>${dateStr}</strong>${fair.city ? ` in ${fair.city}` : ''}.</p>
                        <p>We haven't received your RSVP yet. Please confirm your participation from your university dashboard.</p>
                        ${fair.rsvpDeadline ? `<p><strong>RSVP Deadline:</strong> ${fair.rsvpDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
                        <p><a href="${process.env.NEXTAUTH_URL}/university/dashboard" class="btn">Confirm in Dashboard</a></p>`
                    ),
                })
            })
        )

        const sent = results.filter(r => r.status === 'fulfilled').length
        revalidatePath(`/admin/fairs/${fairEventId}`)
        return { ok: true, sent }
    } catch (err) {
        console.error('[sendFairInvitationReminder]')
        return { ok: false, error: 'Failed to send reminders. Please try again.' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET FAIR INVITATIONS  (admin only — for response tracker)
// ─────────────────────────────────────────────────────────────────────────────
export async function getFairInvitations(fairEventId: string) {
    await requireAdmin()
    return prisma.fairInvitation.findMany({
        where: { fairEventId },
        include: {
            university: {
                select: {
                    institutionName: true,
                    logo: true,
                },
            },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    })
}
export type FairInvitationRow = Awaited<ReturnType<typeof getFairInvitations>>[number]
