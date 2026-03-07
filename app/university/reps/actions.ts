'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { hash } from 'bcryptjs'

export async function getUniversityReps() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return []
    }

    const userId = session.user.id

    // Get the university profile ID first
    const profile = await prisma.university.findUnique({
        where: { userId },
        select: { id: true }
    })

    if (!profile) return []

    return await prisma.user.findMany({
        where: {
            universityId: profile.id,
            role: 'UNIVERSITY_REP'
        },
        select: {
            id: true,
            email: true,
            isActive: true,
            createdAt: true
        }
    })
}

export async function createRep(formData: FormData) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return { error: 'Unauthorized' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Email and Password required' }
    }

    const userId = session.user.id
    const profile = await prisma.university.findUnique({
        where: { userId },
        select: { id: true }
    })

    if (!profile) return { error: 'University Profile not found' }

    try {
        const hashedPassword = await hash(password, 10)

        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'UNIVERSITY_REP',
                universityId: profile.id,
                isActive: true
            }
        })

        revalidatePath('/university/reps')
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'Email already exists' }
        console.error(e)
        return { error: 'Failed to create rep' }
    }
}

export async function toggleRepStatus(repId: string, currentStatus: string) {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        return { error: 'Unauthorized' }
    }

    // Verify ownership (rep belongs to this uni)
    const userId = session.user.id
    const profile = await prisma.university.findUnique({
        where: { userId },
        select: { id: true }
    })

    const rep = await prisma.user.findFirst({
        where: { id: repId, universityId: profile?.id }
    })

    if (!rep) return { error: 'Rep not found or unauthorized' }

    // Toggle isActive
    await prisma.user.update({
        where: { id: repId },
        data: { isActive: !rep.isActive }
    })

    revalidatePath('/university/reps')
    return { success: true }
}
