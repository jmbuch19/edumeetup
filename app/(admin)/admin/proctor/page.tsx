import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Users, CalendarDays, Clock, ExternalLink } from 'lucide-react'
import { updateProctorRequestStatus } from './actions'
import type { ProctorRequestStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const STATUS_COLORS: Record<ProctorRequestStatus, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    UNDER_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200',
    CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
    COMPLETED: 'bg-slate-50 text-slate-600 border-slate-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

const NEXT_STATUS: Partial<Record<ProctorRequestStatus, ProctorRequestStatus>> = {
    PENDING: 'UNDER_REVIEW',
    UNDER_REVIEW: 'CONFIRMED',
    CONFIRMED: 'COMPLETED',
}

export default async function AdminProctorPage() {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/admin/dashboard')

    const requests = await prisma.proctorRequest.findMany({
        include: {
            university: {
                include: { user: { select: { email: true, name: true } } },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    const pending = requests.filter(r => r.status === 'PENDING').length
    const active = requests.filter(r => ['UNDER_REVIEW', 'CONFIRMED'].includes(r.status)).length

    const fmt = (d: Date) => new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    })

    return (
        <div className="container max-w-5xl mx-auto px-4 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Proctor Requests</h1>
                        <p className="text-sm text-slate-500">Manage university exam proctoring requests</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {pending > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
                            <div className="text-xl font-bold text-amber-700">{pending}</div>
                            <div className="text-xs text-amber-600">Pending</div>
                        </div>
                    )}
                    {active > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
                            <div className="text-xl font-bold text-blue-700">{active}</div>
                            <div className="text-xs text-blue-600">Active</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Request list */}
            {requests.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No proctor requests yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map(req => {
                        const nextStatus = NEXT_STATUS[req.status]
                        return (
                            <Card key={req.id} className={req.status === 'PENDING' ? 'border-amber-200' : ''}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <CardTitle className="text-base">{req.subjects}</CardTitle>
                                            <p className="text-sm text-slate-500 mt-0.5">
                                                <strong>{req.university.institutionName}</strong> ·{' '}
                                                {req.examType} · {fmt(req.examStartDate)} – {fmt(req.examEndDate)}
                                            </p>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[req.status]}`}>
                                            {req.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">

                                    {/* Stats */}
                                    <div className="grid grid-cols-4 gap-3 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            <span><strong>{req.studentCount}</strong> students</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span>{req.durationMinutes} min</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <CalendarDays className="h-4 w-4 text-slate-400" />
                                            <span>Submitted {fmt(req.createdAt)}</span>
                                        </div>
                                        {req.policyUrl && (
                                            <a href={req.policyUrl} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-primary hover:underline">
                                                <ExternalLink className="h-4 w-4" />
                                                <span>Policy</span>
                                            </a>
                                        )}
                                    </div>

                                    {/* University contact */}
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm">
                                        <span className="font-medium text-slate-700">Contact: </span>
                                        <span className="text-slate-600">{req.university.user.name || 'Not set'}</span>
                                        <span className="text-slate-400 mx-2">·</span>
                                        <a href={`mailto:${req.university.user.email}`} className="text-primary hover:underline">
                                            {req.university.user.email}
                                        </a>
                                    </div>

                                    {/* Requirements */}
                                    {req.requirements && (
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-sm text-amber-800">
                                            <span className="font-medium">Requirements: </span>{req.requirements}
                                        </div>
                                    )}

                                    {/* Admin action form */}
                                    {!['COMPLETED', 'CANCELLED'].includes(req.status) && (
                                        <form action={updateProctorRequestStatus}
                                            className="pt-2 border-t border-slate-100 space-y-3">
                                            <input type="hidden" name="requestId" value={req.id} />
                                            <input type="hidden" name="universityId" value={req.universityId} />
                                            <input type="hidden" name="universityEmail" value={req.university.user.email} />
                                            <input type="hidden" name="universityName" value={req.university.institutionName} />
                                            <input type="hidden" name="subjects" value={req.subjects} />
                                            <input type="hidden" name="examStartDate" value={req.examStartDate.toISOString()} />

                                            <div className="flex gap-3 items-start">
                                                <textarea
                                                    name="adminNotes"
                                                    defaultValue={req.adminNotes || ''}
                                                    placeholder="Add a note for the university (shown when Confirmed)..."
                                                    rows={2}
                                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    {nextStatus && (
                                                        <button type="submit" name="newStatus" value={nextStatus}
                                                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                                                            style={{ background: '#3333CC' }}>
                                                            Mark as {nextStatus.replace('_', ' ').toLowerCase()}
                                                        </button>
                                                    )}
                                                    <button type="submit" name="newStatus" value="CANCELLED"
                                                        className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                                                        Cancel request
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    )}

                                    {/* Admin notes on confirmed/completed */}
                                    {req.adminNotes && ['COMPLETED', 'CONFIRMED'].includes(req.status) && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
                                            <span className="font-medium text-green-800">Your note: </span>
                                            <span className="text-green-700">{req.adminNotes}</span>
                                        </div>
                                    )}

                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
