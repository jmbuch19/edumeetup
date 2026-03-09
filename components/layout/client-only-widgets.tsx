'use client'

// This file exists solely to host dynamic() calls with ssr: false.
// Next.js 15 requires ssr: false dynamic imports to live in Client Components,
// not in Server Components (app/layout.tsx is a Server Component).

import dynamic from 'next/dynamic'

// AdmissionsChat is the global concierge — available on every page.
// studentId is not passed here (user may not be logged in); the API
// gracefully handles unauthenticated visitors too.
const AdmissionsChat = dynamic(
    () => import('@/components/chat/admissions-chat').then(m => m.AdmissionsChat),
    { ssr: false }
)

const SessionGuard = dynamic(
    () => import('@/components/session-guard').then(m => m.SessionGuard),
    { ssr: false }
)

export function ClientOnlyWidgets() {
    return (
        <>
            <AdmissionsChat />
            <SessionGuard />
        </>
    )
}
