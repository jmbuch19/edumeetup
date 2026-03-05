'use client'

import { usePathname } from 'next/navigation'
import { Header } from './header'
import { Footer } from './footer'

/**
 * Renders the public Header + beta banner + Footer only for non-dashboard routes.
 * Dashboard portals (/university/*, /student/*, /admin/*) are self-contained
 * and must NOT receive the public shell.
 */

const DASHBOARD_PREFIXES = ['/university', '/student', '/admin']

export function PublicShell({
    children,
    isLoggedIn,
}: {
    children: React.ReactNode
    isLoggedIn: boolean
}) {
    const pathname = usePathname()
    const isDashboard = DASHBOARD_PREFIXES.some(p => pathname.startsWith(p))

    if (isDashboard) {
        return <>{children}</>
    }

    return (
        <>
            <Header />
            {isLoggedIn && (
                <div className="bg-amber-100 text-amber-900 text-center py-2 text-sm font-medium border-b border-amber-200">
                    🚧 Beta Version – Testing Phase. System is active for demonstration.
                </div>
            )}
            <main className="min-h-screen">{children}</main>
            <Footer />
        </>
    )
}
