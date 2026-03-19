'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function listFairCircuits() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const circuits = await prisma.fairCircuit.findMany({
        orderBy: { startDate: 'asc' },
        include: {
            venues: true,
            events: true,
            foreignReps: {
                include: {
                    university: { select: { institutionName: true, logo: true } }
                }
            }
        }
    })

    return circuits
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
            data.noticeDays = Math.max(0, Math.floor((circuit.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        }
    }

    const updated = await prisma.fairCircuit.update({
        where: { id: circuitId },
        data
    })

    revalidatePath('/admin/fairs/circuits')
    revalidatePath('/host-a-fair/request')
    
    let warning: string | undefined
    if (status === 'PUBLISHED' && data.noticeDays !== undefined && data.noticeDays < 60) {
        warning = `Circuit published with only ${data.noticeDays} days notice (recommended 60+).`
    }
    
    return { ...updated, warning }
}
