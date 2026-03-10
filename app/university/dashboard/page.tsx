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
import { School, Download, BookOpen, Clock, QrCode, Zap, FileText, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { DegreeLevels } from '@/lib/constants'
import { UniversityLogo } from '@/components/university/university-logo'
import { NotificationsCenter } from '@/components/notifications-center'
import { UniDocManager } from '@/components/university/uni-doc-manager'
import { ProctorTab } from '@/components/university/proctor-tab'
import { OutreachTab } from '@/components/university/outreach-tab'
import { getNudgeableStudents } from '@/app/university/actions/outreach'
import { maskName } from '@/lib/outreach-utils'
import { ActionCentre } from '@/components/university/action-centre'
import { FairReportCard } from '@/components/university/fair-report-card'
import { CampusFairInviteCard } from '@/components/university/CampusFairInviteCard'
import { GroupSessionsTab } from '@/components/university/GroupSessionsTab'

export const dynamic = 'force-dynamic'

// ── Profile completeness helper (module-level, 0 extra DB queries) ─────────
function calculateCompleteness(uni: {
    logo: string | null
    about: string | null
    website: string | null
    repName: string | null
    repEmail: string | null
    contactPhone: string | null
    scholarshipsAvailable: boolean
    foundedYear: number | null
    programs: { description: string | null; programName: string }[]
}) {
    const tasks = [
        {
            id: 'logo', label: 'Upload your university logo', done: !!uni.logo,
            actionUrl: '/university/settings', actionLabel: 'Add logo',
        },
        {
            id: 'about', label: 'Write an About section (50+ chars)',
            done: !!uni.about && uni.about.length > 50,
            actionUrl: '/university/settings', actionLabel: 'Write bio',
        },
        {
            id: 'website', label: 'Add your university website', done: !!uni.website,
            actionUrl: '/university/settings', actionLabel: 'Add link',
        },
        {
            id: 'rep', label: 'Add representative name & email',
            done: !!uni.repName && !!uni.repEmail,
            actionUrl: '/university/settings', actionLabel: 'Add contact',
        },
        {
            id: 'phone', label: 'Add a contact phone number', done: !!uni.contactPhone,
            actionUrl: '/university/settings', actionLabel: 'Add phone',
        },
        {
            id: 'programs', label: 'Add descriptions to all programmes',
            done: uni.programs.length > 0 && uni.programs.every(p => (p.description?.length ?? 0) > 30),
            actionUrl: '/university/dashboard?tab=programs', actionLabel: 'Edit programmes',
        },
        {
            id: 'scholarships', label: 'Confirm scholarship availability',
            done: uni.scholarshipsAvailable,
            actionUrl: '/university/settings', actionLabel: 'Update',
        },
        {
            id: 'founded', label: 'Add founding year', done: !!uni.foundedYear,
            actionUrl: '/university/settings', actionLabel: 'Add year',
        },
    ]
    const score = Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)
    return { score, tasks }
}

