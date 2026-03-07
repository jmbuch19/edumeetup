'use server'

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { sendEmail, EmailTemplates, generateEmailHtml } from "@/lib/email"

export async function getUniversityOutreach() {
    const session = await auth()
    if (!session || !session.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) return []

    const university = await prisma.university.findUnique({
        where: { userId: session.user.id }
    })

    if (!university) return []

    return await prisma.hostRequestOutreach.findMany({
        where: { universityId: university.id },
        include: {
            hostRequest: true // Details of the fair
        },
        orderBy: { sentAt: 'desc' }
    })
}

export async function respondToOutreach(outreachId: string, status: 'INTERESTED' | 'NOT_INTERESTED', note?: string) {
    const session = await auth()
    if (!session || !session.user || (session.user.role !== 'UNIVERSITY' && session.user.role !== 'UNIVERSITY_REP')) {
        return { error: "Unauthorized" }
    }

    try {
        // Verify ownership
        const university = await prisma.university.findUnique({
            where: { userId: session.user.id }
        })

        if (!university) return { error: "University not found" }

        const existing = await prisma.hostRequestOutreach.findUnique({
            where: { id: outreachId }
        })

        if (!existing || existing.universityId !== university.id) {
            return { error: "Invitation not found or access denied" }
        }

        // Update
        const updatedOutreach = await prisma.hostRequestOutreach.update({
            where: { id: outreachId },
            data: {
                status,
                responseNote: note,
                respondedAt: new Date()
            },
            include: {
                hostRequest: true,
                university: true
            }
        })

        // Notify Admin
        const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL
        if (ADMIN_EMAIL) {
            await sendEmail({
                to: ADMIN_EMAIL,
                subject: `University Response: ${updatedOutreach.university.institutionName}`,
                html: generateEmailHtml(
                    "University Response",
                    EmailTemplates.universityResponse(
                        updatedOutreach.university.institutionName,
                        updatedOutreach.hostRequest.institutionName,
                        updatedOutreach.hostRequest.referenceNumber,
                        status,
                        note
                    )
                )
            })
        } else {
            console.warn('[respondToOutreach] ADMIN_NOTIFICATION_EMAIL not set — admin email skipped')
        }

        // Also notify the host institution about this university's response
        if (updatedOutreach.hostRequest.contactEmail) {
            await sendEmail({
                to: updatedOutreach.hostRequest.contactEmail,
                subject: `Update on your Campus Fair: ${updatedOutreach.hostRequest.referenceNumber}`,
                html: generateEmailHtml(
                    'Campus Fair Update',
                    EmailTemplates.fairUpdateForHost(
                        updatedOutreach.university.institutionName,
                        status,
                        updatedOutreach.hostRequest.referenceNumber,
                        note
                    )
                )
            })
        }

        revalidatePath('/university/fairs')
        return { success: true }
    } catch (error) {
        console.error("Failed to respond to outreach:", error)
        return { error: "Failed to submit response" }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM FAIR PARTICIPATION
// Called when university rep submits the FairResponsePanel form
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
        // 1. Auth guard — universityId always from session
        const session = await auth()
        if (!session?.user) return { ok: false, error: 'Unauthorized' }
        const role = (session.user as any).role
        if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') return { ok: false, error: 'Unauthorized' }
        const uni = await prisma.university.findUnique({ where: { userId: session.user.id! } })
        if (!uni) return { ok: false, error: 'University not found.' }

        // 2. Fetch fair + check rsvpDeadline
        const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
        if (!fair) return { ok: false, error: 'Fair event not found.' }
        if (fair.rsvpDeadline && new Date() > fair.rsvpDeadline) {
            return { ok: false, error: 'RSVP deadline has passed for this fair.' }
        }

        // 3. Upsert FairInvitation
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

        // 4. Count matched students
        const matchedCount = data.programsShowcasing.length > 0
            ? await prisma.fairStudentPass.count({
                where: { fairEventId, fieldOfInterest: { in: data.programsShowcasing } },
            })
            : await prisma.fairStudentPass.count({ where: { fairEventId } })

        // 5. Success in-app notification
        await prisma.universityNotification.create({
            data: {
                universityId: uni.id,
                title: `✅ You're confirmed for ${fair.name}`,
                message: `${matchedCount} student${matchedCount !== 1 ? 's' : ''} interested in your programs have already registered. Booth details will be shared 48 hours before the event.`,
                type: 'FAIR_CONFIRMED',
                isRead: false,
                metadata: { fairEventId },
                actionUrl: `/university/fairs/${fairEventId}/students`,
            },
        })

        // 6. Revalidate
        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[confirmFairParticipation]', err)
        return { ok: false, error: 'Failed to confirm participation. Please try again.' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DECLINE FAIR INVITATION
// Silent — no notification created on decline
// ─────────────────────────────────────────────────────────────────────────────
export async function declineFairInvitation(
    fairEventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        // 1. Auth guard
        const session = await auth()
        if (!session?.user) return { ok: false, error: 'Unauthorized' }
        const role = (session.user as any).role
        if (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP') return { ok: false, error: 'Unauthorized' }
        const uni = await prisma.university.findUnique({ where: { userId: session.user.id! } })
        if (!uni) return { ok: false, error: 'University not found.' }

        // 2. Check rsvpDeadline
        const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
        if (!fair) return { ok: false, error: 'Fair event not found.' }
        if (fair.rsvpDeadline && new Date() > fair.rsvpDeadline) {
            return { ok: false, error: 'RSVP deadline has passed for this fair.' }
        }

        // 3. Upsert DECLINED
        await prisma.fairInvitation.upsert({
            where: { fairEventId_universityId: { fairEventId, universityId: uni.id } },
            create: { fairEventId, universityId: uni.id, status: 'DECLINED', respondedAt: new Date() },
            update: { status: 'DECLINED', respondedAt: new Date() },
        })

        // 4. Revalidate — no notification (decline is silent)
        revalidatePath('/university/dashboard')
        return { ok: true }
    } catch (err) {
        console.error('[declineFairInvitation]', err)
        return { ok: false, error: 'Failed to record your response. Please try again.' }
    }
}
