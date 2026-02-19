import React from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProgram, updateUniversityProfile } from '@/app/actions'
import { InterestedStudentsTable } from '@/components/university/interested-students-table'
import ProgramList from './program-list'
import MeetingList from '@/components/university/MeetingList'
import { FairOutreachList } from '@/components/university/FairOutreachList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashboardStats } from "@/components/university/DashboardStats"
import { School, Download, BookOpen, Clock } from 'lucide-react'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { DegreeLevels } from '@/lib/constants'
import { UniversityLogo } from '@/components/university/university-logo'
import { NotificationsCenter } from '@/components/notifications-center'

export const dynamic = 'force-dynamic'

export default async function UniversityDashboard() {
    const user = await requireUser()
    const email = user.email

    const uni = await prisma.university.findFirst({
        where: { user: { email: email! } },
        include: {
            programs: {
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { interests: true }
                    }
                }
            },
            interests: {
                include: {
                    student: { include: { user: true } },
                    program: true
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!uni) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-red-50 p-6 rounded-full mb-4">
                <School className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">University Profile Not Found</h1>
            <p className="text-slate-500 mt-2 max-w-md">
                We couldn&apos;t find a profile associated with your account.
            </p>
        </div>
    )

    if (uni.verificationStatus === 'PENDING') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-lg w-full bg-white p-8 rounded-2xl border border-amber-100 shadow-xl shadow-amber-500/10">
                    <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-8 w-8 text-amber-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">Verification Pending</h1>
                    <p className="text-slate-600 leading-relaxed mb-6">
                        Your profile is currently under review by our team.
                    </p>
                    <Button variant="outline" disabled className="w-full">Check Status Again</Button>
                </div>
            </div>
        )
    }

    // 1. Matched Students
    const programFields = uni.programs.map(p => p.fieldCategory).filter(Boolean)
    const uniqueFields = Array.from(new Set(programFields))

    // Safety check for empty fields to avoid fetching everything
    const matchedStudents = uniqueFields.length > 0 ? await prisma.student.findMany({
        where: {
            fieldOfInterest: { in: uniqueFields },
            interests: {
                none: {
                    universityId: uni.id
                }
            }
        },
        include: { user: true }
    }) : []

    // 2. Availability Slots (Meeting System)
    const availabilitySlots = await prisma.availabilitySlot.findMany({
        where: {
            universityId: uni.id,
            isBooked: false,
            startTime: { gte: new Date() }
        },
        orderBy: { startTime: 'asc' }
    })

    // 3. Meetings
    const allMeetings = await prisma.meeting.findMany({
        where: { universityId: uni.id },
        include: { student: { include: { user: true } } },
        orderBy: { startTime: 'asc' }
    })

    const upcomingMeetings = allMeetings.filter(m => new Date(m.startTime) > new Date())

    // 4. Campus Fair Outreach
    const fairOutreach = await prisma.hostRequestOutreach.findMany({
        where: { universityId: uni.id },
        include: {
            hostRequest: true
        },
        orderBy: { sentAt: 'desc' }
    })

    // Stats
    const stats = {
        totalPrograms: uni.programs.length,
        totalInterests: uni.interests.length,
        totalMeetings: allMeetings.length,
        totalStudentsMatched: matchedStudents.length,
        acceptanceRate: uni.interests.length > 0
            ? Math.round((uni.interests.filter(i => i.status === 'ACCEPTED').length / uni.interests.length) * 100)
            : 0
    }

    const pendingInterestsCount = uni.interests.filter(i => i.status === 'PENDING').length
    const recentInterests = uni.interests.slice(0, 5)



    return (
        <div className="space-y-8 container max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <UniversityLogo
                        src={uni.logo}
                        alt={uni.institutionName}
                        size="lg"
                        isVerified={uni.verificationStatus === 'VERIFIED'}
                        className="shadow-sm border border-gray-100"
                    />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">University Dashboard</h1>
                        <p className="text-slate-500">{uni.institutionName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                    </Button>
                    <Link href="/university/settings">
                        <Button>Manage Profile</Button>
                    </Link>
                </div>
            </div>

            <div className="mb-8">
                <NotificationsCenter userRole="UNIVERSITY" />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <div className="w-full overflow-x-auto pb-2 -mb-2">
                    <TabsList className="w-full justify-start min-w-max">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="interests">Student Interests</TabsTrigger>
                        <TabsTrigger value="meetings">Meetings</TabsTrigger>
                        <TabsTrigger value="programs">Programs</TabsTrigger>
                        <TabsTrigger value="fairs" className="relative">
                            Campus Fairs
                            {fairOutreach.filter(o => o.status === 'SENT').length > 0 && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <DashboardStats
                        stats={stats}
                        meetingCount={upcomingMeetings.length}
                        pendingInterests={pendingInterestsCount}
                    />

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Student Interests</CardTitle>
                                <CardDescription>Latest students interested in your programs</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <InterestedStudentsTable
                                    interests={JSON.parse(JSON.stringify(recentInterests))}
                                    programs={JSON.parse(JSON.stringify(uni.programs))}
                                    availabilitySlots={JSON.parse(JSON.stringify(availabilitySlots))}
                                    compact
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Upcoming Meetings</CardTitle>
                                <CardDescription>Your schedule for the next 7 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MeetingList
                                    meetings={JSON.parse(JSON.stringify(upcomingMeetings))}
                                    compact
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-gray-400" />
                            Students Matching Your Programs <span className="text-sm font-normal text-gray-500">({matchedStudents.length})</span>
                        </h2>

                        {matchedStudents.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm italic">No new matches found at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {matchedStudents.slice(0, 6).map(student => (
                                    <div key={student.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-medium">Match</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Matches &quot;{student.fieldOfInterest}&quot;</p>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {student.country} • {student.preferredDegree}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="interests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Interest Management</CardTitle>
                            <CardDescription>View and manage all student expressions of interest</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InterestedStudentsTable
                                interests={JSON.parse(JSON.stringify(uni.interests))}
                                programs={JSON.parse(JSON.stringify(uni.programs))}
                                availabilitySlots={JSON.parse(JSON.stringify(availabilitySlots))}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="meetings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Scheduled Meetings</CardTitle>
                            <CardDescription>Manage your upcoming and past video consultations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MeetingList meetings={JSON.parse(JSON.stringify(allMeetings))} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="programs">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Program</h2>
                                <form action={async (formData) => {
                                    'use server'
                                    await createProgram(formData)
                                }} className="space-y-4">
                                    <input type="hidden" name="universityId" value={uni.id} />

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                                        <Input name="programName" required placeholder="MSc Computer Science" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                                            <select name="degreeLevel" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                                {DegreeLevels.map((level) => (
                                                    <option key={level.value} value={level.value}>
                                                        {level.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                                            <Input name="fieldCategory" required placeholder="Engineering" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee (USD)</label>
                                            <Input name="tuitionFee" type="number" required placeholder="50000" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Intakes</label>
                                            <Input name="intakes" required placeholder="Fall 2025, Spring 2026" />
                                        </div>
                                    </div>

                                    {/* Default Hidden Fields */}
                                    <input type="hidden" name="stemDesignated" value="false" />
                                    <input type="hidden" name="durationMonths" value="12" />
                                    <input type="hidden" name="currency" value="USD" />

                                    <Button type="submit" className="w-full">Create Program</Button>
                                </form>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">My Programs</h2>
                                <ProgramList programs={JSON.parse(JSON.stringify(uni.programs))} universityId={uni.id} />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="fairs">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Campus Fair Opportunities</h2>
                                <p className="text-slate-500">Invitations from Indian institutions to host fairs on their campus.</p>
                            </div>
                        </div>
                        <FairOutreachList requests={JSON.parse(JSON.stringify(fairOutreach))} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
