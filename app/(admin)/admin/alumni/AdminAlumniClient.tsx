'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { adminApproveAlumni, adminSuspendAlumni, adminNudgeAlumni } from '@/app/actions/alumni'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
    GraduationCap, CheckCircle, Ban, Clock, Users, Search,
    Mail, Linkedin, ExternalLink, Bell
} from 'lucide-react'

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    STUDENT_CURRENTLY: { label: 'Studying',       class: 'bg-blue-100 text-blue-700' },
    OPT_CPT:           { label: 'OPT/CPT',         class: 'bg-purple-100 text-purple-700' },
    H1B_OTHER:         { label: 'H1B/Other',        class: 'bg-green-100 text-green-700' },
    FURTHER_STUDIES:   { label: 'Further Studies',  class: 'bg-indigo-100 text-indigo-700' },
    OTHER:             { label: 'Other',            class: 'bg-gray-100 text-gray-600' },
}

function AlumniRow({ alum, onAction }: { alum: any; onAction: () => void }) {
    const [suspendOpen, setSuspendOpen] = useState(false)
    const [suspendReason, setSuspendReason] = useState('')
    const [isPending, startTransition] = useTransition()
    const statusBadge = STATUS_BADGE[alum.alumniStatus]

    const handleApprove = () => {
        startTransition(async () => {
            const res = await adminApproveAlumni(alum.id)
            if ('error' in res) toast.error(res.error)
            else { toast.success('Alumni approved'); onAction() }
        })
    }

    const handleSuspend = () => {
        if (!suspendReason.trim()) { toast.error('Please provide a reason'); return }
        startTransition(async () => {
            const res = await adminSuspendAlumni(alum.id, suspendReason)
            if ('error' in res) toast.error(res.error)
            else { toast.success('Alumni suspended'); setSuspendOpen(false); onAction() }
        })
    }

    const handleNudge = () => {
        startTransition(async () => {
            const res = await adminNudgeAlumni(alum.id)
            if ('error' in res) toast.error(res.error)
            else { toast.success('Nudge email sent!'); onAction() }
        })
    }

    return (
        <>
            <div className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-amber-100 hover:bg-amber-50/30 transition-all">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(alum.user?.name ?? 'A')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{alum.user?.name}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge?.class}`}>
                            {statusBadge?.label}
                        </span>
                        {alum.adminReviewStatus === 'PENDING_REVIEW' && (
                            <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-600">Pending Review</Badge>
                        )}
                        {alum.adminReviewStatus === 'APPROVED' && (
                            <Badge variant="outline" className="text-[10px] border-green-200 text-green-600">Approved</Badge>
                        )}
                        {alum.adminReviewStatus === 'SUSPENDED' && (
                            <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{alum.usProgram} · {alum.usUniversityName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">{alum.user?.email}</p>
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-gray-200 text-gray-400 font-medium">Admin only</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{alum._count?.connectRequests ?? 0} requests</span>
                    {alum.linkedinUrl && (
                        <a href={alum.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:text-sky-600">
                            <Linkedin className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                    <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${alum.user?.email}`)}
                        className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50">
                        <Mail className="w-3 h-3 mr-1" /> Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleNudge} disabled={isPending}
                        className="h-7 text-xs border-amber-200 text-amber-600 hover:bg-amber-50">
                        <Bell className="w-3 h-3 mr-1" /> Nudge
                    </Button>
                    {alum.adminReviewStatus !== 'APPROVED' && (
                        <Button size="sm" onClick={handleApprove} disabled={isPending}
                            className="h-7 text-xs bg-green-500 hover:bg-green-600 text-white border-0">
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                    )}
                    {alum.adminReviewStatus !== 'SUSPENDED' && (
                        <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)} disabled={isPending}
                            className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50">
                            <Ban className="w-3 h-3 mr-1" /> Suspend
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Suspend {alum.user?.name}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will remove them from student discovery immediately. Provide a reason for your records.
                    </p>
                    <Textarea
                        placeholder="Reason for suspension (e.g. Could not verify IAES background)"
                        value={suspendReason}
                        onChange={e => setSuspendReason(e.target.value)}
                        rows={3}
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSuspendOpen(false)}>Cancel</Button>
                        <Button onClick={handleSuspend} disabled={isPending}
                            className="bg-red-500 hover:bg-red-600 text-white border-0 flex-1">
                            Confirm Suspend
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default function AdminAlumniClient({ pending, all, stats }: {
    pending: any[]
    all: any[]
    stats: { total: number; pendingReview: number; approved: number; suspended: number; connectRequests: number } | null
}) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [refreshKey, setRefreshKey] = useState(0)
    const onAction = () => setRefreshKey(k => k + 1)

    const filtered = all.filter(a => {
        if (statusFilter !== 'ALL' && a.alumniStatus !== statusFilter) return false
        if (!search) return true
        const q = search.toLowerCase()
        return a.user?.name?.toLowerCase().includes(q) ||
               a.user?.email?.toLowerCase().includes(q) ||
               a.usUniversityName?.toLowerCase().includes(q)
    })

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <GraduationCap className="w-6 h-6 text-amber-600" />
                <h1 className="text-2xl font-bold text-gray-900">Alumni Management</h1>
                <Badge className="ml-auto bg-amber-100 text-amber-700 border border-amber-200 text-xs">
                    IAES Alumni Bridge
                </Badge>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    {[
                        { label: 'Total Alumni', value: stats.total, icon: Users, color: 'text-gray-700' },
                        { label: 'Pending Review', value: stats.pendingReview, icon: Clock, color: 'text-amber-600' },
                        { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600' },
                        { label: 'Suspended', value: stats.suspended, icon: Ban, color: 'text-red-500' },
                        { label: 'Connect Requests', value: stats.connectRequests, icon: Mail, color: 'text-blue-600' },
                    ].map(s => (
                        <Card key={s.label} className="border-0 shadow-sm">
                            <CardContent className="p-3 text-center">
                                <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                                <p className="text-[10px] text-gray-500">{s.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                    <TabsTrigger value="pending">
                        Pending Review
                        {pending.length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 text-xs bg-amber-100 text-amber-700">{pending.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="all">All Alumni</TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    {pending.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">All alumni have been reviewed</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pending.map(a => <AlumniRow key={a.id} alum={a} onAction={onAction} />)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="all">
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input className="pl-9" placeholder="Search by name, email, or university..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select 
                            className="h-9 rounded-md border border-gray-200 px-3 text-sm bg-white min-w-[150px]"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.entries(STATUS_BADGE).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                    </div>
                    {filtered.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No alumni found</p>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(a => <AlumniRow key={a.id} alum={a} onAction={onAction} />)}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
