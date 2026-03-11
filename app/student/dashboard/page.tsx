import { prisma } from '@/lib/prisma'
import { FIELD_CATEGORIES } from '@/lib/constants'
import { requireUser } from '@/lib/auth'
import { DashboardUI } from '@/components/student/dashboard-ui'
import { getStudentAdvisoryStatus } from '@/app/actions/advisory-actions'
import { StudentAdvisor } from '@/components/chat/student-advisor'



export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const user = await requireUser()
    const email = user.email
    if (!email) return <div>User email required</div>

    // Step 1: Fetch student record (required — everything else depends on it)
    let student
    try {
        student = await prisma.student.findFirst({
            where: { user: { email } },
            include: { user: true }
        })
    } catch {
        // DB unreachable — show a friendly error rather than crash
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
                    <span className="text-4xl block mb-4">⏳</span>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Just a moment…</h2>
                    <p className="text-slate-500 text-sm">We're having trouble loading your dashboard. Please refresh in a few seconds.</p>
                </div>
            </div>
        )
    }

    if (!student) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">👋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Welcome to EdUmeetup!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        To match you with your dream university, we need a few details about your interests and background.
                    </p>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-500">
                        Please complete your registration flow to continue.
                    </div>
                </div>
            </div>
        )
    }

    // Step 2: Matching filter
    const interest = student.fieldOfInterest
    const fieldFilter = interest && (FIELD_CATEGORIES as readonly string[]).includes(interest)
        ? { equals: interest }
        : undefined

    // Step 3: Run all independent queries in parallel (was sequential — now 2-4x faster)
    const [matchedPrograms, recommendedUniversities, userInterests, myMeetings, advisoryStatus] =
        await Promise.allSettled([
            prisma.program.findMany({
                where: {
                    AND: [
                        { fieldCategory: fieldFilter },
                        { degreeLevel: { equals: student.preferredDegree || undefined } },
                        { status: 'ACTIVE' },
                        { university: { verificationStatus: 'VERIFIED' } }
                    ]
                },
                include: { university: true },
                take: 10
            }),
            prisma.university.findMany({
                where: { verificationStatus: 'VERIFIED' },
                take: 3,
                include: { programs: true }
            }),
            prisma.interest.findMany({
                where: { studentId: student.id },
                select: { universityId: true }
            }),
            prisma.meetingParticipant.findMany({
                where: { participantUserId: user.id },
                include: { meeting: { include: { university: true } } },
                orderBy: { meeting: { startTime: 'asc' } }
            }),
            getStudentAdvisoryStatus(),
        ])

    // Safely extract results — failed queries fall back to empty arrays
    const programs = matchedPrograms.status === 'fulfilled' ? matchedPrograms.value : []
    const universities = recommendedUniversities.status === 'fulfilled' ? recommendedUniversities.value : []
    const interests = userInterests.status === 'fulfilled' ? userInterests.value : []
    const meetings = myMeetings.status === 'fulfilled' ? myMeetings.value : []
    const advisory = advisoryStatus.status === 'fulfilled' ? advisoryStatus.value : null

    const interestedUniIds = interests.map(i => i.universityId)

    return (
        <>
            <DashboardUI
                student={JSON.parse(JSON.stringify(student))}
                matchedPrograms={JSON.parse(JSON.stringify(programs))}
                recommendedUniversities={JSON.parse(JSON.stringify(universities))}
                myMeetings={JSON.parse(JSON.stringify(meetings))}
                interestedUniIds={interestedUniIds}
                advisoryStatus={JSON.parse(JSON.stringify(advisory))}
                hasCv={!!student.cvFileName}
            />
            {/* Student-only AI advisor — bottom-left, teal, distinct from public AdmissionsChat */}
            <StudentAdvisor studentName={student.fullName} />
        </>
    )
}
