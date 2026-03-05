import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ScannerClient } from './scanner-client'
import { getTodayScanCount } from './actions'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: { id: string }
}

export default async function ScanPage({ params }: PageProps) {
    const fairEventId = params.id

    // ── Auth guard ────────────────────────────────────────────────────────────
    const session = await auth()
    const role = session?.user?.role

    if (!session?.user || (role !== 'UNIVERSITY' && role !== 'UNIVERSITY_REP' && role !== 'ADMIN')) {
        redirect('/unauthorized')
    }

    const userId = session.user.id

    // ── Resolve universityId ──────────────────────────────────────────────────
    let universityId: string | null = null

    if (role === 'UNIVERSITY') {
        const uni = await prisma.university.findUnique({
            where: { userId },
            select: { id: true },
        })
        universityId = uni?.id ?? null
    } else if (role === 'UNIVERSITY_REP') {
        // UNIVERSITY_REP — universityId stored on User model
        const repUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { universityId: true },
        })
        universityId = repUser?.universityId ?? null
    } else if (role === 'ADMIN') {
        // ADMIN — pick the first attending university for this fair (view-only context)
        const firstAttendance = await prisma.fairAttendance.findFirst({
            where: { fairEventId },
            select: { universityId: true },
        })
        universityId = firstAttendance?.universityId ?? null
    }

    // ADMIN can view without a universityId (no universities attending yet is valid)
    if (!universityId && role !== 'ADMIN') {
        redirect('/unauthorized')
    }

    // ── Fetch fair event ──────────────────────────────────────────────────────
    const fairEvent = await prisma.fairEvent.findUnique({
        where: { id: fairEventId },
        select: { id: true, name: true, city: true, status: true },
    })

    if (!fairEvent) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-950 px-6">
                <div className="text-center">
                    <p className="text-4xl mb-4">❌</p>
                    <h1 className="text-xl font-bold text-white mb-2">Fair Event Not Found</h1>
                    <p className="text-gray-400 text-sm">Check the event ID and try again.</p>
                </div>
            </main>
        )
    }

    // ── Today's scan count for this university at this fair ───────────────────
    const scanCount = universityId ? await getTodayScanCount(universityId, fairEventId) : 0

    return (
        <ScannerClient
            fairEventId={fairEventId}
            universityId={universityId ?? 'admin-view'}
            fairEventTitle={fairEvent.name}
            initialScanCount={scanCount}
        />
    )
}
