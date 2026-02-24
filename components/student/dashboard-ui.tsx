'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, MapPin, Search, Calendar, CheckCircle, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StudentMeetingsTable } from '@/components/student/student-meetings-table'
import { AdvisoryBanner } from '@/components/student/advisory-banner'
import { AdvisoryForm } from '@/components/student/advisory-form'
import { expressInterest } from '@/app/actions'
import { NotificationsCenter } from '@/components/notifications-center'

// Types
// Types
// Types
type Program = any
type University = any
type MeetingParticipant = any
type Meeting = any
type AdvisoryRequest = any

// Extended types for relations
type ExtendedProgram = Program & { university: University }
type ExtendedUniversity = University & { programs: Program[] }
type ExtendedMeeting = MeetingParticipant & { meeting: Meeting & { university: University } }

interface DashboardUIProps {
    student: { fullName: string; fieldOfInterest: string | null; preferredDegree: string | null; user: { email: string } }
    matchedPrograms: any[] // Serialized ExtendedProgram
    recommendedUniversities: any[] // Serialized ExtendedUniversity
    myMeetings: any[] // Serialized ExtendedMeeting
    interestedUniIds: string[] // Changed from Set to Array for serialization
    advisoryStatus: any // Serialized AdvisoryRequest
    hasCv: boolean
}

export function DashboardUI({
    student,
    matchedPrograms,
    recommendedUniversities,
    myMeetings,
    interestedUniIds, // Now an Array
    advisoryStatus,
    hasCv
}: DashboardUIProps) {
    // Re-create Set for internal use if needed, or just use includes
    const interestedSet = new Set(interestedUniIds)
    const [activeTab, setActiveTab] = useState('overview')

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
                    <p className="text-gray-600">Welcome, {student.fullName}!</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Link href="/student/profile">
                        <Button variant="outline">Edit Profile</Button>
                    </Link>
                    <Link href="/universities">
                        <Button className="gap-2">
                            <Search className="h-4 w-4" />
                            Browse All
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            <div className="mb-8">
                <NotificationsCenter userRole="STUDENT" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
                <TabsList className="bg-gray-100 p-1 h-auto flex-wrap justify-start">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="advisory" className="relative">
                        Guided Pathway
                        {advisoryStatus && advisoryStatus.status === 'NEW' && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white"></span>
                        )}
                        {advisoryStatus && advisoryStatus.status === 'COMPLETED' && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-12">
                    {/* Advisory Banner (Only if not already requested/completed, or maybe always?) */}
                    {/* User requested non-intrusive banner */}
                    {!advisoryStatus && (
                        <AdvisoryBanner onOpen={() => setActiveTab('advisory')} />
                    )}

                    {/* CV Upload Nudge — shown only when no CV uploaded yet */}
                    {!hasCv && (
                        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📄</span>
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">Upload your CV to stand out</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Universities and advisors can review your profile faster with a CV attached.</p>
                                </div>
                            </div>
                            <Link href="/student/profile" className="shrink-0">
                                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 whitespace-nowrap">Upload CV →</Button>
                            </Link>
                        </div>
                    )}

                    {/* My Meetings Section */}
                    {myMeetings.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Calendar className="h-6 w-6 text-primary" />
                                My Meetings
                            </h2>
                            <StudentMeetingsTable meetings={myMeetings} />
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                    {/* Matched Programs */}
                    <div>
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
                                {matchedPrograms.map((program: any) => {
                                    const isInterested = interestedSet.has(program.universityId)
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
                                                        await expressInterest(program.university.id, student.user.email, program.id)
                                                    }}>
                                                        <div className="flex flex-col sm:flex-row gap-2">
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

                    {/* Recommended Unis */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Other Recommended Universities</h2>
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
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={uni.logo} alt={uni.institutionName} className="max-h-20 max-w-[80%]" />
                                                </>
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
                </TabsContent>

                <TabsContent value="advisory">
                    {advisoryStatus ? (
                        <div className="max-w-3xl mx-auto py-12">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Guided Pathway Session Requested</h2>
                                <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                                    Your request has been received. Our certified IAES advisers are reviewing your profile and will contact you via email at <strong>{student.user.email}</strong> to schedule your session.
                                </p>

                                <div className="bg-gray-50 p-6 rounded-xl text-left max-w-lg mx-auto mb-8">
                                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                                        <span className="text-sm text-gray-500">Status</span>
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                                            {advisoryStatus.status}
                                        </span>
                                    </div>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Request Date</span>
                                            <span className="font-medium">{new Date(advisoryStatus.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Target Country</span>
                                            <span className="font-medium">{advisoryStatus.targetCountry}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Preferred Time</span>
                                            <span className="font-medium">{advisoryStatus.preferredTime}</span>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500">
                                    Need to make changes? Contact us at <a href="mailto:support@iaesgujarat.org" className="text-blue-600 hover:underline">support@iaesgujarat.org</a>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto py-8">
                            <AdvisoryForm onClose={() => setActiveTab('overview')} />
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
