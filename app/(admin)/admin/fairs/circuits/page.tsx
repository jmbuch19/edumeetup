import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { listFairCircuits } from './actions'
import { CircuitListClient } from './circuit-list-client'

export const dynamic = 'force-dynamic'

export default async function AdminCircuitsPage() {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const circuits = await listFairCircuits()

    return (
        <div className="max-w-6xl mx-auto py-4 md:py-8 px-4 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fair Circuits</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage geographic fair recruitment tours and US University registrations.
                    </p>
                </div>
            </div>
            <CircuitListClient initialCircuits={circuits} />
        </div>
    )
}
