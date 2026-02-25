'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Calendar, BarChart3, Clock, Users } from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard,
    Calendar,
    BarChart3,
    Clock,
    Users,
}

interface NavItem {
    href: string
    label: string
    icon: string
}

export function UniversityMobileNav({ navItems }: { navItems: NavItem[] }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden">
            {/* Header bar */}
            <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
                <span className="text-lg font-bold text-primary">University Portal</span>
                <button
                    onClick={() => setOpen(prev => !prev)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>

            {/* Slide-down nav panel */}
            {open && (
                <nav className="border-b border-gray-200 bg-white shadow-sm">
                    {navItems.map((item) => {
                        const Icon = ICON_MAP[item.icon] ?? LayoutDashboard
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>
            )}
        </div>
    )
}