export default async function UniversityDashboard() {
    const user = await requireUser()
    const email = user.email

    // ── Wave 1: Load the uni record (everything else depends on uni.id) ─────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let uni: any = null


    try {
        uni = await prisma.university.findFirst({
            where: { user: { email: email! } },
            include: {
                programs: {
                    orderBy: { createdAt: 'desc' },
                    include: { _count: { select: { interests: true } } }
                },
                interests: {
                    include: { student: { include: { user: true } }, program: true },
                    orderBy: { createdAt: 'desc' },
                    take: 200,
                },
                documents: {
                    where: { deletedAt: null },
                    orderBy: { uploadedAt: 'desc' },
                    select: { id: true, displayName: true, category: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true }
                }
            },
        }) as typeof uni
    } catch {
        // DB unreachable — show friendly error
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
                    <span className="text-4xl block mb-4">⏳</span>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Just a moment…</h2>
                    <p className="text-slate-500 text-sm">We&apos;re having trouble loading your dashboard. Please refresh in a few seconds.</p>
                </div>
            </div>
        )
    }

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

    // ── Wave 2: All independent queries fire simultaneously ──────────────────
    const programFields = uni.programs.map((p: any) => p.fieldCategory).filter(Boolean)
    const uniqueFields = Array.from(new Set(programFields)) as string[]
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
        matchedStudentsResult,
        availabilitySlotsResult,
        meetingsResult,
        fairOutreachResult,
        proctorRequestsResult,
        nudgeableResult,
        outreachHistoryResult,
        weekStatsResult,
        actionCentreResult,
        fairModeResult,
        fairInvitationsResult,
    ] = await Promise.allSettled([
        // 1. Matched students
        uniqueFields.length > 0
            ? prisma.student.findMany({
                where: {
                    fieldOfInterest: { in: uniqueFields },
                    interests: { none: { universityId: uni.id } }
                },
                include: { user: true },
                take: 20,
            })
            : Promise.resolve([]),

        // 2. Availability slots
        prisma.availabilitySlot.findMany({
            where: { universityId: uni.id, isBooked: false, startTime: { gte: new Date() } },
            orderBy: { startTime: 'asc' }
        }),

        // 3. All meetings + upcoming meetings
        Promise.all([
            prisma.meeting.findMany({
                where: { universityId: uni.id },
                include: { student: { include: { user: true } } },
                orderBy: { startTime: 'asc' },
            }),
            prisma.meeting.findMany({
                where: { universityId: uni.id, startTime: { gte: new Date() } },
                include: { student: { include: { user: true } } },
                orderBy: { startTime: 'asc' },
            }),
        ]),

        // 4. Fair outreach
        prisma.hostRequestOutreach.findMany({
            where: { universityId: uni.id },
            include: { hostRequest: true },
            orderBy: { sentAt: 'desc' }
        }),

        // 5. Proctor requests
        prisma.proctorRequest.findMany({
            where: { universityId: uni.id },
            orderBy: { createdAt: 'desc' },
        }),

        // 6. Nudgeable students
        getNudgeableStudents(uni.id),

        // 7. Outreach history
        prisma.proactiveMessage.findMany({
            where: { universityId: uni.id },
            orderBy: { sentAt: 'desc' },
            take: 50,
            include: { student: { include: { user: { select: { name: true } } } } }
        }),

        // 8. Weekly stats
        Promise.all([
            prisma.proactiveMessage.count({ where: { universityId: uni.id, sentAt: { gte: oneWeekAgo } } }),
            prisma.proactiveMessage.count({ where: { universityId: uni.id, repliedAt: { gte: oneWeekAgo } } }),
        ]),

        // 9. Action centre (dismissed + recent messages + discoverable students)
        Promise.all([
            prisma.studentDiscoveryDismissal.findMany({ where: { universityId: uni.id }, select: { studentId: true } }),
            prisma.proactiveMessage.findMany({
                where: {
                    universityId: uni.id,
                    sentAt: { gte: new Date(Date.now() - (uni.proactiveCooldownDays ?? 21) * 24 * 60 * 60 * 1000) },
                },
                select: { studentId: true },
            }),
        ]),

        // 10. Fair mode (live/upcoming/ended + scan counts + history)
        Promise.all([
            prisma.fairEvent.findFirst({ where: { status: 'LIVE' }, orderBy: { startDate: 'desc' } }),
            prisma.fairEvent.findFirst({ where: { status: 'UPCOMING', startDate: { gte: new Date() } }, orderBy: { startDate: 'asc' } }),
            prisma.fairEvent.findFirst({ where: { status: 'COMPLETED', endedAt: { gte: sevenDaysAgo } }, orderBy: { endedAt: 'desc' } }),
            prisma.fairAttendance.groupBy({
                by: ['fairEventId'],
                where: { universityId: uni.id },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } },
            }),
        ]),

        // 11. Fair invitations
        prisma.fairInvitation.findMany({
            where: { universityId: uni.id },
            include: { fairEvent: true },
        }),
    ])

    // ── Extract results with safe defaults ───────────────────────────────────
    const matchedStudents = matchedStudentsResult.status === 'fulfilled' ? matchedStudentsResult.value : []
    const availabilitySlots = availabilitySlotsResult.status === 'fulfilled' ? availabilitySlotsResult.value : []
    const [allMeetings, upcomingMeetings] = meetingsResult.status === 'fulfilled' ? meetingsResult.value : [[], []]
    const fairOutreach = fairOutreachResult.status === 'fulfilled' ? fairOutreachResult.value : []
    const proctorRequests = proctorRequestsResult.status === 'fulfilled' ? proctorRequestsResult.value : []
    const nudgeableStudents = nudgeableResult.status === 'fulfilled' ? nudgeableResult.value : []
    const outreachHistory = outreachHistoryResult.status === 'fulfilled' ? outreachHistoryResult.value : []
    const [weekNudges, weekReplies] = weekStatsResult.status === 'fulfilled' ? weekStatsResult.value : [0, 0]
    const [dismissedRows, recentMessages] = actionCentreResult.status === 'fulfilled' ? actionCentreResult.value : [[], []]
    const [liveFair, upcomingFair, recentlyEndedFair, fairHistoryGroups] =
        fairModeResult.status === 'fulfilled' ? fairModeResult.value : [null, null, null, []]
    const fairInvitations = fairInvitationsResult.status === 'fulfilled' ? fairInvitationsResult.value : []

    // ── Group sessions (separate fetch for clean typing) ────────────────────
    const groupSessionsRaw = await prisma.groupSession.findMany({
        where: { universityId: uni.id },
        include: {
            program: { select: { programName: true } },
            seats: { select: { status: true, waitlistPos: true } },
        },
        orderBy: { scheduledAt: 'asc' },
    }).catch(() => [])

    const groupSessions = groupSessionsRaw.map((s: any) => ({
        id: s.id,
        title: s.title,
        agenda: s.agenda,
        programName: s.program?.programName ?? null,
        targetField: s.targetField,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        capacity: s.capacity,
        status: s.status,
        joinUrl: s.joinUrl,
        recapUrl: s.recapUrl,
        notifiedCount: s.notifiedCount,
        followUpDraftId: s.followUpDraftId,
        confirmedCount: s.seats.filter((seat: any) => seat.status === 'CONFIRMED').length,
        waitlistedCount: s.seats.filter((seat: any) => seat.status === 'WAITLISTED').length,
    }))

    const hasActiveGroupSessions = groupSessions.some(
        (s: any) => !['COMPLETED', 'CANCELLED'].includes(s.status)
    )

    // ── Post-processing (unchanged) ──────────────────────────────────────────
    const serialisedHistory = outreachHistory.filter((r: any) => r.student !== null).map((r: any) => ({
        id: r.id,
        subject: r.subject,
        content: r.content,
        sentAt: r.sentAt.toISOString(),
        status: r.status as 'SENT' | 'OPENED' | 'REPLIED' | 'CONVERTED' | 'NO_RESPONSE',
        student: {
            maskedName: maskName(r.student.user.name),
            fieldOfInterest: r.student.fieldOfInterest,
            country: r.student.country,
        }
    }))
    const serialisedNudgeable = nudgeableStudents.map((s: any) => ({
        ...s,
        lastNudgedAt: s.lastNudgedAt ? s.lastNudgedAt.toISOString() : null,
    }))

    const excludedStudentIds = [
        ...dismissedRows.map((d: any) => d.studentId),
        ...recentMessages.map((m: any) => m.studentId),
        ...uni.interests.map((i: any) => i.studentId),
    ]
    const actionCentreFields = [...new Set(uni.programs.map((p: any) => p.fieldCategory).filter(Boolean))] as string[]
    const discoverableStudents = actionCentreFields.length > 0
        ? await prisma.student.findMany({
            where: {
                profileComplete: true,
                fieldOfInterest: { in: actionCentreFields },
                id: { notIn: excludedStudentIds },
                user: { consentMarketing: true, consentWithdrawnAt: null, isActive: true },
            },
            select: { id: true, city: true, fieldOfInterest: true, preferredDegree: true, currentStatus: true, user: { select: { name: true } } },
            take: 10,
            orderBy: { updatedAt: 'desc' },
        }).catch(() => [])
        : []
    const discoverableForUI = discoverableStudents.map((s: any) => ({
        id: s.id,
        fullName: s.user.name ?? null,
        city: s.city,
        fieldOfInterest: s.fieldOfInterest,
        preferredDegree: s.preferredDegree,
        currentStatus: s.currentStatus,
    }))

    // Fair mode post-processing
    const fairEventIds = fairHistoryGroups.map((g: any) => g.fairEventId)
    const fairEventsForHistory = fairEventIds.length > 0
        ? await prisma.fairEvent.findMany({ where: { id: { in: fairEventIds } } }).catch(() => [])
        : []
    const fairEventMap = Object.fromEntries(fairEventsForHistory.map((e: any) => [e.id, e]))
    const fairHistoryWithDetails = fairHistoryGroups.map((record: any) => ({
        fair: fairEventMap[record.fairEventId] ?? null,
        leadCount: record._count.id,
    }))
    const upcomingWithin7 = upcomingFair &&
        (new Date((upcomingFair as any).startDate).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000

    const [todayScans, recentLeadCount] = await Promise.all([
        liveFair
            ? prisma.fairAttendance.count({
                where: { universityId: uni.id, fairEventId: (liveFair as any).id, scannedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
            }).catch(() => 0)
            : Promise.resolve(0),
        recentlyEndedFair
            ? prisma.fairAttendance.count({ where: { universityId: uni.id, fairEventId: (recentlyEndedFair as any).id } }).catch(() => 0)
            : Promise.resolve(0),
    ])

    const invitationByFairId = Object.fromEntries(fairInvitations.map((inv: any) => [inv.fairEventId, inv]))
    const activePrograms = uni.programs.filter((p: any) => p.status === 'ACTIVE').map((p: any) => ({ id: p.id, programName: p.programName }))

    // Stats
    const stats = {
        totalPrograms: uni.programs.length,
        totalInterests: uni.interests.length,
        totalMeetings: allMeetings.length,
        totalStudentsMatched: matchedStudents.length,
        acceptanceRate: uni.interests.length > 0
            ? Math.round((uni.interests.filter((i: any) => i.status === 'ACCEPTED').length / uni.interests.length) * 100)
            : 0
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const awaitingResponse = uni.interests.filter(
        (i: any) => i.status === 'INTERESTED' && !i.universityNote && new Date(i.createdAt) < fortyEightHoursAgo
    ).length

    const pendingInterestsCount = uni.interests.filter((i: any) => i.status === 'PENDING').length
    const recentInterests = uni.interests.slice(0, 5)

    const completeness = calculateCompleteness(uni)
    const { score: completenessScore, tasks: completenessTasks } = completeness





    return (
        <div className="space-y-8 max-w-full px-4 md:px-6 py-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <UniversityLogo
                        src={uni.logo}
                        alt={uni.institutionName}
                        size="lg"
                        isVerified={uni.verificationStatus === 'VERIFIED'}
                        className="shadow-sm border border-gray-100"
                        websiteUrl={uni.website}
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

            {/* ── Addition 1: Live / Upcoming Fair Banner ── */}
            {liveFair ? (
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 md:p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                                <span className="text-white font-bold text-sm tracking-widest uppercase">Live Now</span>
                            </div>
                            <h2 className="text-white font-bold text-xl md:text-2xl truncate">{liveFair.name}</h2>
                            {(liveFair.venue || liveFair.city) && (
                                <p className="text-emerald-100 text-sm mt-1">{[liveFair.venue, liveFair.city].filter(Boolean).join(' · ')}</p>
                            )}
                            <p className="text-emerald-200 text-xs mt-3">Scanner works on any phone browser — no app needed</p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                            <Link
                                href={`/event/${liveFair.slug}/scan`}
                                className="inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-bold rounded-xl px-5 py-3 text-sm shadow-sm hover:bg-emerald-50 transition-colors w-full md:w-auto"
                            >
                                <QrCode className="w-4 h-4" /> Open Booth Scanner
                            </Link>
                            <Link
                                href={`/dashboard/university/fair-report/${liveFair.id}`}
                                className="inline-flex items-center justify-center gap-2 border border-white/40 text-white font-semibold rounded-xl px-5 py-2.5 text-sm hover:bg-white/10 transition-colors w-full md:w-auto"
                            >
                                My Leads Today ({todayScans})
                            </Link>
                        </div>
                    </div>
                </div>
            ) : upcomingWithin7 && upcomingFair ? (
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 md:p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 min-w-0">
                            <span className="inline-block bg-white/20 text-white text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-2">Coming Soon</span>
                            <h2 className="text-white font-bold text-xl md:text-2xl truncate">{upcomingFair.name}</h2>
                            <p className="text-blue-100 text-sm mt-1">
                                {new Date(upcomingFair.startDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                                {(upcomingFair.venue || upcomingFair.city) &&
                                    ` · ${[upcomingFair.venue, upcomingFair.city].filter(Boolean).join(', ')}`}
                            </p>
                            <p className="text-blue-200 text-xs mt-2">You will receive your scanner link when the fair goes live</p>
                        </div>
                        <div className="shrink-0">
                            <Link
                                href={`/fair?eventId=${upcomingFair.id}`}
                                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold rounded-xl px-5 py-3 text-sm shadow-sm hover:bg-blue-50 transition-colors"
                            >
                                <Zap className="w-4 h-4" /> Register for This Fair
                            </Link>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* ── Addition 2: Recently Completed Fair Report Card ── */}
            {recentlyEndedFair && recentLeadCount > 0 && (
                <FairReportCard
                    fairName={recentlyEndedFair.name}
                    fairId={recentlyEndedFair.id}
                    leadCount={recentLeadCount}
                    endedAt={recentlyEndedFair.endedAt?.toISOString() ?? recentlyEndedFair.endDate.toISOString()}
                />
            )}

            <div className="mb-8">
                <NotificationsCenter
                    userRole="UNIVERSITY"
                    invitationByFairId={invitationByFairId}
                    programs={activePrograms}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <div className="w-full overflow-x-auto pb-2 -mb-2">
                    <TabsList className="w-full justify-start min-w-max">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="interests">Student Interests</TabsTrigger>
                        <TabsTrigger value="meetings">Meetings</TabsTrigger>
                        <TabsTrigger value="group-sessions" className="relative">
                            Group Sessions
                            {hasActiveGroupSessions && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="programs">Programs</TabsTrigger>
                        <TabsTrigger value="fairs" className="relative">
                            Campus Fairs
                            {(fairInvitations.some(i => i.status === 'PENDING') ||
                                fairOutreach.filter(o => o.status === 'SENT').length > 0) && (
                                    <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                                )}
                        </TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="proctor" className="relative">
                            Proctor Services
                            {proctorRequests.some(r => r.status === 'CONFIRMED') && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full" />
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="outreach" className="relative">
                            Discover Students
                            {nudgeableStudents.length > 0 && (
                                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
                            )}
                        </TabsTrigger>
                        {fairHistoryWithDetails.length > 0 && (
                            <TabsTrigger value="fair-leads" className="relative">
                                Fair Leads
                                {liveFair && (
                                    <span className="ml-1.5 inline-block bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">LIVE</span>
                                )}
                            </TabsTrigger>
                        )}
                    </TabsList>
                </div>

                <TabsContent value="overview" className="space-y-6">
                    <ActionCentre
                        universityId={uni.id}
                        repId={user.id}
                        completeness={{ score: completenessScore, tasks: completenessTasks }}
                        discoverableStudents={discoverableForUI}
                        programNames={uni.programs.map((p: any) => p.programName)}

                    />

                    <DashboardStats
                        stats={stats}
                        meetingCount={upcomingMeetings.length}
                        pendingInterests={pendingInterestsCount}
                        responseRate={uni.responseRate ?? null}
                        awaitingResponse={awaitingResponse}
                    />

                    {/* Outreach stats widget */}
                    {(weekNudges > 0 || serialisedHistory.length > 0) && (
                        <div className="grid grid-cols-3 gap-4">
                            {[{ label: 'Nudges this week', value: weekNudges, color: 'text-primary' },
                            { label: 'Replies this week', value: weekReplies, color: 'text-green-600' },
                            { label: 'All-time nudges', value: serialisedHistory.length, color: 'text-slate-700' }]
                                .map(({ label, value, color }) => (
                                    <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                                        <p className={`text-3xl font-bold ${color}`}>{value}</p>
                                        <p className="text-xs text-slate-500 mt-1">{label}</p>
                                    </div>
                                ))}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center">
                                <div>
                                    <CardTitle>Recent Student Interests</CardTitle>
                                    <CardDescription>Latest students interested in your programs</CardDescription>
                                </div>
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

                <TabsContent value="group-sessions">
                    <GroupSessionsTab
                        sessions={JSON.parse(JSON.stringify(groupSessions))}
                        programs={uni.programs.map((p: any) => ({ id: p.id, programName: p.programName, fieldCategory: p.fieldCategory }))}
                    />
                </TabsContent>

                <TabsContent value="programs">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <ProgramList programs={JSON.parse(JSON.stringify(uni.programs))} universityId={uni.id} />
                    </div>
                </TabsContent>

                <TabsContent value="fairs">
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">Campus Fair Opportunities</h2>
                            <p className="text-slate-500">Invitations to participate in upcoming campus fairs.</p>
                        </div>

                        {/* ── FairInvitation cards (RSVP flow) ── */}
                        {fairInvitations.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Fair Invitations</h3>
                                {fairInvitations.map((inv) => (
                                    <CampusFairInviteCard
                                        key={inv.id}
                                        notification={{
                                            id: inv.id,
                                            createdAt: inv.createdAt.toISOString(),
                                        }}
                                        fairEvent={{
                                            id: inv.fairEvent.id,
                                            name: inv.fairEvent.name,
                                            city: inv.fairEvent.city,
                                            venue: inv.fairEvent.venue,
                                            startDate: inv.fairEvent.startDate.toISOString(),
                                            rsvpDeadline: inv.fairEvent.rsvpDeadline?.toISOString() ?? null,
                                        }}
                                        invitation={{
                                            id: inv.id,
                                            status: inv.status as 'PENDING' | 'CONFIRMED' | 'DECLINED',
                                            respondedAt: inv.respondedAt?.toISOString() ?? null,
                                            repsAttending: inv.repsAttending,
                                            programsShowcasing: inv.programsShowcasing,
                                        }}
                                        programs={uni.programs.map((p: any) => ({
                                            id: p.id,
                                            programName: p.programName,
                                            degreeLevel: p.degreeLevel,
                                        }))}

                                    />
                                ))}
                            </div>
                        )}

                        {/* ── Legacy host-request outreach ── */}
                        {fairOutreach.length > 0 && (
                            <div className="space-y-3">
                                {fairInvitations.length > 0 && (
                                    <div className="border-t border-slate-100 pt-4">
                                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Host Request Outreach</h3>
                                    </div>
                                )}
                                <FairOutreachList requests={JSON.parse(JSON.stringify(fairOutreach))} />
                            </div>
                        )}

                        {fairInvitations.length === 0 && fairOutreach.length === 0 && (
                            <div className="text-center py-12 text-slate-400">
                                <p className="text-sm">No campus fair invitations yet.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="documents">
                    <UniDocManager
                        initialDocs={JSON.parse(JSON.stringify(uni.documents)).map((d: any) => ({
                            ...d,
                            uploadedAt: new Date(d.uploadedAt).toISOString(),
                        }))}
                    />
                </TabsContent>

                <TabsContent value="proctor" className="space-y-6">
                    <ProctorTab
                        universityId={uni.id}
                        universityName={uni.institutionName}
                        requests={JSON.parse(JSON.stringify(proctorRequests))}
                    />
                </TabsContent>

                <TabsContent value="outreach" className="space-y-6">
                    <OutreachTab
                        students={serialisedNudgeable}
                        history={serialisedHistory}
                        universityName={uni.institutionName}
                    />
                </TabsContent>

                {/* ── Addition 3: Fair Leads History Tab ── */}
                {fairHistoryWithDetails.length > 0 && (
                    <TabsContent value="fair-leads" className="space-y-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Fair Participation History</h2>
                            <p className="text-sm text-gray-500 mt-1">All fairs your booth has participated in</p>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            {/* Mobile cards */}
                            <div className="md:hidden divide-y divide-gray-100">
                                {fairHistoryWithDetails.map(({ fair, leadCount }) => fair && (
                                    <div key={fair.id} className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-gray-900">{fair.name}</p>
                                                {fair.city && <p className="text-xs text-gray-400 mt-0.5">{fair.city}</p>}
                                            </div>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${fair.status === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : fair.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600 border-gray-300'
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>{fair.status}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{new Date(fair.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        <p className="text-sm font-semibold text-indigo-600">{leadCount} leads</p>
                                        <div className="flex gap-2">
                                            {fair.status === 'LIVE' && (
                                                <Link href={`/event/${fair.slug}/scan`} className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
                                                    <QrCode className="w-3.5 h-3.5" /> Open Scanner
                                                </Link>
                                            )}
                                            <Link href={`/dashboard/university/fair-report/${fair.id}`} className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1">
                                                <FileText className="w-3.5 h-3.5" /> View Report
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Desktop table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50">
                                            <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fair Name</th>
                                            <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">City</th>
                                            <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                            <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</th>
                                            <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                            <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {fairHistoryWithDetails.map(({ fair, leadCount }) => fair && (
                                            <tr key={fair.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-5 py-3.5 font-semibold text-gray-900">{fair.name}</td>
                                                <td className="px-4 py-3.5 text-gray-500">{fair.city ?? '—'}</td>
                                                <td className="px-4 py-3.5 text-gray-500">{new Date(fair.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                                <td className="px-4 py-3.5 text-right font-semibold text-indigo-600">{leadCount}</td>
                                                <td className="px-4 py-3.5 text-center">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${fair.status === 'LIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : fair.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600 border-gray-300'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                        }`}>{fair.status}</span>
                                                </td>
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        {fair.status === 'LIVE' && (
                                                            <Link href={`/event/${fair.slug}/scan`} className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                                                                <QrCode className="w-3.5 h-3.5" /> Scanner
                                                            </Link>
                                                        )}
                                                        <Link href={`/dashboard/university/fair-report/${fair.id}`} className="inline-flex items-center gap-1 text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                                                            <ChevronRight className="w-3.5 h-3.5" /> Report
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    )
}
