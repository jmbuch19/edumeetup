'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

export function AdminBreadcrumbs() {
    const pathname = usePathname()
    // Split path and remove empty strings
    const segments = pathname.split('/').filter(Boolean)

    // Only show if we are in admin
    if (segments[0] !== 'admin') return null

    return (
        <nav className="flex items-center text-sm text-gray-500 mb-6">
            <Link href="/admin/dashboard" className="flex items-center hover:text-gray-900 transition-colors">
                <Home className="h-4 w-4 mr-1" />
                <span className="sr-only">Dashboard</span>
            </Link>

            {segments.slice(1).map((segment, index) => {
                const href = `/${segments.slice(0, index + 2).join('/')}`
                const isLast = index === segments.length - 2

                // Format segment: "universities" -> "Universities", "some-id" -> "..."
                let label = segment.charAt(0).toUpperCase() + segment.slice(1)

                // Detailed formatting
                if (segment.length > 20) label = "Details" // Assume long ID
                if (segment === 'universities') label = 'Universities'
                if (segment === 'users') label = 'Users'
                if (segment === 'tickets') label = 'Tickets'

                return (
                    <div key={href} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
                        {isLast ? (
                            <span className="font-medium text-gray-900">{label}</span>
                        ) : (
                            <Link href={href} className="hover:text-gray-900 transition-colors">
                                {label}
                            </Link>
                        )}
                    </div>
                )
            })}
        </nav>
    )
}
