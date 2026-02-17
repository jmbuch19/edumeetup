import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AvailabilityForm from '@/components/meeting/AvailabilityForm'
import { getAvailability } from '@/app/meeting-actions'

export default async function AvailabilityPage() {
    const session = await auth()

    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        redirect('/login')
    }

    const availabilityData = await getAvailability()

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-8">Meeting Availability</h1>
            <AvailabilityForm
                initialAvailability={availabilityData || []}
                user={{ id: session.user.id || '', name: session.user.name || 'User' }}
            />
        </div>
    )
}
