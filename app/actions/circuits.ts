'use server'

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { differenceInDays } from "date-fns"

export async function registerForCircuit(circuitId: string, bypassOverlapCheck: boolean = false) {
    try {
        const user = await requireUser()
        if (!user?.email) throw new Error("Not Authorized")

        const university = await prisma.university.findFirst({
            where: { user: { email: user.email } }
        })

        if (!university) throw new Error("University not found")

        const circuit = await prisma.fairCircuit.findUnique({
            where: { id: circuitId }
        })

        if (!circuit) throw new Error("Circuit not found")

        const daysUntilStart = differenceInDays(new Date(circuit.startDate), new Date())
        const isLate = daysUntilStart < 90
        const status = isLate ? "PENDING_APPROVAL" : "REGISTERED"

        if (!bypassOverlapCheck) {
            const overlap = await prisma.circuitRegistration.findFirst({
                where: {
                    universityId: university.id,
                    circuitId: { not: circuit.id },
                    circuit: {
                        startDate: { lte: circuit.endDate },
                        endDate: { gte: circuit.startDate }
                    }
                },
                include: { circuit: true }
            });

            if (overlap) {
                return {
                    success: false,
                    isOverlap: true,
                    message: `Note: Your institution is also registered for ${overlap.circuit.name} running during the same period.\n\nPlease ensure a dedicated representative is assigned to cover each circuit. Do you wish to proceed?`
                }
            }
        }

        const registration = await prisma.circuitRegistration.upsert({
            where: {
                circuitId_universityId: {
                    circuitId: circuit.id,
                    universityId: university.id
                }
            },
            create: {
                circuitId: circuit.id,
                universityId: university.id,
                status
            },
            update: {
                status
            }
        })

        revalidatePath("/university/dashboard")

        return { success: true, registration, status }
    } catch (error: any) {
        console.error("Failed to register for circuit:", error)
        return { success: false, message: error.message || "Failed to register" }
    }
}

export async function assignRepToCircuit(registrationId: string, repId: string) {
    try {
        const user = await requireUser()
        if (!user?.email) throw new Error("Not Authorized")

        const registration = await prisma.circuitRegistration.findUnique({
            where: { id: registrationId },
            include: { circuit: true }
        })

        if (!registration) throw new Error("Registration not found")
        const thisCircuit = registration.circuit

        const conflict = await prisma.circuitRegistration.findFirst({
            where: {
                repId: repId,
                id: { not: registrationId },
                circuit: {
                    startDate: { lte: thisCircuit.endDate },
                    endDate: { gte: thisCircuit.startDate },
                }
            },
            include: { circuit: { select: { name: true } } }
        })

        if (conflict) {
            return {
                success: false,
                message: `This rep is already assigned to ${conflict.circuit.name} which runs during the same period. Please assign a different rep.`
            }
        }

        await prisma.circuitRegistration.update({
            where: { id: registrationId },
            data: { repId }
        })

        revalidatePath("/university/dashboard")

        return { success: true }
    } catch (error: any) {
        console.error("Failed to assign rep:", error)
        return { success: false, message: error.message || "Failed to assign rep" }
    }
}
