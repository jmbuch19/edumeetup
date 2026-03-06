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

export function NotificationsCenter({ userRole }: { userRole: string }) {
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
                                <div className="text-center py-8 text-muted-foreground">You're all caught up!</div>
                            ) : (
                                /* Scrollable list — max 5 items, max-height 400px */
                                <div
                                    className="space-y-3 overflow-y-auto pr-1"
                                    style={{ maxHeight: '400px' }}
                                >
                                    {visible.map(n => {
                                        // FAIR_INVITE notifications get a special action card
                                        if (n.type === 'FAIR_INVITE') {
                                            const meta = n.metadata as Record<string, string> | null
                                            const fairEventId = meta?.fairEventId
                                            const fair = fairEventId ? data.fairEventsMap[fairEventId] : null
                                            const invitation = fairEventId ? data.fairInvitationMap[fairEventId] ?? null : null
                                            if (!fair) return null // fair deleted or not found
                                            return (
                                                <div key={n.id}>
                                                    <CampusFairInviteCard
                                                        notification={{ id: n.id, createdAt: n.createdAt, metadata: meta }}
                                                        invitation={invitation}
                                                        fair={fair}
                                                        programs={data.universityPrograms}
                                                    />
                                                </div>
                                            )
                                        }

                                        // Generic notification card
                                        return (
                                            <div
                                                key={n.id}
                                                className="p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                                            >
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="flex gap-3 min-w-0">
                                                        <div className="mt-1 p-2 rounded-full bg-blue-100 text-blue-600 shrink-0">
                                                            <Bell className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold text-sm">{n.title}</h4>
                                                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.message}</p>
                                                            <div className="text-xs text-muted-foreground mt-2">
                                                                {new Date(n.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Dismiss ✕ */}
                                                    <button
                                                        onClick={() => handleDismiss(n.id)}
                                                        title="Dismiss"
                                                        className="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-muted-foreground hover:text-foreground transition-colors"
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
                                <div className="text-center py-8 text-muted-foreground">No active announcements.</div>
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
