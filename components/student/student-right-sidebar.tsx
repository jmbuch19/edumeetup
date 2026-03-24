import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProfileRing } from '@/components/shared/profile-ring'
import { CheckCircle2, Circle } from 'lucide-react'

export async function StudentRightSidebar() {
    // ── Auth — studentId always from session ─────────────────────────────
    const session = await auth()
    if (!session?.user) redirect('/login')

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: {
            id: true,
            fullName: true,
            country: true,
            preferredDegree: true,
            fieldOfInterest: true,
            preferredCountries: true,
            englishScore: true,
            currentStatus: true,
            profileComplete: true,
        }
    })

    if (!student) return null

    // ── Profile completeness tasks ────────────────────────────────────────
    const compTasks = [
        { done: !!student.fullName, label: 'Personal info' },
        { done: !!student.country, label: 'Academic history' },
        { done: !!student.preferredCountries && student.preferredCountries.length > 0, label: 'Preferred countries' },
        { done: !!student.englishScore, label: 'English test scores' },
        { done: !!student.currentStatus, label: 'Current status' },
        { done: !!student.fieldOfInterest, label: 'Field of interest' },
    ]
    const pct = Math.round((compTasks.filter(t => t.done).length / compTasks.length) * 100)

    // ── Journey stats (explicit counts) ───────────────────────────────────
    const [interestCount, meetingCount] = await Promise.all([
        prisma.interest.count({ where: { studentId: student.id } }),
        prisma.meeting.count({ where: { studentId: student.id } }),
    ])

    const stats = [
        { num: interestCount, label: 'Expressed Interest', sub: 'universities' },
        { num: meetingCount, label: 'Meetings', sub: 'all time' },
    ]

    // ── Suggested universities (verified, not already interested) ─────────
    const interestedIds = await prisma.interest.findMany({
        where: { studentId: student.id },
        select: { universityId: true }
    })
    const excludeIds = interestedIds.map((i: any) => i.universityId)

    const suggested = await prisma.university.findMany({
        where: {
            verificationStatus: 'VERIFIED',
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        select: { id: true, institutionName: true, country: true, logo: true, website: true },

        take: 3,
        orderBy: { createdAt: 'desc' },
    })

    return (
        <aside className="hidden lg:flex flex-col w-[300px] min-w-[300px] overflow-y-auto px-4 py-5 gap-4 border-l"
            style={{ background: 'var(--surface)', borderColor: 'var(--border-dash)' }}>

            {/* Profile Strength Ring */}
            <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Profile Strength
                </p>
                <div className="flex items-center gap-3 mb-3">
                    <ProfileRing pct={pct} />
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{pct}% Strong</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {compTasks.filter(t => !t.done).length === 0
                                ? 'Profile complete! 🎉'
                                : `Add ${compTasks.find(t => !t.done)?.label?.toLowerCase()} to unlock more matches`}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    {compTasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                            {t.done
                                ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--navy)' }} />
                                : <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />}
                            <span style={{
                                color: t.done ? 'var(--text-muted)' : 'var(--navy)',
                                textDecoration: t.done ? 'line-through' : 'none',
                            }}>
                                {t.label}
                            </span>
                        </div>
                    ))}
                </div>
                <Link href="/student/profile"
                    className="mt-3 block w-full text-center text-xs font-semibold py-2 rounded-lg transition-colors text-white"
                    style={{ background: 'var(--navy)' }}>
                    Complete Profile
                </Link>
            </div>

            {/* Journey Stats */}
            <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    My Journey
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {stats.map((s, i) => (
                        <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface)' }}>
                            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                                {s.num}
                            </p>
                            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--navy)' }}>{s.label}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.sub}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggested Universities */}
            {suggested.length > 0 && (
                <div className="rounded-2xl border p-4 bg-white shadow-sm" style={{ borderColor: 'var(--border-dash)' }}>
                    <p className="font-semibold text-sm mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                        Suggested For You
                    </p>
                    <div className="flex flex-col">
                        {suggested.map((u: any, i: any) => (
                            <div key={u.id}
                                className={`flex items-center gap-3 py-2.5 ${i < suggested.length - 1 ? 'border-b' : ''}`}
                                style={{ borderColor: 'var(--border-dash)' }}>
                                {u.website ? (
                                    <a href={u.website} target="_blank" rel="noopener noreferrer" title={`Visit ${u.institutionName} website ↗`}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border overflow-hidden block"
                                        style={{ borderColor: 'var(--border-dash)', background: 'var(--surface)' }}>
                                        {u.logo
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={u.logo} alt={u.institutionName} className="w-full h-full object-contain" />
                                            : '🎓'}
                                    </a>
                                ) : (
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border overflow-hidden"
                                        style={{ borderColor: 'var(--border-dash)', background: 'var(--surface)' }}>
                                        {u.logo
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={u.logo} alt={u.institutionName} className="w-full h-full object-contain" />
                                            : '🎓'}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--navy)' }}>{u.institutionName}</p>
                                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{u.country ?? 'International'}</p>
                                </div>
                                <Link href={`/universities/${u.id}`}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white flex-shrink-0"
                                    style={{ background: 'var(--navy)' }}>
                                    View
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </aside>
    )
}
