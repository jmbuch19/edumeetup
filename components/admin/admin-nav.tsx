'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Menu, X, LayoutDashboard, Users, School, Globe,
    Megaphone, CalendarDays, FileBarChart2, Sparkles,
    QrCode, LogOut, User, Settings, HelpCircle, GraduationCap, MessageSquare
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const NAV_SECTIONS = [
    {
        label: 'Main',
        items: [
            { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
            { href: '/admin/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
            { href: '/admin/universities', label: 'Universities', icon: <School className="h-4 w-4" /> },
        ]
    },
    {
        label: 'Operations',
        items: [
            { href: '/admin/advisory', label: 'Advisory Requests', icon: <Users className="h-4 w-4" /> },
            { href: '/admin/host-requests', label: 'Host Requests', icon: <Globe className="h-4 w-4" /> },
            { href: '/admin/fairs', label: 'Fair Events', icon: <QrCode className="h-4 w-4" /> },
            { href: '/admin/fairs/circuits', label: 'Fair Circuits', icon: <Globe className="h-4 w-4" /> },
            { href: '/admin/engagement', label: 'Engagement', icon: <Megaphone className="h-4 w-4" /> },
            { href: '/admin/alumni', label: 'Alumni Bridge', icon: <GraduationCap className="h-4 w-4" style={{ color: '#D97706' }} /> },
        ]
    },
    {
        label: 'Insights',
        items: [
            { href: '/admin/overview', label: 'Overview', icon: <CalendarDays className="h-4 w-4" /> },
            { href: '/admin/reports', label: 'Reports', icon: <FileBarChart2 className="h-4 w-4" /> },
            { href: '/admin/bot-leads', label: 'Bot Leads', icon: <MessageSquare className="h-4 w-4" /> },
            { href: '/admin/engagement?tab=sponsored', label: 'Sponsored Content', icon: <Sparkles className="h-4 w-4" /> },
            { href: '/admin/surveys', label: 'Survey Feedback', icon: <MessageSquare className="h-4 w-4" /> },
        ]
    },
]

interface AdminNavProps {
    adminName?: string | null
    adminEmail?: string | null
    hamburgerOnly?: boolean
}

function NavContent({ adminName, adminEmail, onClose }: AdminNavProps & { onClose?: () => void }) {
    const pathname = usePathname()
    const [popoverOpen, setPopoverOpen] = useState(false)
    const stripRef = useRef<HTMLDivElement>(null)
    const adminInitial = (adminName ?? 'A').charAt(0).toUpperCase()

    useEffect(() => {
        if (!popoverOpen) return
        const handler = (e: MouseEvent) => {
            if (stripRef.current && !stripRef.current.contains(e.target as Node)) {
                setPopoverOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [popoverOpen])

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--navy)' }}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--navy-mid)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#3B3FCC' }}>
                    <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <p style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 17, lineHeight: 1.1 }}>
                            Ed<span style={{ color: 'var(--gold)' }}>U</span>meetup
                        </p>
                        {/* Gold ADMIN badge */}
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--gold)', color: 'var(--navy)', letterSpacing: '0.5px' }}>
                            ADMIN
                        </span>
                    </div>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        Where Dreams Meet Destinations
                    </p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="ml-auto text-white/50 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {NAV_SECTIONS.map(section => (
                    <div key={section.label} className="pb-3">
                        <p className="text-[9px] font-semibold tracking-[2px] uppercase px-3 pb-2"
                            style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {section.label}
                        </p>
                        {section.items.map(item => {
                            const active = pathname === item.href || (
                                item.href !== '/admin/dashboard' && pathname.startsWith(item.href)
                            )
                            return (
                                <Link key={item.href} href={item.href} onClick={onClose}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative"
                                    style={{
                                        color: active ? 'var(--teal-light)' : 'rgba(255,255,255,0.65)',
                                        background: active ? 'rgba(13,148,136,0.18)' : 'transparent',
                                    }}>
                                    {active && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 rounded-r-sm"
                                            style={{ background: 'var(--teal-light)' }} />
                                    )}
                                    <span className="opacity-80">{item.icon}</span>
                                    {item.label}
                                </Link>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {/* Profile strip with popover */}
            <div ref={stripRef} className="relative">
                {popoverOpen && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl overflow-hidden shadow-xl z-50"
                        style={{ background: 'var(--navy-mid)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <Link href="/admin/dashboard"
                            onClick={() => { setPopoverOpen(false); onClose?.() }}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <User className="h-4 w-4 opacity-70" /> Admin Profile
                        </Link>
                        <Link href="/admin/settings"
                            onClick={() => { setPopoverOpen(false); onClose?.() }}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <Settings className="h-4 w-4 opacity-70" /> Settings
                        </Link>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                        <button onClick={() => signOut({ callbackUrl: '/' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: '#EF4444' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <LogOut className="h-4 w-4 opacity-80" /> Sign Out
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setPopoverOpen(p => !p)}
                    className="w-full px-4 py-4 border-t flex items-center gap-3 transition-colors text-left"
                    style={{
                        borderColor: 'var(--navy-mid)',
                        background: popoverOpen ? 'rgba(255,255,255,0.05)' : 'transparent',
                    }}
                    aria-label="Account menu"
                    aria-expanded={popoverOpen}
                >
                    <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white border-2"
                        style={{ background: 'linear-gradient(135deg, var(--gold), #b45309)', borderColor: 'var(--gold)' }}>
                        {adminInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-white">{adminName ?? 'Admin'}</p>
                        <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{adminEmail ?? ''}</p>
                    </div>
                    <span className="text-white/30 text-xs">···</span>
                </button>
            </div>
        </div>
    )
}

export function AdminNav({ adminName, adminEmail, hamburgerOnly }: AdminNavProps) {
    const [drawerOpen, setDrawerOpen] = useState(false)

    return (
        <>
            {/* Desktop sidebar */}
            {!hamburgerOnly && (
                <aside className="hidden md:flex flex-col w-[260px] min-w-[260px] h-screen sticky top-0 overflow-hidden"
                    style={{ background: 'var(--navy)' }}>
                    <NavContent adminName={adminName} adminEmail={adminEmail} />
                </aside>
            )}

            {/* Mobile hamburger */}
            <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg text-white/80 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="Open navigation"
            >
                <Menu className="h-5 w-5" style={{ color: 'var(--navy)' }} />
            </button>

            {/* Mobile drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="relative w-[260px] h-full flex-shrink-0 shadow-2xl overflow-y-auto">
                        <NavContent adminName={adminName} adminEmail={adminEmail} onClose={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}
        </>
    )
}
