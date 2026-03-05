import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Suspense } from 'react'
import { UniversityNav } from '@/components/university/university-nav'
import { UniversityRightSidebar } from '@/components/university/university-right-sidebar'
import '@/app/dashboard-tokens.css'

export default async function UniversityLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    if (!session || (
        (session.user as any).role !== 'UNIVERSITY' &&
        (session.user as any).role !== 'UNIVERSITY_REP'
    )) {
        redirect('/login')
    }

    // Fetch university basics for the nav + header
    const uni = await prisma.university.findFirst({
        where: { userId: session.user.id },
        select: {
            institutionName: true,
            logo: true,
            interests: { select: { id: true }, where: { status: 'INTERESTED' }, take: 20 }
        },
    })

    // Check for live fair — live scanner link in sidebar
    const liveFair = await prisma.fairEvent.findFirst({ where: { status: 'LIVE' } }).catch(() => null)

    const pendingCount = uni?.interests.length ?? 0
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface)', fontFamily: 'var(--font-body)' }}>

            {/* ── Left Navigation ─────────────────────────────────────────────── */}
            <UniversityNav
                userName={session.user.name}
                institutionName={uni?.institutionName}
                logoUrl={uni?.logo}
                liveFairHref={liveFair ? `/event/${(liveFair as any).slug}/scan` : undefined}
            />

            {/* ── Centre — scrollable content ─────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* Sticky header */}
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3.5 border-b"
                    style={{
                        background: 'rgba(240,249,248,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'var(--border-dash)',
                    }}>
                    {/* Left — mobile hamburger + title */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* hamburgerOnly — desktop sidebar already rendered above */}
                        <UniversityNav
                            hamburgerOnly
                            userName={session.user.name}
                            institutionName={uni?.institutionName}
                            logoUrl={uni?.logo}
                            liveFairHref={liveFair ? `/event/${(liveFair as any).slug}/scan` : undefined}
                        />
                        <div className="min-w-0">
                            <p className="text-lg font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                                {uni?.institutionName ?? 'University Dashboard'}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                {today}{pendingCount > 0 ? ` · ${pendingCount} new interests` : ''}
                            </p>
                        </div>
                    </div>

                    {/* Right — CTAs */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button className="hidden sm:inline-flex items-center border rounded-full px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-teal-50"
                            style={{ borderColor: 'var(--teal)', color: 'var(--teal)', background: 'transparent' }}>
                            Filter
                        </button>
                        <a href="/university/dashboard?tab=outreach"
                            className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ background: 'var(--teal)' }}>
                            + Invite Students
                        </a>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 flex overflow-hidden">
                    <div className="flex-1 w-full max-w-[640px] mx-auto overflow-y-auto">
                        {children}
                    </div>
                </main>
            </div>

            {/* ── Right Sidebar ────────────────────────────────────────────────── */}
            <Suspense fallback={<aside className="hidden lg:flex w-[300px] min-w-[300px] border-l" />}>
                <UniversityRightSidebar />
            </Suspense>
        </div>
    )
}
