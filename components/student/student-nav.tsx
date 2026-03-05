'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LayoutDashboard, Search, Heart, FileText, CalendarDays, MessageSquare, UserCircle, Settings, HelpCircle } from 'lucide-react'
import { ContactAdminPanel } from '@/components/layout/contact-admin-panel'

const NAV_ITEMS = [
    { href: '/student/dashboard', label: 'Home', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/universities', label: 'Discover Universities', icon: <Search className="h-4 w-4" /> },
    { href: '/student/saved', label: 'Saved', icon: <Heart className="h-4 w-4" /> },
    { href: '/student/dashboard?tab=applications', label: 'My Applications', icon: <FileText className="h-4 w-4" /> },
    { href: '/student/meetings', label: 'My Meetings', icon: <CalendarDays className="h-4 w-4" /> },
    { href: '/student/messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
    { href: '/student/profile', label: 'My Profile', icon: <UserCircle className="h-4 w-4" /> },
    { href: '/student/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

interface StudentNavProps {
    userName?: string | null
    senderEmail?: string | null
    city?: string | null
}

function NavContent({ userName, senderEmail, city, onClose }: StudentNavProps & { onClose?: () => void }) {
    const pathname = usePathname()
    const [helpOpen, setHelpOpen] = useState(false)

    return (
        <div className="flex flex-col h-full" style={{ background: 'var(--navy)' }}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'var(--navy-mid)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--teal), var(--teal-light))', boxShadow: '0 0 0 3px rgba(13,148,136,0.3)' }}>
                    🌐
                </div>
                <div>
                    <p style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: 17, lineHeight: 1.1 }}>
                        edu<span style={{ color: 'var(--gold)' }}>meetup</span>
                    </p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                        Student Portal
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
                <p className="text-[9px] font-semibold tracking-[2px] uppercase px-3 pb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Main</p>
                {NAV_ITEMS.map(item => {
                    const active = pathname === item.href || (item.href !== '/student/dashboard' && pathname.startsWith(item.href.split('?')[0]))
                    return (
                        <Link key={item.href} href={item.href} onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative"
                            style={{
                                color: active ? 'var(--teal-light)' : 'rgba(255,255,255,0.65)',
                                background: active ? 'rgba(13,148,136,0.18)' : 'transparent',
                            }}>
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3/5 rounded-r-sm" style={{ background: 'var(--teal-light)' }} />
                            )}
                            <span className="opacity-80">{item.icon}</span>
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Help & Contact Admin */}
            <div className="px-3 pb-1">
                <button
                    onClick={() => setHelpOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <HelpCircle className="h-4 w-4 opacity-70" />
                    Help & Contact Admin
                </button>
            </div>

            {/* User strip */}
            <div className="px-4 py-4 border-t flex items-center gap-3" style={{ borderColor: 'var(--navy-mid)' }}>
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white border-2"
                    style={{ background: 'linear-gradient(135deg, var(--teal), var(--navy-mid))', borderColor: 'var(--teal)' }}>
                    {(userName ?? 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-white">{userName ?? 'Student'}</p>
                    <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>Student · {city ?? 'India'}</p>
                </div>
            </div>

            <ContactAdminPanel
                open={helpOpen}
                onClose={() => setHelpOpen(false)}
                senderName={userName ?? 'Student'}
                senderEmail={senderEmail ?? ''}
                senderOrg={'Student'}
                portalType="Student"
            />
        </div>
    )
}

export function StudentNav(props: StudentNavProps & { hamburgerOnly?: boolean }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const { hamburgerOnly, ...navProps } = props

    return (
        <>
            {!hamburgerOnly && (
                <aside className="hidden md:flex flex-col w-[260px] min-w-[260px] h-screen sticky top-0 overflow-hidden" style={{ background: 'var(--navy)' }}>
                    <NavContent {...navProps} />
                </aside>
            )}

            {/* Mobile hamburger */}
            <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 rounded-lg transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--navy)' }}
                aria-label="Open navigation"
            >
                <Menu className="h-5 w-5" />
            </button>

            {/* Mobile drawer */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
                    <div className="relative w-[260px] h-full shadow-2xl overflow-y-auto">
                        <NavContent {...navProps} onClose={() => setDrawerOpen(false)} />
                    </div>
                </div>
            )}
        </>
    )
}
