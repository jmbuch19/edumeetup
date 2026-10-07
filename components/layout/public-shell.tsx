'use client'

import { usePathname } from 'next/navigation'
import { isDashboardPath } from '@/lib/dashboard-routes'

/**
 * Client-side route guard that hides the public header/footer on dashboard routes.
 * Header and Footer are passed as React nodes rendered by the server layout —
 * this component never imports them directly (avoids bundling Node.js-only deps).
 */

export function PublicShell({
    children,
    header,
    footer,
    banner,
}: {
    children: React.ReactNode
    header: React.ReactNode
    footer: React.ReactNode
    banner?: React.ReactNode
}) {
    const pathname = usePathname()
    const isDashboard = isDashboardPath(pathname)

    if (isDashboard) {
        return <>{children}</>
    }

    return (
        <>
            {header}
            {banner}
            <main className="min-h-screen">{children}</main>
            {footer}
        </>
    )
}
