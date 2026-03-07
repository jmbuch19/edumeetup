'use client'

import { School, Users, CalendarDays, AlertTriangle, TrendingUp, Activity } from 'lucide-react'

interface AdminRightSidebarProps {
    totalUniversities: number
    totalStudents: number
    meetingsThisWeek: number
    pendingVerifications: number
}

export function AdminRightSidebar({
    totalUniversities,
    totalStudents,
    meetingsThisWeek,
    pendingVerifications,
}: AdminRightSidebarProps) {
    return (
        <aside className="hidden xl:flex flex-col w-[280px] min-w-[280px] h-screen sticky top-0 overflow-y-auto"
            style={{
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border-dash)',
            }}>
            <div className="p-5 space-y-6">

                {/* Header */}
                <div>
                    <p className="text-[10px] font-semibold tracking-[2px] uppercase mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Platform Health
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <StatCard
                            icon={<School className="h-4 w-4" />}
                            value={totalUniversities}
                            label="Universities"
                            color="#0d9488"
                        />
                        <StatCard
                            icon={<Users className="h-4 w-4" />}
                            value={totalStudents}
                            label="Students"
                            color="#3b82f6"
                        />
                        <StatCard
                            icon={<CalendarDays className="h-4 w-4" />}
                            value={meetingsThisWeek}
                            label="Meetings / wk"
                            color="#8b5cf6"
                        />
                        <StatCard
                            icon={<AlertTriangle className="h-4 w-4" />}
                            value={pendingVerifications}
                            label="Pending Review"
                            color={pendingVerifications > 0 ? '#f59e0b' : '#10b981'}
                            urgent={pendingVerifications > 0}
                        />
                    </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-dash)' }} />

                {/* System status */}
                <div>
                    <p className="text-[10px] font-semibold tracking-[2px] uppercase mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        System Status
                    </p>
                    <div className="space-y-2">
                        <StatusRow label="API" status="Operational" ok />
                        <StatusRow label="Email (Resend)" status="Operational" ok />
                        <StatusRow label="Storage (R2)" status="Operational" ok />
                        <StatusRow label="DB (Neon)" status="Operational" ok />
                    </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-dash)' }} />

                {/* Quick links */}
                <div>
                    <p className="text-[10px] font-semibold tracking-[2px] uppercase mb-3"
                        style={{ color: 'var(--text-muted)' }}>
                        Quick Actions
                    </p>
                    <div className="space-y-1">
                        <QuickLink href="/admin/universities?filter=PENDING" label="Review Pending Universities" urgent={pendingVerifications > 0} />
                        <QuickLink href="/admin/users" label="Manage Users" />
                        <QuickLink href="/admin/engagement" label="Send Notification" />
                        <QuickLink href="/admin/reports" label="Download Reports" />
                    </div>
                </div>

            </div>
        </aside>
    )
}

function StatCard({ icon, value, label, color, urgent }: {
    icon: React.ReactNode
    value: number
    label: string
    color: string
    urgent?: boolean
}) {
    return (
        <div className="rounded-xl p-3 relative overflow-hidden"
            style={{
                background: 'white',
                border: urgent ? `1px solid ${color}40` : '1px solid var(--border-dash)',
                boxShadow: urgent ? `0 0 0 2px ${color}20` : undefined,
            }}>
            <div className="flex items-center gap-1.5 mb-1.5" style={{ color }}>
                {icon}
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--navy)', fontFamily: 'var(--font-display)' }}>
                {value.toLocaleString()}
            </p>
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
    )
}

function StatusRow({ label, status, ok }: { label: string; status: string; ok: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: ok ? '#10b981' : '#ef4444' }}>
                <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {status}
            </span>
        </div>
    )
}

function QuickLink({ href, label, urgent }: { href: string; label: string; urgent?: boolean }) {
    return (
        <a href={href}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
                color: urgent ? '#f59e0b' : 'var(--text-muted)',
                background: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(13,148,136,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <TrendingUp className="h-3 w-3 shrink-0" style={{ color: urgent ? '#f59e0b' : 'var(--teal)' }} />
            {label}
        </a>
    )
}
