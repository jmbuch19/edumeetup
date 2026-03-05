import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StudentNav } from '@/components/student/student-nav'
import { StudentRightSidebar } from '@/components/student/student-right-sidebar'
import '@/app/dashboard-tokens.css'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
    const session = await auth()
    if (!session || (session.user as any).role !== 'STUDENT') {
        redirect('/login')
    }

    const student = await prisma.student.findFirst({
        where: { userId: session.user.id },
        select: { fullName: true, city: true },
    })

    const today = new Date()
    const hours = today.getHours()
    const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening'
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
    const firstName = (student?.fullName ?? session.user.name ?? 'there').split(' ')[0]

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface)', fontFamily: 'var(--font-body)' }}>

            {/* ── Left Navigation ─────────────────────────────────────────────── */}
            <StudentNav
                userName={student?.fullName ?? session.user.name}
                city={student?.city}
                senderEmail={session.user.email}
            />

            {/* ── Centre ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* Sticky header */}
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3.5 border-b"
                    style={{
                        background: 'rgba(240,249,248,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'var(--border-dash)',
                    }}>
                    {/* Left — mobile hamburger (only shows on mobile) + greeting */}
                    <div className="flex items-center gap-3 min-w-0">
                        <StudentNav
                            hamburgerOnly
                            userName={student?.fullName ?? session.user.name}
                            city={student?.city}
                            senderEmail={session.user.email}
                        />
                        <div className="min-w-0">
                            <p className="text-lg font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                                {greeting}, {firstName} 👋
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                {dateStr}
                            </p>
                        </div>
                    </div>

                    {/* Right — CTAs */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <a href="/student/profile"
                            className="hidden sm:inline-flex items-center border rounded-full px-4 py-1.5 text-xs font-semibold transition-colors hover:bg-teal-50"
                            style={{ borderColor: 'var(--teal)', color: 'var(--teal)', background: 'transparent' }}>
                            My Profile
                        </a>
                        <a href="/universities"
                            className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                            style={{ background: 'var(--teal)' }}>
                            Explore All
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
            <StudentRightSidebar />
        </div>
    )
}
