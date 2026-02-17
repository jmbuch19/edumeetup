import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'
import { requireUser } from '@/lib/auth'
import { DashboardUI } from '@/components/student/dashboard-ui'
import { getStudentAdvisoryStatus } from '@/app/actions/advisory-actions'

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const user = await requireUser()
    const email = user.email

    const student = await prisma.studentProfile.findFirst({
        where: { user: { email } },
        include: { user: true }
    })

    if (!student) {
        // Redirect or show simple error/cta
        // Ideally redirect to profile creation
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">👋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Welcome to edUmeetup!</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        To match you with your dream university, we need a few details about your interests and background.
                    </p>
                    {/* Link to register would go here - for now just informative */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-500">
                        Please complete your registration flow to continue.
                    </div>
                </div>
            </div>
        )
    }

    // 2. Matching Logic
    const interest = student.fieldOfInterest as FieldCategory | null
    const fieldFilter = interest && Object.values(FieldCategory).includes(interest)
        ? { equals: interest }
        : undefined

    const matchedPrograms = await prisma.program.findMany({
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
    })

    // Fallback: Recommended Universities
    const recommendedUniversities = await prisma.universityProfile.findMany({
        where: { verificationStatus: 'VERIFIED' },
        take: 3,
        include: { programs: true }
    })

    // 3. User Interests for UI state
    const userInterests = await prisma.interest.findMany({
        where: { studentId: student.id },
        select: { universityId: true }
    })
    const interestedUniIds = new Set(userInterests.map(i => i.universityId))

    // 4. My Meetings
    const myMeetings = await prisma.meetingParticipant.findMany({
        where: { participantUserId: user.id },
        include: {
            meeting: {
                include: { university: true }
            }
        },
        orderBy: { meeting: { startTime: 'asc' } }
    })

    // 5. Advisory Status
    const advisoryStatus = await getStudentAdvisoryStatus()

    return (
        <DashboardUI
            student={student}
            matchedPrograms={matchedPrograms}
            recommendedUniversities={recommendedUniversities}
            myMeetings={myMeetings}
            interestedUniIds={interestedUniIds}
            advisoryStatus={advisoryStatus}
        />
    )
}
