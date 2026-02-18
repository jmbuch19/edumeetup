import React from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProgram, updateUniversityProfile } from '@/app/actions'
import { InterestedStudentsTable } from '@/components/university/interested-students-table'
import ProgramList from './program-list'

import { BookOpen, Clock, School } from 'lucide-react'

import { requireUser } from '@/lib/auth'

// ... existing imports

export const dynamic = 'force-dynamic'

export default async function UniversityDashboard() {
    const user = await requireUser()
    const email = user.email

    const uni = await prisma.university.findFirst({
        where: { user: { email: email! } }, // Assert email is not null/undefined as requireUser usually ensures it
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

    // If no mock uni, show empty state or handle gracefully
    if (!uni) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-red-50 p-6 rounded-full mb-4">
                <School className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">University Profile Not Found</h1>
            <p className="text-slate-500 mt-2 max-w-md">
                We couldn&apos;t find a profile associated with your account. Please contact support if you believe this is an error.
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
                        Your profile is currently under review by our team. We verify all institutions to ensure the quality of our platform. You will be notified via email once approved.
                    </p>
                    <Button variant="outline" disabled className="w-full">Check Status Again</Button>
                </div>
            </div>
        )
    }

    // 3. Find Matched Students (Matching Engine for University)
    // Criteria: Student's fieldOfInterest matches any of University's Program fieldCategory
    // AND Student is not already in the interests list (to avoid duplicates, or show them differently)

    // Get all program fields
    const programFields = uni.programs.map(p => p.fieldCategory).filter(Boolean)
    const uniqueFields = Array.from(new Set(programFields))

    const matchedStudents = await prisma.student.findMany({
        where: {
            fieldOfInterest: { in: uniqueFields },
            // Exclude if already interested? Maybe, or just mark them. 
            // For MVP simpler to just show them in a separate list or filtered. 
            // Let's exclude those who have already expressed interest to keep lists clean.
            interests: {
                none: {
                    universityId: uni.id
                }
            }
        },
        include: { user: true }
    })

    // 4. Fetch Availability Slots for Scheduling
    const availabilitySlots = await prisma.availabilitySlot.findMany({
        where: {
            universityId: uni.id,
            isBooked: false,
            startTime: { gte: new Date() }
        },
        orderBy: { startTime: 'asc' }
    })

    return (
        <div className="container max-w-7xl mx-auto px-4 py-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">University Dashboard</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <School className="h-4 w-4 text-slate-400" />
                        <p className="text-slate-600 font-medium">{uni.institutionName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-semibold border border-emerald-100">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Verified Institution
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Programs & Create */}
                <div className="space-y-6">
                    {/* Settings: Meeting Link */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Settings</h2>
                        <form action={async (formData) => {
                            'use server'
                            await updateUniversityProfile(formData)
                        }} className="space-y-4">
                            <input type="hidden" name="universityId" value={uni.id} />
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Booking Link</label>
                                <p className="text-xs text-gray-500 mb-2">Paste your Calendly, Google Appointment, or Zoom link here. Students will use this to book meetings with you.</p>
                                <div className="flex gap-2">
                                    <Input
                                        name="meetingLink"
                                        defaultValue={uni.meetingLink || ''}
                                        placeholder="https://calendly.com/your-university/30min"
                                    />
                                    <Button type="submit" variant="outline">Save</Button>
                                </div>
                            </div>
                        </form>
                    </div>

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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                                    <select name="degreeLevel" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                        <option value="Bachelor's">Bachelor&apos;s</option>
                                        <option value="Master's">Master&apos;s</option>
                                        <option value="MBA">MBA</option>
                                        <option value="PhD">PhD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                                    <Input name="fieldCategory" required placeholder="Engineering" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee (USD)</label>
                                    <Input name="tuitionFee" type="number" required placeholder="50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Intakes</label>
                                    <Input name="intakes" required placeholder="Fall 2025, Spring 2026" />
                                </div>
                            </div>

                            {/* Hidden fields for required schema but not yet in minimal UI */}
                            <input type="hidden" name="stemDesignated" value="false" />
                            <input type="hidden" name="durationMonths" value="12" />
                            <input type="hidden" name="currency" value="USD" />


                            <Button type="submit" className="w-full">Create Program</Button>
                        </form>
                    </div>

                    {/* Program List */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">My Programs</h2>
                        <ProgramList programs={JSON.parse(JSON.stringify(uni.programs))} />
                    </div>
                </div>

                {/* Right Column: Students (Interested & Matched) */}
                <div className="space-y-6">
                    {/* Interested Students (Full Access) */}
                    {/* SERIALIZATION FIX: Convert Dates to Strings for Client Component */}
                    <InterestedStudentsTable
                        interests={JSON.parse(JSON.stringify(uni.interests))}
                        availabilitySlots={JSON.parse(JSON.stringify(availabilitySlots))}
                    />

                    {/* Matched Students (Masked) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-gray-400" />
                            Students Matching Your Programs <span className="text-sm font-normal text-gray-500">({matchedStudents.length})</span>
                        </h2>

                        {matchedStudents.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm italic">No new matches found at this time.</p>
                                <p className="text-xs text-gray-400 mt-1">Students matching your criteria will appear here automatically.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {matchedStudents.map(student => (
                                    <div key={student.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 blur-[2px] select-none">Hidden Name</h3>
                                                <p className="text-xs text-gray-500">Matches &quot;{student.fieldOfInterest}&quot;</p>
                                            </div>
                                            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">Match</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm text-gray-600 mb-3">
                                            <div><span className="font-medium text-gray-700">Country:</span> {student.country}</div>
                                            <div><span className="font-medium text-gray-700">Budget:</span> {student.budgetRange}</div>
                                            <div><span className="font-medium text-gray-700">Degree:</span> {student.preferredDegree}</div>
                                            <div><span className="font-medium text-gray-700">Intake:</span> {student.preferredIntake}</div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-200 mt-2">
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 italic">
                                                    <span className="inline-block w-2 bg-gray-400 h-2 rounded-full mr-1"></span>
                                                    Contact info hidden
                                                </div>
                                                <Button size="sm" variant="ghost" disabled className="text-xs">
                                                    Waiting for Student Interest
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-400 mt-4 text-center">
                            Full details become available when a student expresses interest in your university.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
