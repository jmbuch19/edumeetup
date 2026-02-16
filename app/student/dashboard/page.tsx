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
            <div className="container mx-auto px-4 py-8 text-center bg-white rounded-lg shadow mt-10">
                <h2 className="text-2xl font-bold mb-4">Profile Incomplete</h2>
                <p>Please complete your profile registration to access the dashboard.</p>
                {/* Link to register would go here */}
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
