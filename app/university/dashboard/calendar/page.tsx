import { CalendarView } from "@/components/university/calendar-view"
import { requireRole } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function CalendarPage() {
    const user = await requireRole('UNIVERSITY')

    const university = await prisma.university.findUnique({
        where: { userId: user.id }
    })

    if (!university) return <div>University profile not found</div>

    // Fetch Meetings
    const meetings = await prisma.meeting.findMany({
        where: { createdByUniversityId: university.id },
        orderBy: { startTime: 'asc' }
    })

    // Fetch Availability Slots
    const slots = await prisma.availabilitySlot.findMany({
        where: { universityId: university.id },
        orderBy: { startTime: 'asc' }
    })

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-2xl font-bold">Meeting Calendar</h1>
            <p className="text-gray-600">View your scheduled meetings and open availability slots.</p>

            <CalendarView meetings={meetings} slots={slots} />
        </div>
    )
}
