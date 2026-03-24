import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FairReportDashboard } from './fair-report-dashboard'

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ fairEventId: string }>
}

export default async function FairReportPage(props: PageProps) {
    const params = await props.params;
    const { fairEventId } = params

    // ── Auth guard ────────────────────────────────────────────────────────────
    const session = await auth()
    const role = session?.user?.role

    const allowed = role === 'UNIVERSITY' || role === 'UNIVERSITY_REP' || role === 'ADMIN'
    if (!session?.user || !allowed) {
        redirect('/login')
    }

    const userId = session.user.id
    const isAdmin = role === 'ADMIN'

    // ── Resolve universityId ──────────────────────────────────────────────────
    let universityId: string | null = null
    let universityName = 'Admin View (All Universities)'

    if (!isAdmin) {
        if (role === 'UNIVERSITY') {
            const uni = await prisma.university.findUnique({
                where: { userId },
                select: { id: true, institutionName: true },
            })
            universityId = uni?.id ?? null
            universityName = uni?.institutionName ?? ''
        } else {
            const repUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { universityId: true, representedUniversity: { select: { institutionName: true } } },
            })
            universityId = repUser?.universityId ?? null
            universityName = repUser?.representedUniversity?.institutionName ?? ''
        }
        if (!universityId) redirect('/unauthorized')
    }

    // ── Fetch fair event ──────────────────────────────────────────────────────
    const fairEvent = await prisma.fairEvent.findUnique({
        where: { id: fairEventId },
        select: {
            id: true,
            name: true,
            city: true,
            venue: true,
            startDate: true,
            endDate: true,
            endedAt: true,
            status: true,
        },
    })

    if (!fairEvent) {
        return (
            <main className="min-h-screen flex items-center justify-center px-6">
                <div className="text-center">
                    <p className="text-4xl mb-4">❌</p>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Fair Event Not Found</h1>
                    <p className="text-gray-500 text-sm">Check the event ID or contact your admin.</p>
                </div>
            </main>
        )
    }

    // ── Fetch leads (all if admin, filtered by uni if university) ─────────────
    const leads = await prisma.fairAttendance.findMany({
        where: {
            fairEventId,
            ...(universityId ? { universityId } : {}),
        },
        include: {
            pass: {
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    phone: true,
                    currentInstitution: true,
                    currentCourse: true,
                    yearOfPassing: true,
                    fieldOfInterest: true,
                    budgetRange: true,
                    preferredCountries: true,
                    isPartialProfile: true,
                    emailConsent: true,
                    whatsappConsent: true,
                    studentId: true,
                },
            },
        },
        orderBy: { scannedAt: 'asc' },
    })

    // Serialize dates for client component
    const serializedLeads = leads.map((l: any) => ({
        ...l,
        scannedAt: l.scannedAt.toISOString(),
    }))

    const serializedFairEvent = {
        ...fairEvent,
        name: fairEvent.name,
        startDate: fairEvent.startDate.toISOString(),
        endDate: fairEvent.endDate.toISOString(),
        endedAt: fairEvent.endedAt?.toISOString() ?? null,
    }

    return (
        <FairReportDashboard
            fairEvent={serializedFairEvent}
            leads={serializedLeads}
            universityId={universityId ?? 'admin'}
            universityName={universityName}
        />
    )
}
