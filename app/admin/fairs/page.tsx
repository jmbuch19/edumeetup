/**
 * Admin Fair Management Dashboard
 *
 * Route: /admin/fairs  (standalone route, no (admin) group)
 * Auth:  ADMIN role required
 *
 * Sections:
 * 1. Stats row  — platform-wide fair totals
 * 2. Fair table  — all events with status badges + action buttons
 * 3. Create form — inline dialog for new fair events
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listFairEventsWithStats } from './actions'
import { FairAdminClient } from './fair-admin-client'

export const dynamic = 'force-dynamic'

export default async function AdminFairsPage() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const data = await listFairEventsWithStats()

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Fair Event Management
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Create events, manage lifecycle, and monitor engagement.
                        Notifications are sent automatically on each status change.
                    </p>
                </div>

                <FairAdminClient events={data.events} platformStats={data.platformStats} />
            </div>
        </div>
    )
}
