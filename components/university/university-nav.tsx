'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Users, Zap, CalendarDays, MessageSquare, BookOpen, BarChart2, Settings, Shield, MapPin, HelpCircle, User, LogOut } from 'lucide-react'
import { UniversityAvatar } from './university-avatar'
import { ContactAdminPanel } from '@/components/layout/contact-admin-panel'
import { signOut } from 'next-auth/react'

interface NavItem {
    href: string
    label: string
    icon: React.ReactNode
    badge?: string | number
    badgeColor?: 'gold' | 'teal'
}

const NAV_ITEMS: NavItem[] = [
    { href: '/university/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { href: '/university/dashboard?tab=interests', label: 'Student Discovery', icon: <Users className="h-4.5 w-4.5" /> },
    { href: '/university/dashboard?tab=overview', label: 'Action Centre', icon: <Zap className="h-4.5 w-4.5" /> },
    { href: '/university/meetings', label: 'Meetings', icon: <CalendarDays className="h-4.5 w-4.5" /> },
    { href: '/university/engagement', label: 'Engagement', icon: <MessageSquare className="h-4.5 w-4.5" /> },
    { href: '/university/dashboard?tab=programs', label: 'Programs', icon: <BookOpen className="h-4.5 w-4.5" /> },
    { href: '/university/analytics', label: 'Analytics', icon: <BarChart2 className="h-4.5 w-4.5" /> },
    { href: '/university/settings', label: 'Settings', icon: <Settings className="h-4.5 w-4.5" /> },
]

const EXTRA_ITEMS: NavItem[] = [
    { href: '/university/proctor', label: 'Proctor Services', icon: <Shield className="h-4.5 w-4.5" /> },
    { href: '/university/fairs', label: 'Campus Fairs', icon: <MapPin className="h-4.5 w-4.5" /> },
]

interface UniversityNavProps {
    userName?: string | null
    institutionName?: string | null
    logoUrl?: string | null
    uniId?: string | null
    senderEmail?: string | null
    liveFairHref?: string | null
}

function NavContent({ userName, institutionName, logoUrl, uniId, senderEmail, liveFairHref, onClose }: UniversityNavProps & { onClose?: () => void }) {
    const pathname = usePathname()
    const [helpOpen, setHelpOpen] = useState(false)
    const [popoverOpen, setPopoverOpen] = useState(false)
    const stripRef = useRef<HTMLDivElement>(null)

    // Close popover when clicking outside
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
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--teal), var(--teal-light))', boxShadow: '0 0 0 3px rgba(13,148,136,0.3)' }}>
                    🌐
                </div>
                <div>
                    <p style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 17, lineHeight: 1.1 }}>
                        edu<span style={{ color: 'var(--gold)' }}>meetup</span>
                    </p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        University Portal
                    </p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="ml-auto text-white/50 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Live fair banner */}
            {liveFairHref && (
                <Link href={liveFairHref} className="mx-3 mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold"
                    style={{ background: 'rgba(5,150,105,0.2)', color: '#34d399' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                    LIVE Fair — Open Scanner
                </Link>
            )}

            {/* Main nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                <p className="text-[9px] font-semibold tracking-[2px] uppercase px-3 pb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Main</p>
                {NAV_ITEMS.map(item => {
                    const active = pathname === item.href || (item.href !== '/university/dashboard' && pathname.startsWith(item.href.split('?')[0]))
                    return (
                        <Link key={item.href} href={item.href} onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group"
                            style={{
                                color: active ? 'var(--teal-light)' : 'rgba(255,255,255,0.65)',
                                background: active ? 'rgba(13,148,136,0.18)' : 'transparent',
                            }}>
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 rounded-r-sm" style={{ background: 'var(--teal-light)' }} />
                            )}
                            <span className="opacity-80">{item.icon}</span>
                            {item.label}
                            {item.badge && (
                                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: item.badgeColor === 'teal' ? 'var(--teal)' : 'var(--gold)', color: item.badgeColor === 'teal' ? 'white' : 'var(--navy)' }}>
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    )
                })}

                <div className="pt-3 pb-1">
                    <p className="text-[9px] font-semibold tracking-[2px] uppercase px-3 pb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Services</p>
                    {EXTRA_ITEMS.map(item => {
                        const active = pathname.startsWith(item.href)
                        return (
                            <Link key={item.href} href={item.href} onClick={onClose}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                                style={{
                                    color: active ? 'var(--teal-light)' : 'rgba(255,255,255,0.55)',
                                    background: active ? 'rgba(13,148,136,0.18)' : 'transparent',
                                }}>
                                <span className="opacity-80">{item.icon}</span>
                                {item.label}
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Help & Contact Admin */}
            <div className="px-3 pb-1">
                <button
                    onClick={() => setHelpOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: 'rgba(255,255,255,0.5)', background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <HelpCircle className="h-4 w-4 opacity-70" />
                    Help & Contact Admin
                </button>
            </div>

            {/* Profile strip — clickable, opens popover */}
            <div ref={stripRef} className="relative">
                {/* Popover menu — appears above the strip */}
                {popoverOpen && (
                    <div
                        className="absolute bottom-full left-3 right-3 mb-2 rounded-xl overflow-hidden shadow-xl z-50"
                        style={{ background: 'var(--navy-mid)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                        <Link
                            href={uniId ? `/universities/${uniId}` : '/university/settings'}
                            onClick={() => { setPopoverOpen(false); onClose?.() }}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <User className="h-4 w-4 opacity-70" />
                            View Profile
                        </Link>
                        <Link
                            href="/university/settings"
                            onClick={() => { setPopoverOpen(false); onClose?.() }}
                            className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: 'rgba(255,255,255,0.8)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Settings className="h-4 w-4 opacity-70" />
                            Settings
                        </Link>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                            style={{ color: '#EF4444' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <LogOut className="h-4 w-4 opacity-80" />
                            Sign Out
                        </button>
                    </div>
                )}

                {/* Clickable strip */}
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
                    <UniversityAvatar logoUrl={logoUrl} name={institutionName} size={36} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-white">{userName ?? 'University'}</p>
                        <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{institutionName ?? 'University Admin'}</p>
                    </div>
                    <span className="text-white/30 text-xs">···</span>
                </button>
            </div>

            <ContactAdminPanel
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                senderName={userName ?? 'University Rep'}
                senderEmail={senderEmail ?? ''}
                senderOrg={institutionName ?? 'University'}
                portalType="University"
            />
        </div>
    )
}

export function UniversityNav(props: UniversityNavProps & { hamburgerOnly?: boolean }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const { hamburgerOnly, ...navProps } = props

    return (
        <>
            {/* Desktop sidebar — hidden when hamburgerOnly */}
            {!hamburgerOnly && (
                <aside className="hidden md:flex flex-col w-[260px] min-w-[260px] h-screen sticky top-0 overflow-hidden" style={{ background: 'var(--navy)' }}>
                    <NavContent {...navProps} />
                </aside>
            )}

            {/* Mobile hamburger button */}
            <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg text-white/80 hover:text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-label="Open navigation"
            >
                <Menu className="h-5 w-5" style={{ color: 'var(--navy)' }} />
            </button>

            {/* Mobile drawer overlay */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="relative w-[260px] h-full flex-shrink-0 shadow-2xl overflow-y-auto">
                        <NavContent {...navProps} onClose={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}
        </>
    )
}
