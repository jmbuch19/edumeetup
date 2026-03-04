'use server'

/**
 * Fair Event Server Actions
 *
 * Creates/manages FairEvent records and fires notification triggers
 * non-blocking (no await on triggers — .catch(console.error) only).
 *
 * NOTE: These live at app/admin/fairs/actions.ts (separate from the
 * existing app/(admin)/admin/fairs/actions.ts).
 * These actions augment the admin fair management with notification triggers.
 */

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import {
    triggerFairCreatedNotifications,
    triggerFairGoLiveNotifications,
    triggerFairEndedNotifications,
} from '@/lib/fair/notifications'

async function requireAdmin() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')
    return session
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 1: Create Fair Event
// ─────────────────────────────────────────────────────────────────────────────
export async function createFairEventWithNotify(formData: {
    name: string
    slug: string
    city?: string
    venue?: string
    country?: string
    description?: string
    startDate: string
    endDate: string
    capacity?: string
    isHybrid?: boolean
    onlineUrl?: string
}): Promise<{ success: true; event: { id: string; slug: string } } | { success: false; error: string }> {
    await requireAdmin()

    const { name, slug, city, venue, country, description, startDate, endDate, capacity, isHybrid, onlineUrl } = formData

    if (!name.trim() || !slug.trim() || !startDate || !endDate) {
        return { success: false, error: 'Name, slug, start date and end date are required.' }
    }

    const slugClean = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    const existing = await prisma.fairEvent.findUnique({ where: { slug: slugClean } })
    if (existing) return { success: false, error: `Slug "${slugClean}" is already in use.` }

    try {
        const event = await prisma.fairEvent.create({
            data: {
                name: name.trim(),
                slug: slugClean,
                city: city?.trim() || null,
                venue: venue?.trim() || null,
                country: country?.trim() || null,
                description: description?.trim() || null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'UPCOMING',
                capacity: capacity ? parseInt(capacity, 10) : null,
                isHybrid: isHybrid ?? false,
                onlineUrl: isHybrid ? (onlineUrl?.trim() || null) : null,
            },
        })

        // Non-blocking: notify universities + students
        triggerFairCreatedNotifications(event.id).catch(console.error)

        revalidatePath('/admin/fairs')
        return { success: true, event: { id: event.id, slug: event.slug } }
    } catch (err: unknown) {
        console.error('[createFairEventWithNotify]', err)
        return { success: false, error: 'Failed to create fair event. Please try again.' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 2: Set Fair LIVE
// ─────────────────────────────────────────────────────────────────────────────
export async function setFairLiveWithNotify(
    fairEventId: string,
): Promise<{ success: true } | { success: false; error: string }> {
    await requireAdmin()

    const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
    if (!fair) return { success: false, error: 'Fair event not found.' }
    if (fair.status !== 'UPCOMING') return { success: false, error: `Cannot go live from status ${fair.status}.` }

    await prisma.fairEvent.update({
        where: { id: fairEventId },
        data: { status: 'LIVE', endedAt: null },
    })

    // Non-blocking: scanner links to universities, live alerts to city students
    triggerFairGoLiveNotifications(fairEventId).catch(console.error)

    revalidatePath('/admin/fairs')
    revalidatePath(`/admin/fairs/${fairEventId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 3: End Fair
// ─────────────────────────────────────────────────────────────────────────────
export async function setFairEndedWithNotify(
    fairEventId: string,
): Promise<{ success: true } | { success: false; error: string }> {
    await requireAdmin()

    const fair = await prisma.fairEvent.findUnique({ where: { id: fairEventId } })
    if (!fair) return { success: false, error: 'Fair event not found.' }
    if (fair.status !== 'LIVE') return { success: false, error: `Cannot end from status ${fair.status}.` }

    await prisma.fairEvent.update({
        where: { id: fairEventId },
        data: { status: 'COMPLETED', endedAt: new Date() },
    })

    // Non-blocking: lead reports to universities, wrap-up to checked-in students
    triggerFairEndedNotifications(fairEventId).catch(console.error)

    revalidatePath('/admin/fairs')
    revalidatePath(`/admin/fairs/${fairEventId}`)
    return { success: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// READ helpers (used by the admin dashboard page)
// ─────────────────────────────────────────────────────────────────────────────
export async function listFairEventsWithStats() {
    await requireAdmin()

    const [events, totalPasses, totalScans, uniqueUnis] = await Promise.all([
        prisma.fairEvent.findMany({
            orderBy: { startDate: 'desc' },
            include: {
                _count: { select: { studentPasses: true, attendances: true } },
            },
        }),
        prisma.fairStudentPass.count(),
        prisma.fairAttendance.count(),
        prisma.fairAttendance.groupBy({ by: ['universityId'] }).then(r => r.length),
    ])

    return {
        events: events.map(e => ({
            id: e.id,
            name: e.name,
            slug: e.slug,
            city: e.city,
            venue: e.venue,
            country: e.country,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate.toISOString(),
            endedAt: e.endedAt?.toISOString() ?? null,
            status: e.status as 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED',
            passes: e._count.studentPasses,
            scans: e._count.attendances,
        })),
        platformStats: { totalPasses, totalScans, uniqueUnis },
    }
}

export type FairRow = Awaited<ReturnType<typeof listFairEventsWithStats>>['events'][number]
