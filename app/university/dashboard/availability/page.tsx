import { getAvailability } from "@/app/actions/availability"
import { AvailabilityManager } from "@/components/university/availability-manager"
import { requireRole } from "@/lib/auth"

export default async function AvailabilityPage() {
    const user = await requireRole('UNIVERSITY')

    // We need the University Profile ID, but getAvailability takes University Profile ID
    // So we need to fetch the profile first or update getAvailability to take userId?
    // getAvailability takes universityId (Profile ID).

    // Let's create a helper or just fetch profile here.
    // Ideally actions should handle the auth and ID resolution if possible, or we pass ID.
    // In availability.ts, getAvailability takes universityId. 
    // But we are in a server component with the user.

    // Let's instantiate prisma here to get profile ID.
    const { prisma } = await import("@/lib/prisma")
    const university = await prisma.university.findUnique({
        where: { userId: user.id }
    })

    if (!university) return <div>University profile not found</div>

    const slots = await getAvailability(university.id)

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Manage Availability</h1>
            <p className="text-gray-600">Set your available time slots for 1:1 and group meetings.</p>

            <AvailabilityManager initialSlots={slots} />
        </div>
    )
}
