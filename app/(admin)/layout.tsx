import '@/app/dashboard-tokens.css'
import { auth } from "@/lib/auth"

import { prisma } from "@/lib/prisma"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminRightSidebar } from "@/components/admin/admin-right-sidebar"
import { NotificationsCenter } from "@/components/notifications-center"

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    let session = null
    try {
        session = await auth()
    } catch (e) {
        console.error('[AdminLayout] auth() failed:', e)
    }

    // ── Session check — render interstitial instead of redirect() ─────────────
    // IMPORTANT: Do NOT use redirect() here. A layout-level redirect() causes
    // Next.js App Router's client router to call replaceState() in a tight loop
    // while the middleware bounces back, throttling the browser (crbug.com/1038223).
    // Instead, render a static interstitial — clean UX, no loop.
    if (!session?.user || session.user.role !== 'ADMIN') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Session Expired</h1>
                    <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Your admin session has expired. Please sign in again.</p>
                    <a href="/login" style={{ display: 'inline-block', background: '#1e40af', color: 'white', padding: '10px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
                        Sign In
                    </a>
                </div>
            </div>
        )
    }


    const adminName = session.user.name || session.user.email?.split('@')[0] || 'Admin'

    // ── Platform stats for right sidebar ─────────────────────────────────────
    let totalUniversities = 0
    let totalStudents = 0
    let meetingsThisWeek = 0
    let pendingVerifications = 0

    try {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ;[totalUniversities, totalStudents, meetingsThisWeek, pendingVerifications] = await Promise.all([
                prisma.university.count(),
                prisma.student.count(),
                prisma.meeting.count({ where: { createdAt: { gte: weekAgo } } }),
                prisma.university.count({ where: { verificationStatus: 'PENDING' } }),
            ])
    } catch (e) {
        console.error('[AdminLayout] stats fetch failed:', e)
    }

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--surface)', fontFamily: 'var(--font-body)' }}>

            {/* ── Left Nav ─────────────────────────────────────────────────── */}
            <AdminNav adminName={adminName} adminEmail={session.user.email} />

            {/* ── Centre column ────────────────────────────────────────────── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

                {/* Sticky header */}
                <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3.5 border-b md:hidden"
                    style={{
                        background: 'rgba(240,249,248,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderColor: 'var(--border-dash)',
                    }}>
                    <div className="flex items-center gap-3">
                        <AdminNav hamburgerOnly adminName={adminName} adminEmail={session.user.email} />
                        <p className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                            Admin
                        </p>
                    </div>
                    <NotificationsCenter userRole="ADMIN" />
                </header>

                {/* Page content */}
                <main className="flex-1 flex overflow-hidden">
                    <div className="flex-1 w-full max-w-[860px] mx-auto overflow-y-auto px-3">
                        {children}
                    </div>
                </main>
            </div>

            {/* ── Right Sidebar ─────────────────────────────────────────────── */}
            <AdminRightSidebar
                totalUniversities={totalUniversities}
                totalStudents={totalStudents}
                meetingsThisWeek={meetingsThisWeek}
                pendingVerifications={pendingVerifications}
            />
        </div>
    )
}
