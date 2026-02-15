import { prisma } from '@/lib/prisma'
import { FieldCategory } from '@prisma/client'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { GraduationCap, MapPin, Search, Calendar } from 'lucide-react'
import { expressInterest } from '@/app/actions'
import { StudentMeetingsTable } from '@/components/student/student-meetings-table'

// Dashboard is server component
// Dashboard is server component
import { requireUser } from '@/lib/auth'

// ... existing imports

export const dynamic = 'force-dynamic'

export default async function StudentDashboard() {
    const user = await requireUser()
    const email = user.email

    const student = await prisma.studentProfile.findFirst({
        where: { user: { email } },
        include: { user: true }
    })

    if (!student) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold">Please Register First</h2>
                    <Link href="/student/register"><Button className="mt-4">Register</Button></Link>
                </div>
            </div>
        )
    }

    // 2. Matching Logic
    // Match on: Field of Interest AND Degree Level
    const interest = student.fieldOfInterest as FieldCategory | null
    // Check if interest is valid enum value (simple check or assuming valid from registration)
    // Actually, registration saves string. If it matches Enum key, we use it. 
    // If not, we skip field filtering or show no matches.
    const fieldFilter = interest && Object.values(FieldCategory).includes(interest)
        ? { equals: interest }
        : undefined

    const matchedPrograms = await prisma.program.findMany({
        where: {
            AND: [
                {
                    fieldCategory: fieldFilter
                },
                {
                    degreeLevel: {
                        equals: student.preferredDegree || '',
                    }
                },
                {
                    status: 'ACTIVE'
                },
                {
                    university: {
                        verificationStatus: 'VERIFIED'
                    }
                }
            ]
        },
        include: {
            university: true
        },
        take: 10
    })

    // Fallback: Recommended Universities (if no matches or just to show more)
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

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
                    <p className="text-gray-600">Welcome, {student.fullName}!</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/student/profile">
                        <Button variant="outline">Edit Profile</Button>
                    </Link>
                    <Link href="/universities">
                        <Button className="gap-2">
                            <Search className="h-4 w-4" />
                            Browse All
                        </Button>
                    </Link>
                </div>
            </div>

            {/* My Meetings Section */}
            {myMeetings.length > 0 && (
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-primary" />
                        My Meetings
                    </h2>
                    <StudentMeetingsTable meetings={myMeetings} />
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Matches Found</h3>
                    <p className="text-2xl font-bold text-primary">{matchedPrograms.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Your Interest</h3>
                    <p className="text-sm font-medium text-gray-900">{student.fieldOfInterest}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Target Degree</h3>
                    <p className="text-sm font-medium text-gray-900">{student.preferredDegree}</p>
                </div>
            </div>

            {/* Matched Programs Section */}
            <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    Programs Matching Your Profile
                </h2>

                {matchedPrograms.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                        <p className="text-gray-500">No matches yet — Update preferences to see recommended programs.</p>
                        <p className="text-sm text-gray-400 mt-2">Try changing your Field of Interest or Degree Level in your profile.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matchedPrograms.map((program) => {
                            const isInterested = interestedUniIds.has(program.universityId)
                            return (
                                <div key={program.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-primary/50 transition-colors">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{program.programName}</h3>
                                                <p className="text-sm text-gray-600">{program.university.institutionName}</p>
                                            </div>
                                            <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                                Match
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-6">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Tuition</span>
                                                <span className="font-medium">{program.currency} {program.tuitionFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Duration</span>
                                                <span className="font-medium">{program.durationMonths} Months</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Location</span>
                                                <span className="font-medium">{program.university.city}, {program.university.country}</span>
                                            </div>
                                        </div>

                                        {/* Express Interest Button */}
                                        {isInterested ? (
                                            <div className="flex gap-2">
                                                <Link href={`/universities/${program.university.id}`} className="flex-1">
                                                    <Button variant="outline" className="w-full">View Details</Button>
                                                </Link>
                                                <Button disabled className="flex-1 bg-green-600 text-white hover:bg-green-700">Interest Sent</Button>
                                            </div>
                                        ) : (
                                            <form action={async () => {
                                                'use server'
                                                await expressInterest(program.university.id, student.user.email, program.id)
                                            }}>
                                                <div className="flex gap-2">
                                                    <Link href={`/universities/${program.university.id}`} className="flex-1">
                                                        <Button variant="outline" type="button" className="w-full">View Details</Button>
                                                    </Link>
                                                    <Button type="submit" className="flex-1">Express Interest</Button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Other Recommended Universities</h2>
            {/* Same as before... */}
            {recommendedUniversities.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500">No universities found yet. Check back later!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedUniversities.map((uni) => (
                        <div key={uni.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100">
                                {uni.logo ? (
                                    <img src={uni.logo} alt={uni.institutionName} className="max-h-20 max-w-[80%]" />
                                ) : (
                                    <GraduationCap className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{uni.institutionName}</h3>
                                <div className="flex items-center text-gray-500 mb-4 text-sm">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {uni.city}, {uni.country}
                                </div>
                                <div className="space-y-2 mb-6">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">{uni.programs.length}</span> Programs Available
                                    </div>
                                </div>
                                <Link href={`/universities/${uni.id}`}>
                                    <Button variant="outline" className="w-full">View Details</Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
