import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FairVisitsDashboard, type VisitData } from './fair-visits-dashboard'

export const dynamic = 'force-dynamic'

export default async function FairVisitsPage() {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user || session.user.role !== 'STUDENT') {
        redirect('/unauthorized')
    }

    // ── Get Student record ────────────────────────────────────────────────────
    const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true, profileComplete: true },
    })

    if (!student) redirect('/onboarding/student')

    // ── Fetch visits ──────────────────────────────────────────────────────────
    const rawVisits = await prisma.fairAttendance.findMany({
        where: {
            pass: { studentId: student.id },
        },
        include: {
            university: {
                include: {
                    documents: { where: { isFairReady: true } },
                },
            },
            fairEvent: {
                select: { id: true, name: true, endedAt: true },
            },
            pass: {
                select: { id: true, isPartialProfile: true },
            },
            messages: {
                orderBy: { createdAt: 'asc' },
            },
        },
        orderBy: { scannedAt: 'desc' },
    })

    // ── Resolve matchedPrograms IDs → names ───────────────────────────────────
    const allProgramIds = [...new Set(rawVisits.flatMap((v) => v.matchedPrograms))]
    const programs =
        allProgramIds.length > 0
            ? await prisma.program.findMany({
                where: { id: { in: allProgramIds } },
                select: { id: true, programName: true, fieldCategory: true },
            })
            : []
    const programMap = new Map(programs.map((p) => [p.id, p.programName]))

    // ── Serialize for client ──────────────────────────────────────────────────
    const visits: VisitData[] = rawVisits.map((v) => {
        const brochureDoc = v.university.documents.find(
            (d) => d.category.toLowerCase() === 'brochure',
        )

        return {
            id: v.id,
            createdAt: v.scannedAt.toISOString(),
            matchedPrograms: v.matchedPrograms
                .map((pid) => programMap.get(pid) ?? null)
                .filter(Boolean) as string[],
            repNotes: v.repNotes,
            emailSent: v.emailSent,
            university: {
                id: v.university.id,
                institutionName: v.university.institutionName,
                country: v.university.country,
                logo: v.university.logo,
                about: v.university.about,
                brochureUrl: brochureDoc?.fileUrl ?? null,
            },
            fairEvent: {
                id: v.fairEvent.id,
                name: v.fairEvent.name,
                endedAt: v.fairEvent.endedAt?.toISOString() ?? null,
            },
            pass: {
                id: v.pass.id,
                isPartialProfile: v.pass.isPartialProfile,
            },
            messages: v.messages.map((m) => ({
                id: m.id,
                content: m.content,
                senderRole: m.senderRole,
                sentAt: m.createdAt.toISOString(),
            })),
        }
    })

    const hasPartialProfile = rawVisits.some((v) => v.pass.isPartialProfile)

    return (
        <FairVisitsDashboard
            visits={visits}
            studentId={student.id}
            hasPartialProfile={hasPartialProfile}
        />
    )
}
