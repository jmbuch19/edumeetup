'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth' // Assuming we have this or similar
import { AdvisoryStatus } from '@prisma/client'

export async function updateAdvisoryStatus(requestId: string, status: AdvisoryStatus) {
    await requireRole('ADMIN')

    try {
        await prisma.advisoryRequest.update({
            where: { id: requestId },
            data: { status }
        })
        revalidatePath('/admin/advisory')
        revalidatePath(`/admin/advisory/${requestId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to update status" }
    }
}

export async function updateAdvisoryNotes(requestId: string, internalNotes: string) {
    await requireRole('ADMIN')

    try {
        await prisma.advisoryRequest.update({
            where: { id: requestId },
            data: { internalNotes }
        })
        revalidatePath(`/admin/advisory/${requestId}`)
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to update notes" }
    }
}

export async function assignAdviser(requestId: string, adviserId: string) {
    await requireRole('ADMIN')

    try {
        await prisma.advisoryRequest.update({
            where: { id: requestId },
            data: {
                adviserId,
                status: 'ASSIGNED'
            }
        })
        revalidatePath('/admin/advisory')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: "Failed to assign adviser" }
    }
}
