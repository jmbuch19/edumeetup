'use client'

// This file exists solely to host dynamic() calls with ssr: false.
// Next.js 15 requires ssr: false dynamic imports to live in Client Components,
// not in Server Components (app/layout.tsx is a Server Component).

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// AdmissionsChat is the global concierge — available on public pages only.
// Hidden on dashboard routes since those have dedicated AI chat (Claude bot).
const AdmissionsChat = dynamic(
    () => import('@/components/chat/admissions-chat').then(m => m.AdmissionsChat),
    { ssr: false }
)

const SessionGuard = dynamic(
    () => import('@/components/session-guard').then(m => m.SessionGuard),
    { ssr: false }
)

// Dashboard route prefixes where the concierge should be hidden
const DASHBOARD_PREFIXES = [
    '/student/',
    '/university/',
    '/admin/',
    '/student',
    '/university',
    '/admin',
]

export function ClientOnlyWidgets() {
    const pathname = usePathname()
    const isOnDashboard = DASHBOARD_PREFIXES.some(prefix => pathname.startsWith(prefix))

    return (
        <>
            {!isOnDashboard && <AdmissionsChat />}
            <SessionGuard />
        </>
    )
}
