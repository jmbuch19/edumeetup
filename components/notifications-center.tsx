'use client'

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    getUserNotifications,
    dismissNotification,
    dismissAllNotifications,
} from "@/app/notifications/actions"
import { Bell, Megaphone, ExternalLink, X } from "lucide-react"
import { CampusFairInviteCard } from "@/components/university/CampusFairInviteCard"


interface NotificationsCenterProps {
    userRole: string
    invitationByFairId?: Record<string, any>
    programs?: { id: string; programName: string }[]
}

export function NotificationsCenter({ userRole, invitationByFairId, programs }: NotificationsCenterProps) {
    const [data, setData] = useState<{
        notifications: any[]
        announcements: any[]
        sponsored: any[]
        fairInvitationMap: Record<string, { id: string; status: 'PENDING' | 'CONFIRMED' | 'DECLINED'; respondedAt: string | null }>
        fairEventsMap: Record<string, any>
        universityPrograms: { id: string; name: string; degreeLevel: string | null }[]
    }>({
        notifications: [], announcements: [], sponsored: [],
        fairInvitationMap: {}, fairEventsMap: {}, universityPrograms: [],
    })
    const [loading, setLoading] = useState(true)

    const notifType: "STUDENT" | "UNIVERSITY" = userRole === "STUDENT" ? "STUDENT" : "UNIVERSITY"

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        const res = await getUserNotifications()
        setData(res)
        setLoading(false)
    }

    // ── Dismiss single — optimistic removal ───────────────────────────────
    async function handleDismiss(id: string) {
        setData(prev => ({
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== id)
        }))
        await dismissNotification(id, notifType)
    }

    // ── Mark all as read — optimistic clear ───────────────────────────────
    async function handleMarkAllRead() {
        setData(prev => ({ ...prev, notifications: [] }))
        await dismissAllNotifications(notifType)
    }

    if (loading) return (
        <div className="p-4 text-center text-muted-foreground">Loading updates...</div>
    )

    // Show only first 5 undismissed (fetch already filters isRead=false)
    const visible = data.notifications.slice(0, 5)
    const hasMore = data.notifications.length > 5

    return (
        <div className="space-y-6">
            {/* Sponsored Banner (Top Placement) */}
            {data.sponsored.filter(s => s.placement === "BANNER").map(s => (
                <div key={s.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 p-4 rounded-lg border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {s.imageUrl && <img src={s.imageUrl} alt={s.title} className="h-12 w-12 rounded object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                        <div>
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sponsored by {s.partnerName}</div>
                            <div className="font-medium">{s.title}</div>
                        </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                        <a href={s.targetUrl} target="_blank" rel="noreferrer">
                            View <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                    </Button>
                </div>
            ))}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="notifications">
                        <TabsList>
                            <TabsTrigger value="notifications" className="relative">
                                Notifications
                                {data.notifications.length > 0 && (
                                    <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                        {data.notifications.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="announcements">Announcements</TabsTrigger>
                        </TabsList>

                        <TabsContent value="notifications" className="pt-4">
                            {/* Panel header with Mark all as read */}
                            {data.notifications.length > 0 && (
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-sm text-muted-foreground">
                                        {data.notifications.length} unread
                                    </p>
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                    >
                                        Mark all as read
                                    </button>
                                </div>
                            )}

                            {data.notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-[#E8EAF6] mt-4" style={{ backgroundColor: '#F0F2FF' }}>
                                    <Bell className="h-12 w-12 mb-4 animate-float" style={{ color: '#C9A84C' }} />
                                    <h3 className="mb-2" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#0B1340' }}>You're all caught up!</h3>
                                    <p className="max-w-sm" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#888888' }}>
                                        When universities or advisors reach out to you, their messages will securely appear here.
                                    </p>
                                </div>
                            ) : (
                                /* Scrollable list — max 5 items, max-height 400px */
                                <div
                                    className="space-y-3 overflow-y-auto pr-1"
                                    style={{ maxHeight: '400px' }}
                                >
                                    {visible.map(n => {
                                        if (n.type === 'FAIR_INVITE') {
                                            const meta = n.metadata as Record<string, string> | null
                                            const fairEventId = meta?.fairEventId

                                            // Prop-based path: use SSR data passed from dashboard page
                                            if (invitationByFairId && fairEventId) {
                                                const invitation = invitationByFairId[fairEventId] ?? null
                                                return (
                                                    <CampusFairInviteCard
                                                        key={n.id}
                                                        notification={n}
                                                        invitation={invitation}
                                                        fairEvent={invitation?.fairEvent ?? null}
                                                        programs={programs ?? []}
                                                    />
                                                )
                                            }

                                            // Fallback: use internally fetched maps (when props not provided)
                                            const invitation = fairEventId ? data.fairInvitationMap[fairEventId] ?? null : null
                                            const fairEvent = fairEventId ? data.fairEventsMap[fairEventId] ?? null : null
                                            if (!fairEvent) return null
                                            return (
                                                <div key={n.id}>
                                                    <CampusFairInviteCard
                                                        notification={{ id: n.id, createdAt: n.createdAt, metadata: meta }}
                                                        invitation={invitation}
                                                        fairEvent={fairEvent}
                                                        programs={data.universityPrograms}
                                                    />
                                                </div>
                                            )
                                        }

                                        // Generic notification card
                                        const isUnread = !n.isRead && !n.readAt
                                        const isAlumni = n.type === 'ALUMNI_MILESTONE'

                                        return (
                                            <div
                                                key={n.id}
                                                className={`rounded-lg relative overflow-hidden transition-all ${isUnread ? 'animate-pop shadow-sm' : ''} ${isAlumni ? 'p-5' : 'p-4'}`}
                                                style={{ 
                                                    backgroundColor: isUnread ? '#FDF6E3' : '#FFFFFF', 
                                                    borderLeft: isUnread ? '3px solid #C9A84C' : '1px solid #E8EAF6',
                                                    ...(isUnread ? { borderTop: '1px solid rgba(201,168,76,0.3)', borderRight: '1px solid rgba(201,168,76,0.3)', borderBottom: '1px solid rgba(201,168,76,0.3)' } : { border: '1px solid #E8EAF6' })
                                                }}
                                            >
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex gap-4 min-w-0">
                                                        {!isAlumni && (
                                                            <div className="mt-1 p-2 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(201,168,76,0.2)', color: '#A8873A' }}>
                                                                <Bell className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            {isAlumni && (
                                                                <div className="mb-2">
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-[700]" style={{ backgroundColor: '#C9A84C', color: '#0B1340', fontFamily: 'var(--font-jakarta)' }}>
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-gold"></span>
                                                                        Alumni Update
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <h4 className="leading-tight mb-1" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 15, color: '#0B1340' }}>{n.title}</h4>
                                                            <p className="whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#444444' }}>{n.message}</p>
                                                            <div className="mt-2" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 12, color: '#888888' }}>
                                                                {new Date(n.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Dismiss ✕ */}
                                                    <button
                                                        onClick={() => handleDismiss(n.id)}
                                                        title="Dismiss"
                                                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-black/5 text-[#888888] hover:text-[#0B1340] transition-colors"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) // close generic card return
                                    })}
                                    {hasMore && (
                                        <p className="text-xs text-center text-muted-foreground pt-1">
                                            + {data.notifications.length - 5} more — scroll to see all
                                        </p>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="announcements" className="space-y-4 pt-4">
                            {data.announcements.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-12 rounded-2xl border border-[#E8EAF6]" style={{ backgroundColor: '#F0F2FF' }}>
                                    <Megaphone className="h-12 w-12 mb-4 animate-float" style={{ color: '#C9A84C' }} />
                                    <h3 className="mb-2" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#0B1340' }}>No active announcements</h3>
                                    <p className="max-w-sm" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#888888' }}>
                                        Check back later for platform-wide updates and special event alerts.
                                    </p>
                                </div>
                            ) : (
                                data.announcements.map(a => (
                                    <div key={a.id} className="p-4 rounded-lg border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-800">
                                        <div className="flex gap-3">
                                            <div className="mt-1 p-2 rounded-full bg-yellow-100 text-yellow-600">
                                                <Megaphone className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-sm">{a.title}</h4>
                                                    {a.priority === "HIGH" && (
                                                        <Badge variant="destructive" className="text-[10px] h-5">Urgent</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.content}</p>
                                                <div className="text-xs text-muted-foreground mt-2">
                                                    {new Date(a.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="space-y-6">
                    {/* Sidebar Sponsored Content */}
                    {data.sponsored.filter(s => s.placement === "SIDEBAR").map(s => (
                        <Card key={s.id} className="overflow-hidden">
                            <div className="w-full h-32 bg-slate-100 relative">
                                {s.imageUrl && <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                            </div>
                            <CardContent className="p-4">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Sponsored by {s.partnerName}</div>
                                <h4 className="font-bold mb-2">{s.title}</h4>
                                <Button className="w-full" variant="outline" asChild>
                                    <a href={s.targetUrl} target="_blank" rel="noreferrer">
                                        Learn More <ExternalLink className="ml-2 h-3 w-3" />
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
