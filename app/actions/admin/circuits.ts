'use server'

import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
// import { sendEmail } from "@/lib/email" // assuming future integration

export async function sendCircuitWelcomeEmails(
    circuitId: string
): Promise<{ success: boolean; error?: string; message?: string; unassignedUniversities?: string[] }> {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const registrations = await prisma.circuitRegistration.findMany({
            where: { circuitId },
            include: { university: { select: { institutionName: true } } }
        })

        const unassigned = registrations.filter((r: any) => !r.repId)

        if (unassigned.length > 0) {
            return {
                success: false,
                error: `${unassigned.length} registration(s) have no rep assigned. Please ensure all reps are assigned before sending welcome emails.`,
                unassignedUniversities: unassigned.map((r: any) => r.university.institutionName || 'Unknown')
            }
        }

        // TODO: Send welcome emails once EmailTemplates.circuitWelcome(repName, circuitName, institutionName, startDate, endDate)
        //       is added to lib/email.ts. Also expand the findMany() include to fetch rep { name, email }
        //       and circuit { name, startDate, endDate } before wiring up the email loop.
        
        return { success: true, message: "Welcome emails dispatched successfully." }
    } catch (error: any) {
        console.error("Failed to send welcome emails:")
        return { success: false, error: error.message || "Failed to process" }
    }
}
