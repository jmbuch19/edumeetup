'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
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

// ── List all fairs with live stats ────────────────────────────────────────────
export async function listFairEvents() {
    await requireAdmin()

    const events = await prisma.fairEvent.findMany({
        orderBy: { startDate: 'desc' },
        include: {
            _count: {
                select: {
                    studentPasses: true,
                    attendances: true,
                },
            },
        },
    })

    return events.map((e) => ({
        id: e.id,
        name: e.name,
        slug: e.slug,
        city: e.city,
        venue: e.venue,
        country: e.country,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        endedAt: e.endedAt?.toISOString() ?? null,
        status: e.status,
        capacity: e.capacity,
        passes: e._count.studentPasses,
        scans: e._count.attendances,
    }))
}

export type FairEventRow = Awaited<ReturnType<typeof listFairEvents>>[number]

// ── Create a new FairEvent ─────────────────────────────────────────────────────
export async function createFairEvent(formData: {
    name: string
    slug: string
    city?: string
    venue?: string
    country?: string
    startDate: string
    endDate: string
    capacity?: string
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    await requireAdmin()

    const { name, slug, city, venue, country, startDate, endDate, capacity } = formData

    if (!name.trim() || !slug.trim() || !startDate || !endDate) {
        return { ok: false, error: 'Name, slug, start date and end date are required.' }
    }

    const slugClean = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // Check slug uniqueness
    const existing = await prisma.fairEvent.findUnique({ where: { slug: slugClean } })
    if (existing) return { ok: false, error: `Slug "${slugClean}" is already taken.` }

    try {
        const event = await prisma.fairEvent.create({
            data: {
                name: name.trim(),
                slug: slugClean,
                city: city?.trim() || null,
                venue: venue?.trim() || null,
                country: country?.trim() || null,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                status: 'UPCOMING',
                capacity: capacity ? parseInt(capacity, 10) : null,
            },
        })
        revalidatePath('/admin/fairs')
        // Non-blocking: notify all verified universities + students
        triggerFairCreatedNotifications(event.id).catch(console.error)
        return { ok: true, id: event.id }
    } catch (err) {
        console.error('[createFairEvent]', err)
        return { ok: false, error: 'Failed to create fair event. Please try again.' }
    }
}

// ── Mark fair as LIVE ─────────────────────────────────────────────────────────
export async function setFairLive(id: string) {
    await requireAdmin()
    await prisma.fairEvent.update({ where: { id }, data: { status: 'LIVE', endedAt: null } })
    revalidatePath('/admin/fairs')
    revalidatePath(`/admin/fairs/${id}`)
    // Non-blocking: scanner links to universities, live alert to city students
    triggerFairGoLiveNotifications(id).catch(console.error)
}

// ── End a fair (set endedAt + status COMPLETED) ────────────────────────────────
export async function endFair(id: string) {
    await requireAdmin()
    await prisma.fairEvent.update({
        where: { id },
        data: { endedAt: new Date(), status: 'COMPLETED' },
    })
    revalidatePath('/admin/fairs')
    revalidatePath(`/admin/fairs/${id}`)
    // Non-blocking: lead reports to universities, wrap-up to checked-in students
    triggerFairEndedNotifications(id).catch(console.error)
}

// ── Get single fair + detailed stats ──────────────────────────────────────────
export async function getFairDetail(id: string) {
    await requireAdmin()

    const event = await prisma.fairEvent.findUnique({
        where: { id },
        include: {
            _count: {
                select: { studentPasses: true, attendances: true },
            },
        },
    })
    if (!event) return null

    // Unique universities scanned
    const uniCount = await prisma.fairAttendance.groupBy({
        by: ['universityId'],
        where: { fairEventId: id },
    })

    // Walk-ins vs registered
    const walkIns = await prisma.fairStudentPass.count({
        where: { fairEventId: id, isPartialProfile: true },
    })

    return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        city: event.city,
        venue: event.venue,
        country: event.country,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        endedAt: event.endedAt?.toISOString() ?? null,
        status: event.status,
        capacity: event.capacity,
        totalPasses: event._count.studentPasses,
        totalScans: event._count.attendances,
        uniqueUnis: uniCount.length,
        walkIns,
        registeredStudents: event._count.studentPasses - walkIns,
    }
}

export type FairDetail = Awaited<ReturnType<typeof getFairDetail>>
