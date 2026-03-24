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
        where: { deletedAt: null },   // exclude soft-deleted fairs
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

    return events.map((e: any) => ({
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
        console.error('[createFairEvent]')
        return { ok: false, error: 'Failed to create fair event. Please try again.' }
    }
}

// ── Soft-delete a FairEvent (data preserved) ──────────────────────────────────
export async function deleteFairEvent(
    id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    await requireAdmin()
    try {
        await prisma.fairEvent.update({
            where: { id },
            data: { deletedAt: new Date() },
        })
        revalidatePath('/admin/fairs')
        return { ok: true }
    } catch (err) {
        console.error('[deleteFairEvent]')
        return { ok: false, error: 'Failed to archive fair event.' }
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

// ── Q&A — Submit a question ────────────────────────────────────────────────────
export async function createFairQuestion(
    fairEventId: string,
    question: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const session = await auth()
    if (!session?.user) return { ok: false, error: 'Please sign in to ask a question.' }

    const trimmed = question.trim()
    if (!trimmed || trimmed.length < 5)
        return { ok: false, error: 'Question must be at least 5 characters.' }
    if (trimmed.length > 500)
        return { ok: false, error: 'Question must be under 500 characters.' }

    try {
        await prisma.fairQuestion.create({
            data: {
                fairEventId,
                question: trimmed,
                askerRole: session.user.role ?? 'STUDENT',
                askerId: session.user.id ?? '',
                isPublic: true,
            },
        })
        revalidatePath(`/fair`)
        revalidatePath(`/admin/fairs/${fairEventId}`)
        return { ok: true }
    } catch (err) {
        console.error('[createFairQuestion]')
        return { ok: false, error: 'Failed to submit question. Please try again.' }
    }
}

// ── Q&A — Admin answers a question ────────────────────────────────────────────
export async function answerFairQuestion(
    questionId: string,
    answer: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
    await requireAdmin()

    const trimmed = answer.trim()
    if (!trimmed) return { ok: false, error: 'Answer cannot be empty.' }

    try {
        await prisma.fairQuestion.update({
            where: { id: questionId },
            data: { answer: trimmed, answeredAt: new Date() },
        })
        revalidatePath('/admin/fairs')
        return { ok: true }
    } catch (err) {
        console.error('[answerFairQuestion]')
        return { ok: false, error: 'Failed to save answer. Please try again.' }
    }
}

export type FairQuestionRow = {
    id: string
    question: string
    askerRole: string
    answer: string | null
    answeredAt: string | null
    createdAt: string
}

// ── All registrations (every FairStudentPass for a fair) ─────────────────────
export async function getRegistrations(fairEventId: string) {
    await requireAdmin()

    const passes = await prisma.fairStudentPass.findMany({
        where: { fairEventId },
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            currentInstitution: true,
            currentCourse: true,
            currentSemester: true,
            fieldOfInterest: true,
            budgetRange: true,
            preferredCountries: true,
            emailConsent: true,
            whatsappConsent: true,
            isPartialProfile: true,
            studentId: true,
            createdAt: true,
            // count how many booths they visited
            _count: { select: { attendances: true } },
        },
    })

    return passes.map((p: any) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        currentInstitution: p.currentInstitution,
        currentCourse: p.currentCourse,
        currentSemester: p.currentSemester,
        fieldOfInterest: p.fieldOfInterest,
        budgetRange: p.budgetRange,
        preferredCountries: p.preferredCountries,
        emailConsent: p.emailConsent,
        whatsappConsent: p.whatsappConsent,
        isPartialProfile: p.isPartialProfile,
        isRegistered: !!p.studentId,
        boothVisits: p._count.attendances,
        createdAt: p.createdAt.toISOString(),
    }))
}

export type RegistrationRow = Awaited<ReturnType<typeof getRegistrations>>[number]

// ── Export all registrations as CSV (admin only) ──────────────────────────────
export async function exportAllRegistrationsCSV(
    fairEventId: string,
): Promise<{ csv?: string; error?: string }> {
    await requireAdmin()

    try {
        const passes = await prisma.fairStudentPass.findMany({
            where: { fairEventId },
            orderBy: { createdAt: 'asc' },
            include: {
                _count: { select: { attendances: true } },
            },
        })

        const header = [
            'Name', 'Email', 'Phone', 'Institution', 'Course', 'Semester',
            'Field of Interest', 'Budget', 'Preferred Countries',
            'Email Consent', 'WhatsApp Consent', 'Profile Type',
            'Booth Visits', 'Registered At',
        ]

        const escape = (v: string | null | undefined) =>
            `"${String(v ?? '').replace(/"/g, '""')}"`

        const rows = passes.map((p: any) =>
            [
                escape(p.fullName),
                escape(p.email),
                escape(p.phone),
                escape(p.currentInstitution),
                escape(p.currentCourse),
                escape(p.currentSemester),
                escape(p.fieldOfInterest),
                escape(p.budgetRange),
                escape(p.preferredCountries),
                escape(p.emailConsent ? 'Yes' : 'No'),
                escape(p.whatsappConsent ? 'Yes' : 'No'),
                escape(p.isPartialProfile ? 'Walk-in' : 'Registered'),
                escape(p._count.attendances.toString()),
                escape(p.createdAt.toISOString()),
            ].join(','),
        )

        const csv = [header.join(','), ...rows].join('\n')
        return { csv }
    } catch (error) {
        console.error('[exportAllRegistrationsCSV]')
        return { error: 'Failed to generate CSV' }
    }
}
