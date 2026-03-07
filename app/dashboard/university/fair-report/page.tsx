/**
 * University Fair Leads Index
 * Route: /dashboard/university/fair-report
 *
 * Lists ALL fairs the university has participated in.
 * Each card links to the detail report at /dashboard/university/fair-report/[fairEventId].
 * If a fair is LIVE, also shows an "Open Scanner" button.
 */

import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QrCode, FileText, MapPin, Calendar, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

function statusStyle(s: string) {
    if (s === 'LIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (s === 'COMPLETED') return 'bg-gray-100 text-gray-600 border-gray-300'
    if (s === 'CANCELLED') return 'bg-red-50 text-red-600 border-red-200'
    return 'bg-blue-50 text-blue-700 border-blue-200'
}

export default async function FairLeadsIndexPage() {
    const user = await requireUser()

    const uni = await prisma.university.findFirst({
        where: { user: { email: user.email! } },
        select: { id: true, institutionName: true },
    })
    if (!uni) redirect('/university/dashboard')

    // All fairs this university participated in, grouped by event
    const attendanceGroups = await prisma.fairAttendance.groupBy({
        by: ['fairEventId'],
        where: { universityId: uni.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
    })

    // Enrich with FairEvent details
    const fairs = (
        await Promise.all(
            attendanceGroups.map(async (group) => {
                const fair = await prisma.fairEvent.findUnique({
                    where: { id: group.fairEventId },
                })
                if (!fair) return null
                return { fair, leadCount: group._count.id }
            })
        )
    ).filter((f): f is { fair: NonNullable<typeof f>['fair']; leadCount: number } & { fair: NonNullable<Awaited<ReturnType<typeof prisma.fairEvent.findUnique>>> } => f !== null && f.fair !== null)

    return (
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Fair Leads</h1>
                <p className="text-gray-500 mt-1">All fair events your booth has participated in</p>
            </div>

            {/* Empty state */}
            {fairs.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                        <QrCode className="w-10 h-10 text-gray-300" />
                    </div>
                    <div>
                        <p className="text-lg font-semibold text-gray-700">No fair participation yet</p>
                        <p className="text-sm text-gray-400 mt-1 max-w-sm">
                            When a fair goes live, your scanner link will appear on your dashboard.
                            Scan students to start collecting leads.
                        </p>
                    </div>
                </div>
            )}

            {/* Fair cards */}
            {fairs.length > 0 && (
                <div className="space-y-4">
                    {fairs.map(({ fair, leadCount }) => (
                        <div
                            key={fair.id}
                            className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${fair.status === 'LIVE' ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-gray-100'
                                }`}
                        >
                            {fair.status === 'LIVE' && (
                                <div className="bg-emerald-500 px-4 py-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    <span className="text-white text-xs font-bold tracking-widest uppercase">
                                        Live Now — Scanner Active
                                    </span>
                                </div>
                            )}

                            <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base font-bold text-gray-900 truncate">{fair.name}</h2>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusStyle(fair.status)}`}>
                                            {fair.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                        {fair.city && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {[fair.city, fair.country].filter(Boolean).join(', ')}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(fair.startDate).toLocaleDateString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                            })}
                                        </span>
                                        <span className="flex items-center gap-1 font-semibold text-indigo-600">
                                            <Users className="w-3 h-3" />
                                            {leadCount} lead{leadCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 shrink-0 flex-wrap">
                                    {fair.status === 'LIVE' && (
                                        <Link
                                            href={`/event/${fair.slug}/scan`}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-4 py-2 transition-colors"
                                        >
                                            <QrCode className="w-4 h-4" /> Open Scanner
                                        </Link>
                                    )}
                                    <Link
                                        href={`/dashboard/university/fair-report/${fair.id}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-sm font-semibold px-4 py-2 transition-colors"
                                    >
                                        <FileText className="w-4 h-4" /> View Report
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
