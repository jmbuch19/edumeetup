'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// --- Public Actions ---

export async function getPublicEvents() {
    // Casting to any due to persistent schema type mismatch in environment
    return await (prisma.event as any).findMany({
        where: {
            isPublished: true,
            status: 'UPCOMING',
            dateTime: { gte: new Date() }
        },
        include: {
            university: {
                select: { institutionName: true, logo: true, country: true }
            }
        },
        orderBy: { dateTime: 'asc' }
    })
}

export async function getEventDetails(eventId: string) {
    // Casting to any due to persistent schema type mismatch in environment
    const event = await (prisma.event as any).findUnique({
        where: { id: eventId },
        include: {
            university: true,
            _count: {
                select: { registrations: true }
            }
        }
    })
    return event
}

export async function registerForEvent(eventId: string) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'STUDENT') {
        return { error: 'Unauthorized' }
    }

    // Check if student profile exists
    const student = await prisma.student.findUnique({
        where: { userId: session.user.id }
    })

    if (!student) return { error: 'Student profile not found.' }

    try {
        await prisma.$transaction(async (tx) => {
            const event = await (tx.event as any).findUnique({
                where: { id: eventId },
                include: { _count: { select: { registrations: true } } }
            })

            if (!event) throw new Error('Event not found.')

            if (event.capacity && event._count.registrations >= event.capacity) {
                throw new Error('Event is fully booked.')
            }

            // check if already registered
            const existing = await tx.eventRegistration.findUnique({
                where: {
                    eventId_studentId: {
                        eventId,
                        studentId: student.id
                    }
                }
            })
            if (existing) throw new Error('You are already registered for this event.')

            await tx.eventRegistration.create({
                data: {
                    eventId,
                    studentId: student.id,
                    status: 'REGISTERED'
                }
            })
        })
        revalidatePath(`/events/${eventId}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'You are already registered for this event.' }
        return { error: e.message || 'Registration failed.' }
    }
}

// --- University Actions ---

export async function getUniversityEvents() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return []
    }

    const userId = session.user.id
    // Find uni id
    const profile = await prisma.university.findUnique({ where: { userId } })

    let universityId = profile?.id

    if (!universityId) {
        // Check rep
        // Fetch full user to avoid type inference issues with partial selects
        const user = await prisma.user.findUnique({ where: { id: userId } }) as any
        universityId = user?.universityId || undefined
    }

    if (!universityId) return []

    // Ensure we are using valid fields from schema
    // Casting to any to bypass persistent stale type generation in this environment
    return await (prisma.event as any).findMany({
        where: { universityId },
        orderBy: { dateTime: 'desc' },
        include: {
            _count: {
                select: { registrations: true }
            }
        }
    })
}

export async function createEvent(formData: FormData) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return { error: 'Unauthorized' }
    }

    const userId = session.user.id
    let universityId = null
    const profile = await prisma.university.findUnique({ where: { userId } })
    if (profile) universityId = profile.id
    else {
        const user = await prisma.user.findUnique({ where: { id: userId } }) as any
        universityId = user?.universityId
    }

    if (!universityId) return { error: 'University not found' }

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const type = formData.get('type') as string
    const dateTime = new Date(formData.get('dateTime') as string)
    const location = formData.get('location') as string
    const capacity = formData.get('capacity') ? parseInt(formData.get('capacity') as string) : null
    const isPublished = formData.get('isPublished') === 'on'

    await (prisma.event as any).create({
        data: {
            universityId,
            title,
            description,
            type,
            dateTime,
            location,
            capacity,
            isPublished,
            status: 'UPCOMING'
        }
    })

    revalidatePath('/university/events')
    // We might redirect here or let the client handle it. 
    // Returning success lets client redirect.
    return { success: true }
}
