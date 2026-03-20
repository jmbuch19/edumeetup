'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
// import { sendEmail } from "@/lib/email" // assuming future integration

export async function sendCircuitWelcomeEmails(circuitId: string) {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const registrations = await prisma.circuitRegistration.findMany({
            where: { circuitId },
            include: { university: { select: { institutionName: true } } }
        })

        const unassigned = registrations.filter(r => !r.repId)

        if (unassigned.length > 0) {
            return {
                success: false,
                error: `${unassigned.length} registration(s) have no rep assigned. Please ensure all reps are assigned before sending welcome emails.`,
                unassignedUniversities: unassigned.map(r => r.university.institutionName || 'Unknown')
            }
        }

        // TODO: In the future, actually send the welcome emails here using sendEmail()
        
        return { success: true, message: "Welcome emails dispatched successfully." }
    } catch (error: any) {
        console.error("Failed to send welcome emails:")
        return { success: false, error: error.message || "Failed to process" }
    }
}
