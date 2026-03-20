'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function listFairCircuits(page: number = 1, pageSize: number = 20) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const skip = (page - 1) * pageSize

    const [circuits, total] = await Promise.all([
        prisma.fairCircuit.findMany({
            orderBy: { startDate: 'asc' },
            skip,
            take: pageSize,
            include: {
                venues: true,
                events: true,
                foreignReps: {
                    include: {
                        university: { select: { institutionName: true, logo: true } }
                    }
                }
            }
        }),
        prisma.fairCircuit.count()
    ])

    return { 
        circuits, 
        total, 
        totalPages: Math.ceil(total / pageSize) 
    }
}

export async function updateCircuitStatus(circuitId: string, status: 'DRAFT' | 'PUBLISHED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED') {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const data: { status: typeof status, publishedAt?: Date, noticeDays?: number } = { status }
    
    // Auto-calculate notice period and publish date when publishing
    if (status === 'PUBLISHED') {
        const circuit = await prisma.fairCircuit.findUnique({ where: { id: circuitId } })
        if (circuit) {
            data.publishedAt = new Date()
            const noticeDays = Math.floor((circuit.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            data.noticeDays = Math.max(0, noticeDays)
        }
    }

    const updated = await prisma.fairCircuit.update({
        where: { id: circuitId },
        data
    })

    revalidatePath('/admin/fairs/circuits')
    revalidatePath('/host-a-fair/request')

    if (status === 'PUBLISHED') {
        const circuit = await prisma.fairCircuit.findUnique({ where: { id: circuitId } })
        if (circuit) {
            const noticeDays = Math.floor((circuit.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            return {
                circuit: updated,
                warning: noticeDays < 60
                    ? `Only ${noticeDays} days notice — recommended minimum is 60 days`
                    : null,
                latePublish: noticeDays < 0
            }
        }
    }
    
    return { circuit: updated }
}
