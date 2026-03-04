import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listFairEvents } from './actions'
import { FairListClient } from './fair-list-client'

export const dynamic = 'force-dynamic'

export default async function AdminFairsPage() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const events = await listFairEvents()

    return (
        <div className="max-w-6xl mx-auto py-4 md:py-8 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fair Events</h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage edUmeetup fair events. Each event generates a unique entrance QR.
                    </p>
                </div>
            </div>
            <FairListClient initialEvents={events} />
        </div>
    )
}
