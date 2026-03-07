import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, GraduationCap, MapPin, Star, BookOpen, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function FairRegisteredStudentsPage(
    props: {
        params: Promise<{ fairEventId: string }>
    }
) {
    const params = await props.params;
    const user = await requireUser()
    if (user.role !== 'UNIVERSITY' && user.role !== 'UNIVERSITY_REP') redirect('/')

    const university = await prisma.university.findUnique({
        where: { userId: user.id },
        include: { programs: { select: { id: true, programName: true, degreeLevel: true } } },
    })
    if (!university) redirect('/university/dashboard')

    const fair = await prisma.fairEvent.findUnique({
        where: { id: params.fairEventId },
    })
    if (!fair) redirect('/university/dashboard')

    // Check university is confirmed for this fair
    const invitation = await prisma.fairInvitation.findUnique({
        where: {
            fairEventId_universityId: {
                fairEventId: params.fairEventId,
                universityId: university.id,
            },
        },
    })
    if (!invitation || invitation.status !== 'CONFIRMED') redirect('/university/dashboard')

    // Fetch registered students — match on fieldOfInterest if programs confirmed.
    // OR filter: catch students who filled the pass form with a matching field,
    // AND students whose linked Student profile has a matching fieldOfInterest.
    const programNames = (invitation.programsShowcasing ?? []) as string[]
    const registeredStudents = await prisma.fairStudentPass.findMany({
        where: {
            fairEventId: params.fairEventId,
            ...(programNames.length > 0
                ? {
                    OR: [
                        { fieldOfInterest: { in: programNames } },
                        { student: { fieldOfInterest: { in: programNames } } },
                    ],
                }
                : {}),
        },
        include: { student: true },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Back nav */}
            <Link
                href="/university/dashboard"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
            </Link>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Registered Students</h1>
                <p className="text-gray-500 text-sm mt-1">
                    {fair.name}
                    {fair.city ? ` · ${fair.city}` : ''}
                    {' · '}
                    {new Date(fair.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                    })}
                </p>
            </div>

            {/* Stats bar */}
            <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-teal-600" />
                    <span className="font-semibold text-gray-900">{registeredStudents.length}</span>
                    <span className="text-gray-500">
                        {programNames.length > 0 ? 'matched students' : 'total registrations'}
                    </span>
                </div>
                {programNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {programNames.map(p => (
                            <Badge key={p} variant="secondary" className="text-xs">
                                {p}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Student cards */}
            {registeredStudents.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium text-gray-600">No matched students yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {programNames.length > 0
                                ? 'Students selecting programs you promote will appear here as they register.'
                                : 'Students will appear here once they generate a fair pass.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {registeredStudents.map(pass => (
                        <Card key={pass.id} className="hover:shadow-sm transition-shadow flex flex-col">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <CardTitle className="text-base leading-tight truncate">
                                            {pass.fullName}
                                        </CardTitle>
                                        {pass.fieldOfInterest && (
                                            <Badge className="mt-1 text-xs bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100">
                                                {pass.fieldOfInterest}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-1.5 text-sm text-gray-500 pb-3">
                                {/* City */}
                                {(pass.student?.city) && (
                                    <div className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                        <span>{pass.student.city}</span>
                                    </div>
                                )}

                                {/* Current institution + course */}
                                {pass.currentInstitution && (
                                    <div className="flex items-center gap-1.5">
                                        <GraduationCap className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                        <span className="truncate">
                                            {pass.currentInstitution}
                                            {pass.currentCourse ? ` · ${pass.currentCourse}` : ''}
                                        </span>
                                    </div>
                                )}

                                {/* Semester */}
                                {pass.currentSemester && (
                                    <div className="flex items-center gap-1.5">
                                        <Star className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                        <span>{pass.currentSemester}</span>
                                    </div>
                                )}

                                {/* English exam */}
                                {pass.englishExam && pass.englishExam !== 'Not attempted' && (
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                        <span>{pass.englishExam}</span>
                                    </div>
                                )}
                            </CardContent>

                            {/* View Full Profile — only for linked app students */}
                            {pass.studentId && (
                                <div className="px-6 pb-4">
                                    <Link
                                        href={`/university/students/${pass.studentId}`}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline underline-offset-2"
                                    >
                                        View Full Profile
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
