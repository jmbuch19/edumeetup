import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { updateAdvisoryNotes } from '@/app/actions/admin-advisory-actions'
import { SelectStatus } from './select-status'
import { ScheduleSession } from './schedule-session'
import { ArrowLeft, Mail, Calendar, MapPin, GraduationCap, DollarSign } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdvisoryDetailPage({ params }: { params: { id: string } }) {
    await requireRole('ADMIN')

    const [request, admins] = await Promise.all([
        prisma.advisoryRequest.findUnique({
            where: { id: params.id },
            include: { student: { include: { user: true } } }
        }),
        prisma.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' }
        })
    ])

    if (!request) notFound()

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/admin/advisory">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Request Details</h1>
                <Badge className="ml-auto" variant="outline">{request.status}</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Name</Label>
                                <p className="font-medium">{request.student.fullName}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Email</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a href={`mailto:${request.student.user.email}`} className="text-blue-600 hover:underline">
                                        {request.student.user.email}
                                    </a>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Target Country</Label>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.targetCountry}</span>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Target Degree</Label>
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.targetDegree} in {request.fieldOfInterest}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Readiness Assessment</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Budget Range</Label>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <span>{request.budgetRange}</span>
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">English Score</Label>
                                <p>{request.englishScore || 'Not provided'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">GRE Score</Label>
                                <p>{request.student.greScore || 'Not taken / Not provided'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">GMAT Score</Label>
                                <p>{request.student.gmatScore || 'Not taken / Not provided'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Student&apos;s Question</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-muted p-4 rounded-md italic text-muted-foreground">
                                &ldquo;{request.openQuestion || 'No specific question provided.'}&rdquo;
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Logistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Preferred Time</Label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span>{request.preferredTime}</span>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Target Intake</Label>
                                    <p>{request.targetIntake}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <SelectStatus requestId={request.id} currentStatus={request.status} />

                            <hr className="border-t" />

                            <div className="space-y-2">
                                <Label>Internal Notes</Label>
                                <form action={async (formData) => {
                                    'use server'
                                    const notes = formData.get('notes') as string
                                    await updateAdvisoryNotes(request.id, notes)
                                }}>
                                    <Textarea
                                        name="notes"
                                        defaultValue={request.internalNotes || ''}
                                        placeholder="Add notes for other advisers..."
                                        className="mb-2"
                                    />
                                    <Button type="submit" size="sm" variant="secondary" className="w-full">
                                        Save Notes
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>

                    <ScheduleSession
                        requestId={request.id}
                        advisers={admins}
                        currentAdviserId={request.adviserId}
                        currentSessionLink={request.sessionLink}
                    />
                </div>
            </div>
        </div>
    )
}
