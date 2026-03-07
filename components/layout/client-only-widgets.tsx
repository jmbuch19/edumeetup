'use client'

// This file exists solely to host dynamic() calls with ssr: false.
// Next.js 15 requires ssr: false dynamic imports to live in Client Components,
// not in Server Components (app/layout.tsx is a Server Component).

import dynamic from 'next/dynamic'

const ChatWidget = dynamic(
    () => import('@/components/ai/chat-widget').then(m => m.ChatWidget),
    { ssr: false }
)

const SessionGuard = dynamic(
    () => import('@/components/session-guard').then(m => m.SessionGuard),
    { ssr: false }
)

export function ClientOnlyWidgets() {
    return (
        <>
            <ChatWidget />
            <SessionGuard />
        </>
    )
}
