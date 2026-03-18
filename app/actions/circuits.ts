'use server'

import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { differenceInDays } from "date-fns"

export async function registerForCircuit(circuitId: string) {
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
                repId: user.id,
                status
            },
            update: {
                status,
                repId: user.id
            }
        })

        revalidatePath("/university/dashboard")

        return { success: true, registration, status }
    } catch (error: any) {
        console.error("Failed to register for circuit:", error)
        return { success: false, message: error.message || "Failed to register" }
    }
}
