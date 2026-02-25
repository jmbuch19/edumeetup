'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Users, School, Ticket, Globe } from 'lucide-react'

const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/universities', label: 'Universities', Icon: School },
    { href: '/admin/users', label: 'Users', Icon: Users },
    { href: '/admin/tickets', label: 'Support Tickets', Icon: Ticket },
    { href: '/admin/advisory', label: 'Advisory Requests', Icon: Users },
    { href: '/admin/host-requests', label: 'Host Requests', Icon: Globe },
]

export function AdminMobileNav({ adminEmail }: { adminEmail?: string | null }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden">
            {/* Header bar */}
            <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 sticky top-0 z-40">
                <Link href="/" className="flex items-center gap-2">
                    <span className="font-bold text-lg text-primary tracking-tight">edUmeetup</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Admin</span>
                </Link>
                <button
                    onClick={() => setOpen(prev => !prev)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </header>

            {/* Slide-down nav drawer */}
            {open && (
                <nav className="border-b border-gray-200 bg-white shadow-sm divide-y divide-gray-50">
                    {navItems.map(({ href, label, Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    ))}
                    {adminEmail && (
                        <div className="px-4 py-3 text-xs text-gray-400 truncate">
                            Signed in as {adminEmail}
                        </div>
                    )}
                </nav>
            )}
        </div>
    )
}
