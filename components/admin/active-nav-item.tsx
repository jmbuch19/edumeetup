'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveNavItemProps {
    href: string
    icon: LucideIcon
    label: string
}

export function ActiveNavItem({ href, icon: Icon, label }: ActiveNavItemProps) {
    const pathname = usePathname()
    const isActive = pathname === href || pathname.startsWith(href + '/')

    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
        >
            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-gray-400')} />
            {label}
        </Link>
    )
}
