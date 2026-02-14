import React from 'react'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createProgram } from '@/app/actions'
import ProgramList from './program-list'

import { User, MapPin, DollarSign, Calendar, BookOpen, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UniversityDashboard() {
    // Mock session for now - assuming verified university (ID from seed) if not logged in
    // For MVP demo, lets pick the Harvard one from Seed
    // Mock session: Try to find Harvard, otherwise get the first available one
    let uni = await prisma.universityProfile.findFirst({
        where: { institutionName: 'Harvard University' },
        include: {
            programs: true,
            interests: {
                include: { student: { include: { user: true } } }
            }
        }
    })

    if (!uni) {
        uni = await prisma.universityProfile.findFirst({
            include: {
                programs: true,
                interests: {
                    include: { student: { include: { user: true } } }
                }
            }
        })
    }

    // If no mock uni, show empty state or handle gracefully
    if (!uni) return <div>University not found (Seed data missing?)</div>

    if (uni.verificationStatus === 'PENDING') {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <div className="max-w-md mx-auto bg-yellow-50 p-8 rounded-xl border border-yellow-200">
                    <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Pending</h1>
                    <p className="text-gray-600">
                        Your profile is currently under review by our team. You will be notified via email once approved.
                    </p>
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

    const matchedStudents = await prisma.studentProfile.findMany({
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
        take: 10,
        include: { user: true }
    })

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">University Dashboard</h1>
                    <p className="text-gray-600">{uni.institutionName}</p>
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Verified</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Programs & Create */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">My Programs ({uni.programs.length})</h2>
                        </div>
                        <ProgramList programs={uni.programs} />
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Program</h2>
                        <form action={createProgram} className="space-y-4">
                            <input type="hidden" name="universityId" value={uni.id} />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                                <Input name="programName" required placeholder="MSc Computer Science" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Degree Level</label>
                                    <select name="degreeLevel" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm">
                                        <option value="Bachelor's">Bachelor's</option>
                                        <option value="Master's">Master's</option>
                                        <option value="MBA">MBA</option>
                                        <option value="PhD">PhD</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                                    <Input name="fieldOfStudy" required placeholder="Engineering" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tuition Fee (USD)</label>
                                    <Input name="tuitionFee" type="number" required placeholder="50000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Intake Date</label>
                                    <Input name="intakeDate" required placeholder="Fall 2025" />
                                </div>
                            </div>

                            {/* Hidden fields for required schema but not yet in minimal UI */}
                            <input type="hidden" name="stemDesignated" value="false" />
                            <input type="hidden" name="durationMonths" value="12" />
                            <input type="hidden" name="currency" value="USD" />


                            <Button type="submit" className="w-full">Create Program</Button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Students (Interested & Matched) */}
                <div className="space-y-6">
                    {/* Interested Students (Full Access) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            Interested Students <span className="text-sm font-normal text-gray-500">({uni.interests.length})</span>
                        </h2>
                        {uni.interests.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No inquiries yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {uni.interests.map(interest => (
                                    <div key={interest.id} className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{interest.student.fullName}</h3>
                                                <p className="text-xs text-blue-600 font-medium">Expressed Interest</p>
                                            </div>
                                            <span className="text-xs text-gray-500">{new Date(interest.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-sm text-gray-600 mb-3">
                                            <div><span className="font-medium text-gray-700">Country:</span> {interest.student.country}</div>
                                            <div><span className="font-medium text-gray-700">Budget:</span> {interest.student.budgetRange}</div>
                                            <div><span className="font-medium text-gray-700">Degree:</span> {interest.student.preferredDegree}</div>
                                            <div><span className="font-medium text-gray-700">Score:</span> {interest.student.englishScore}</div>
                                        </div>
                                        <div className="pt-2 border-t border-blue-200 mt-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                                                <span className="font-medium">Email:</span> {interest.student.user.email}
                                            </div>
                                            <a href={`mailto:${interest.student.user.email}?subject=Response from ${uni.institutionName}`} className="block">
                                                <Button size="sm" className="w-full">Contact Student</Button>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Matched Students (Masked) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-gray-400" />
                            Students Matching Your Programs <span className="text-sm font-normal text-gray-500">({matchedStudents.length})</span>
                        </h2>

                        {matchedStudents.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No new matches found.</p>
                        ) : (
                            <div className="space-y-4">
                                {matchedStudents.map(student => (
                                    <div key={student.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100 relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 blur-[2px] select-none">Hidden Name</h3>
                                                <p className="text-xs text-gray-500">Matches "{student.fieldOfInterest}"</p>
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
