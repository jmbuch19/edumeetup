'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import {
    Menu, X, LayoutDashboard, Users, School,
    Ticket, Globe, Megaphone, CalendarDays,
    FileBarChart2, Sparkles, LogOut
} from 'lucide-react'

const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/admin/universities', label: 'Universities', Icon: School },
    { href: '/admin/users', label: 'Users', Icon: Users },
    { href: '/admin/meetings', label: 'Meetings', Icon: CalendarDays },
    { href: '/admin/engagement', label: 'Engagement', Icon: Megaphone },
    { href: '/admin/tickets', label: 'Support Tickets', Icon: Ticket },
    { href: '/admin/advisory', label: 'Advisory Requests', Icon: Users },
    { href: '/admin/host-requests', label: 'Host Requests', Icon: Globe },
    { href: '/admin/sponsored', label: 'Sponsored Content', Icon: Sparkles },
    { href: '/admin/reports', label: 'Reports', Icon: FileBarChart2 },
]

export function AdminMobileNav({ adminEmail }: { adminEmail?: string | null }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40">
            {/* Header bar */}
            <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
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
                <nav className="bg-white border-b border-gray-200 shadow-lg max-h-[calc(100vh-3.5rem)] overflow-y-auto divide-y divide-gray-50">
                    {navItems.map(({ href, label, Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    ))}

                    {/* Footer: email + sign out */}
                    <div className="px-4 py-3 bg-gray-50">
                        {adminEmail && (
                            <p className="text-xs text-gray-400 truncate mb-3">
                                Signed in as {adminEmail}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </nav>
            )}
        </div>
    )
}
