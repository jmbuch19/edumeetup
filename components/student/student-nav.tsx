'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Settings, User, LogOut, HelpCircle } from 'lucide-react'
import { ContactAdminPanel } from '@/components/layout/contact-admin-panel'
import { signOut } from 'next-auth/react'

const NAV_ITEMS = [
    { href: '/student/dashboard', label: 'Dashboard' },
    { href: '/universities', label: 'Discover' },
    { href: '/student/saved', label: 'Saved' },
    { href: '/student/meetings', label: 'Meetings' },
    { href: '/student/messages', label: 'Messages' },
]

interface StudentNavProps {
    userName?: string | null
    senderEmail?: string | null
    city?: string | null
    hamburgerOnly?: boolean
}

export function StudentNav({ userName, senderEmail, city, hamburgerOnly }: StudentNavProps) {
    const pathname = usePathname()
    const [helpOpen, setHelpOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!popoverOpen) return
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setPopoverOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [popoverOpen])

    if (hamburgerOnly) return null // Obsolete, top nav handles mobile natively now

    return (
        <header className="h-[64px] bg-indigo-gradient flex items-center justify-between px-6 shrink-0 shadow-md relative z-50">
            <div className="flex items-center gap-8 h-full">
                {/* ── Logo ── */}
                <Link href="/student/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
                    <span className="text-white font-heading font-[900] text-2xl tracking-tight">Edu</span>
                    <span style={{ color: '#C9A84C' }} className="font-heading font-[900] text-2xl tracking-tight">meetup</span>
                </Link>

                {/* ── Desktop Nav ── */}
                <nav className="hidden md:flex items-center gap-2 h-full">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href))
                        return (
                            <Link key={item.href} href={item.href}
                                className={`
                                    h-full flex items-center px-4 text-sm font-medium transition-colors relative
                                    ${active ? 'text-white' : 'text-indigo-200 hover:text-[#C9A84C]'}
                                `}
                            >
                                {item.label}
                                {active && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: '#C9A84C' }} />
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* ── Right Actions ── */}
            <div className="flex items-center gap-5">
                {/* Optional Help Action in Top right */}
                <button onClick={() => setHelpOpen(true)} className="hidden md:flex items-center gap-2 text-indigo-200 hover:text-white transition-colors text-sm font-medium">
                    <HelpCircle className="h-4 w-4" />
                    Help
                </button>

                <div className="relative" ref={popoverRef}>
                    <button
                        onClick={() => setPopoverOpen(p => !p)}
                        className="w-10 h-10 rounded-full flex items-center justify-center font-body font-bold text-lg hover-lift focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A84C]"
                        style={{ backgroundColor: '#C9A84C', color: '#0B1340' }}
                        aria-label="User menu"
                    >
                        {(userName ?? 'S').charAt(0).toUpperCase()}
                    </button>

                    {/* Desktop Dropdown */}
                    {popoverOpen && (
                        <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden z-50 animate-pop">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <p className="text-sm font-bold text-indigo-900 truncate">{userName ?? 'Student'}</p>
                                <p className="text-xs text-gray-500 truncate">{city ?? 'Student'}</p>
                            </div>
                            <div className="py-1">
                                <Link href="/student/profile" onClick={() => setPopoverOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <User className="h-4 w-4 text-gray-400" />
                                    My Profile
                                </Link>
                                <Link href="/student/settings" onClick={() => setPopoverOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Settings className="h-4 w-4 text-gray-400" />
                                    Settings
                                </Link>
                            </div>
                            <div className="border-t border-gray-100 py-1" />
                            <button
                                onClick={() => signOut({ callbackUrl: '/' })}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>

                <button className="md:hidden text-white hover:text-indigo-200 transition-colors" onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="h-6 w-6" />
                </button>
            </div>

            {/* ── Mobile Nav Overlay ── */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-indigo-900/40 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute top-0 right-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                            <span className="font-heading font-[900] text-xl text-indigo-900">Edu<span style={{ color: '#C9A84C' }}>meetup</span></span>
                            <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-900">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4">
                            {NAV_ITEMS.map((item) => {
                                const active = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href))
                                return (
                                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-6 py-3 font-medium text-lg ${active ? 'text-indigo-900 bg-indigo-50/50 border-l-4 border-l-[#C9A84C]' : 'text-gray-600 border-l-4 border-l-transparent'}`}
                                    >
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto">
                            <button onClick={() => { setMobileMenuOpen(false); setHelpOpen(true) }} className="flex items-center gap-3 w-full py-2 text-gray-600 font-medium font-sm mb-4">
                                <HelpCircle className="h-5 w-5" /> Help
                            </button>
                            <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-3 w-full py-2 text-red-600 font-medium font-sm">
                                <LogOut className="h-5 w-5" /> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ContactAdminPanel
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                senderName={userName ?? 'Student'}
                senderEmail={senderEmail ?? ''}
                senderOrg={'Student'}
                portalType="Student"
            />
        </header>
    )
}
