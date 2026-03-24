import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileRing } from '@/components/shared/profile-ring'
import { CalendarDays, CheckCircle2, Circle } from 'lucide-react'

export const dynamic = 'force-dynamic'

function fmtTime(d: Date) {
    return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}
function fmtDay(d: Date) {
    const today = new Date()
    const dt = new Date(d)
    const diff = Math.floor((dt.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0)) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export async function UniversityRightSidebar() {
    // ── Auth — universityId always from session, never URL params ─────────
    const session = await auth()
    if (!session?.user) redirect('/login')

    const uni = await prisma.university.findFirst({
        where: { userId: session.user.id },
        select: {
            id: true,
            logo: true,
            about: true,
            website: true,
            repName: true,
            repEmail: true,
            contactPhone: true,
            scholarshipsAvailable: true,
            foundedYear: true,
            programList: { select: { description: true, programName: true } },
            _count: { select: { interests: true } },
        },
    })

    if (!uni) return null

    // ── Profile completeness ───────────────────────────────────────────────
    const compTasks = [
        { done: !!uni.logo,                                         label: 'Upload logo' },
        { done: !!uni.about && uni.about.length > 50,               label: 'Write about section' },
        { done: !!uni.website,                                       label: 'Add website' },
        { done: !!uni.repName && !!uni.repEmail,                     label: 'Rep name & email' },
        { done: !!uni.contactPhone,                                  label: 'Contact phone' },
        { done: uni.programList.length > 0 &&
                 uni.programList.every((p: any) => (p.description?.length ?? 0) > 30), label: 'Programme descriptions' },
        { done: uni.scholarshipsAvailable,                           label: 'Scholarship info' },
        { done: !!uni.foundedYear,                                   label: 'Founded year' },
    ]
    const pct = Math.round((compTasks.filter(t => t.done).length / compTasks.length) * 100)

    // ── This week stats ────────────────────────────────────────────────────
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const [weekInterests, weekMeetings, totalMeetingsPending] = await Promise.all([
        prisma.interest.count({ where: { universityId: uni.id, createdAt: { gte: oneWeekAgo } } }),
        prisma.meeting.count({ where: { universityId: uni.id, createdAt: { gte: oneWeekAgo } } }),
        prisma.meeting.count({ where: { universityId: uni.id, status: 'PENDING' } }),
    ])

    // ── Upcoming meetings (next 3) ─────────────────────────────────────────
    const upcoming = await prisma.meeting.findMany({
        where: {
            universityId: uni.id,
            startTime: { gte: new Date() },
            status: { in: ['PENDING', 'CONFIRMED'] },
        },
        orderBy: { startTime: 'asc' },
        take: 3,
        include: { student: { include: { user: { select: { name: true } } } } },
    })

    const stats = [
        { num: weekInterests, label: 'New Interests', sub: 'this week' },
        { num: weekMeetings,  label: 'Meetings Set',  sub: 'this week' },
        { num: uni._count.interests, label: 'Total EOIs', sub: 'all time' },
        { num: totalMeetingsPending, label: 'Awaiting Confirm', sub: 'action needed' },
    ]

    return (
        <aside className="hidden lg:flex flex-col w-[300px] min-w-[300px] overflow-y-auto px-4 py-5 gap-4 border-l"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-dash)' }}>

            {/* Profile Completeness */}
            <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Profile Completeness
                </p>
                <div className="flex items-center gap-3 mb-3">
                    <ProfileRing pct={pct} />
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{pct}% Complete</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {compTasks.filter(t => !t.done).length} items remaining
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {compTasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            {t.done
                                ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--teal)' }} />
                                : <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />}
                            <span style={{ color: t.done ? 'var(--text-muted)' : 'var(--navy)', textDecoration: t.done ? 'line-through' : 'none' }}>
                                {t.label}
                            </span>
                        </div>
                    ))}
                </div>
                <Link href="/university/settings"
                    className="mt-3 block w-full text-center text-xs font-semibold py-2 rounded-lg transition-colors"
                    style={{ background: 'var(--teal-pale)', color: 'var(--teal)' }}>
                    Complete Profile
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Activity
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {stats.map((s, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                                {s.num}
                            </p>
                            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--navy)' }}>{s.label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--teal)' }}>{s.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Meetings */}
            <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Upcoming Meetings
                </p>
                {upcoming.length === 0 ? (
                    <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No upcoming meetings</p>
                ) : (
                    <div className="flex flex-col">
                        {upcoming.map((m: any, i: any) => (
                            <div key={m.id} className={`flex items-start gap-2.5 py-2.5 ${i < upcoming.length - 1 ? 'border-b' : ''}`}
                                style={{ borderColor: 'var(--border-dash)' }}>
                                <div className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--gold)' }} />
                                <div>
                                    <p className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                                        {m.student?.fullName || m.student?.user?.name || 'Student'}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                        <CalendarDays className="h-3 w-3 inline mr-1" style={{ color: 'var(--gold)' }} />
                                        {fmtDay(m.startTime)}, {fmtTime(m.startTime)} · {m.durationMinutes}min
                                    </p>
                                    <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1 ${
                                        m.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>{m.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </aside>
    )
}

