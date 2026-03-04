'use client'

import { useState, useMemo, useCallback, useTransition } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
    Download, Search, Users, Mail, MessageCircle, UserCheck,
    Send, Calendar, ChevronRight, Loader2, CheckCircle2,
    Activity, BarChart2,
} from 'lucide-react'
import {
    updateFollowUpStatus,
    sendBulkFollowUp,
    exportLeadsCSV,
    requestMeetingsWithLeads,
} from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────
type FollowUpStatus = 'PENDING' | 'CONTACTED' | 'APPLIED' | 'REJECTED'

type LeadPass = {
    id: string
    email: string
    fullName: string | null
    phone: string | null
    currentInstitution: string | null
    currentCourse: string | null
    yearOfPassing: number | null
    fieldOfInterest: string | null
    budgetRange: string | null
    preferredCountries: string | null
    isPartialProfile: boolean
    emailConsent: boolean
    whatsappConsent: boolean
    studentId: string | null
}

export type Lead = {
    id: string
    scannedAt: string          // serialized from scannedAt Date
    matchedPrograms: string[]
    repNotes: string | null
    emailSent: boolean
    whatsappSent: boolean
    followUpStatus: string
    pass: LeadPass
}

export type FairEventData = {
    id: string
    name: string
    city: string | null
    venue: string | null
    startDate: string
    endDate: string
    endedAt: string | null
    status: string
}

interface FairReportDashboardProps {
    fairEvent: FairEventData
    leads: Lead[]
    universityId: string
    universityName: string
}

// ── Status helpers ─────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
    PENDING: 'border-gray-300 text-gray-600 bg-gray-50',
    CONTACTED: 'border-blue-300 text-blue-700 bg-blue-50',
    APPLIED: 'border-emerald-300 text-emerald-700 bg-emerald-50',
    REJECTED: 'border-red-300 text-red-700 bg-red-50',
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8']

// ── Side panel ────────────────────────────────────────────────────────────────
function LeadDetailSheet({
    lead,
    open,
    onClose,
}: {
    lead: Lead | null
    open: boolean
    onClose: () => void
}) {
    if (!lead) return null
    const p = lead.pass
    const rows = [
        ['Email', p.email],
        ['Phone', p.phone],
        ['Institution', p.currentInstitution],
        ['Course', p.currentCourse],
        ['Year of Passing', p.yearOfPassing?.toString()],
        ['Field of Interest', p.fieldOfInterest],
        ['Budget Range', p.budgetRange],
        ['Preferred Countries', p.preferredCountries],
        ['Email Consent', p.emailConsent ? '✅ Yes' : '❌ No'],
        ['WhatsApp Consent', p.whatsappConsent ? '✅ Yes' : '❌ No'],
        ['Profile Type', p.isPartialProfile ? 'Walk-in' : 'Registered'],
        ['Scanned At', new Date(lead.scannedAt).toLocaleString()],
    ]

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl">{p.fullName ?? 'Unknown Student'}</SheetTitle>
                    <p className="text-sm text-gray-500">{p.currentCourse}</p>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                    {/* Detail rows */}
                    <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                        {rows.map(([label, value]) =>
                            value ? (
                                <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-gray-500 font-medium">{label}</span>
                                    <span className="text-gray-900 text-right max-w-[55%]">{value}</span>
                                </div>
                            ) : null,
                        )}
                    </div>

                    {/* Matched programs */}
                    {lead.matchedPrograms.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                                Matched Programs
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {lead.matchedPrograms.map((prog) => (
                                    <Badge key={prog} variant="secondary" className="bg-indigo-50 text-indigo-800 text-xs">
                                        {prog}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rep notes */}
                    {lead.repNotes && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rep Notes</p>
                            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                                {lead.repNotes}
                            </p>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}

// ── Meeting request modal ─────────────────────────────────────────────────────
function MeetingRequestModal({
    leads,
    open,
    onClose,
    universityId,
}: {
    leads: Lead[]
    open: boolean
    onClose: () => void
    universityId: string
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState<number | null>(null)
    const eligibleLeads = leads.filter((l) => l.pass.studentId)

    const toggle = (id: string) =>
        setSelected((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    const handleRequest = async () => {
        setLoading(true)
        const result = await requestMeetingsWithLeads([...selected], universityId)
        setLoading(false)
        setDone(result.created)
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Request Follow-up Meetings</DialogTitle>
                </DialogHeader>

                {done !== null ? (
                    <div className="py-8 flex flex-col items-center gap-3 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        <p className="font-semibold text-gray-900">{done} meeting{done !== 1 ? 's' : ''} created as Draft</p>
                        <p className="text-sm text-gray-500">
                            You can find and confirm them in your Meetings dashboard.
                        </p>
                        <Button onClick={onClose} className="mt-2 w-full rounded-xl">Done</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Select registered students to request 30-min follow-up meetings (scheduled 1 week out, status: Draft).
                        </p>
                        {eligibleLeads.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">
                                No registered students available (walk-ins have no account).
                            </p>
                        ) : (
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                {eligibleLeads.map((lead) => (
                                    <div
                                        key={lead.id}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer"
                                        onClick={() => toggle(lead.id)}
                                    >
                                        <Checkbox checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {lead.pass.fullName ?? 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-500">{lead.pass.currentCourse}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                            <Button
                                disabled={selected.size === 0 || loading}
                                onClick={handleRequest}
                                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Requesting…</>
                                ) : (
                                    `Request ${selected.size || ''} Meeting${selected.size !== 1 ? 's' : ''}`
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export function FairReportDashboard({
    fairEvent,
    leads: initialLeads,
    universityId,
    universityName,
}: FairReportDashboardProps) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [showMeetingModal, setShowMeetingModal] = useState(false)
    const [bulkEmailLoading, setBulkEmailLoading] = useState(false)
    const [bulkEmailResult, setBulkEmailResult] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const isEnded = fairEvent.endedAt !== null || new Date(fairEvent.endDate) < new Date()

    // ── Computed stats ────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = leads.length
        const walkIns = leads.filter((l) => l.pass.isPartialProfile).length
        const emailsSent = leads.filter((l) => l.emailSent).length
        const waDelivered = leads.filter((l) => l.whatsappSent).length
        return { total, walkIns, profileComplete: total - walkIns, emailsSent, waDelivered }
    }, [leads])

    // ── Chart data ────────────────────────────────────────────────────────────
    const fieldChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const l of leads) {
            const field = l.pass.fieldOfInterest || 'Unknown'
            counts[field] = (counts[field] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)
    }, [leads])

    const yearChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const l of leads) {
            const yr = l.pass.yearOfPassing?.toString() ?? 'Unknown'
            counts[yr] = (counts[yr] ?? 0) + 1
        }
        return Object.entries(counts).map(([year, count]) => ({ year, count })).sort((a, b) => a.year.localeCompare(b.year))
    }, [leads])

    // ── Filtered leads ────────────────────────────────────────────────────────
    const filteredLeads = useMemo(() => {
        if (!searchQuery.trim()) return leads
        const q = searchQuery.toLowerCase()
        return leads.filter(
            (l) =>
                l.pass.fullName?.toLowerCase().includes(q) ||
                l.pass.currentInstitution?.toLowerCase().includes(q),
        )
    }, [leads, searchQuery])

    // ── Follow-up status change (optimistic) ─────────────────────────────────
    const handleStatusChange = useCallback(
        (attendanceId: string, status: FollowUpStatus) => {
            // Optimistic update
            setLeads((prev) =>
                prev.map((l) => (l.id === attendanceId ? { ...l, followUpStatus: status } : l)),
            )
            startTransition(async () => {
                const result = await updateFollowUpStatus(attendanceId, status)
                if (!result.success) {
                    // Revert on failure — fetch original value
                    console.error('[handleStatusChange] Failed:', result.error)
                }
            })
        },
        [],
    )

    // ── Export CSV ────────────────────────────────────────────────────────────
    const handleExportCSV = async () => {
        const result = await exportLeadsCSV(fairEvent.id, universityId)
        if (result.csv) {
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${fairEvent.name.replace(/\s+/g, '_')}_leads.csv`
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    // ── Bulk email ────────────────────────────────────────────────────────────
    const handleBulkEmail = async () => {
        setBulkEmailLoading(true)
        setBulkEmailResult(null)
        const result = await sendBulkFollowUp(fairEvent.id, universityId)
        setBulkEmailLoading(false)
        if (result.error) {
            setBulkEmailResult(`Error: ${result.error}`)
        } else {
            setBulkEmailResult(`✅ Sent ${result.sent} emails, skipped ${result.skipped}`)
            // Refresh statuses
            setLeads((prev) =>
                prev.map((l) =>
                    l.pass.emailConsent && l.followUpStatus !== 'REJECTED'
                        ? { ...l, followUpStatus: 'CONTACTED' }
                        : l,
                ),
            )
        }
    }

    const fairIsLive = fairEvent.status === 'LIVE' || !isEnded

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* ── SECTION 1: Header ── */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-xl font-bold text-gray-900 truncate max-w-xs sm:max-w-sm">
                                {fairEvent.name}
                            </h1>
                            {fairIsLive ? (
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    LIVE
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                                    ENDED
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500">
                            {fairEvent.city && `${fairEvent.city} · `}
                            {fairEvent.venue && `${fairEvent.venue} · `}
                            {new Date(fairEvent.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        className="rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* ── SECTION 2: Stats ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: Users, label: 'Students Scanned', value: stats.total, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { icon: UserCheck, label: 'Complete Profiles', value: stats.profileComplete, sub: `${stats.walkIns} walk-ins`, color: 'text-violet-600', bg: 'bg-violet-50' },
                        { icon: Mail, label: 'Brochure Emails Sent', value: stats.emailsSent, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { icon: MessageCircle, label: 'WhatsApp Delivered', value: stats.waDelivered, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map(({ icon: Icon, label, value, sub, color, bg }) => (
                        <Card key={label} className="border-0 shadow-md rounded-2xl bg-white">
                            <CardContent className="p-5">
                                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                                    <Icon className={`w-5 h-5 ${color}`} />
                                </div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── SECTION 3: Charts ── */}
                {leads.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="border-0 shadow-md rounded-2xl bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                                    Top Fields of Interest
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={fieldChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                            {fieldChartData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md rounded-2xl bg-white">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-violet-600" />
                                    Year of Passing Breakdown
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={yearChartData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                            {yearChartData.map((_, i) => (
                                                <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* ── SECTION 4: Leads table ── */}
                <Card className="border-0 shadow-md rounded-2xl bg-white">
                    <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle className="text-base">
                                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
                                {searchQuery && ` matching "${searchQuery}"`}
                            </CardTitle>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or institution…"
                                    className="pl-9 rounded-xl border-gray-200"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredLeads.length === 0 ? (
                            <div className="text-center py-16 px-6">
                                <p className="text-4xl mb-4">🎓</p>
                                {leads.length === 0 ? (
                                    <>
                                        <h3 className="font-semibold text-gray-900 mb-2">No leads yet</h3>
                                        <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                            Use the scanner app at your booth to scan student fair passes. Leads will appear here in real time.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-semibold text-gray-900 mb-1">No results</h3>
                                        <p className="text-gray-500 text-sm">Try a different search term.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/70">
                                            {['Name', 'Course', 'Institution', 'Year', 'Matched Programs', 'Scanned At', 'Follow Up'].map(
                                                (h) => (
                                                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                                                        {h}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filteredLeads.map((lead) => (
                                            <tr
                                                key={lead.id}
                                                className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                                onClick={() => setSelectedLead(lead)}
                                            >
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <p className="font-medium text-gray-900">{lead.pass.fullName ?? '—'}</p>
                                                    <p className="text-xs text-gray-400">{lead.pass.email}</p>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                    {lead.pass.currentCourse ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                    {lead.pass.currentInstitution ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                    {lead.pass.yearOfPassing ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lead.matchedPrograms.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {lead.matchedPrograms.slice(0, 2).map((p) => (
                                                                <span key={p} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                                                    {p}
                                                                </span>
                                                            ))}
                                                            {lead.matchedPrograms.length > 2 && (
                                                                <span className="text-xs text-gray-400">+{lead.matchedPrograms.length - 2}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                                                    {new Date(lead.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    <br />
                                                    {new Date(lead.scannedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                </td>
                                                {/* Follow-up dropdown — stop propagation to not open side panel */}
                                                <td
                                                    className="px-4 py-3 whitespace-nowrap"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Select
                                                        value={lead.followUpStatus}
                                                        onValueChange={(v) => handleStatusChange(lead.id, v as FollowUpStatus)}
                                                    >
                                                        <SelectTrigger
                                                            className={`h-7 text-xs rounded-lg border ${STATUS_COLORS[lead.followUpStatus] ?? ''} w-32`}
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(['PENDING', 'CONTACTED', 'APPLIED', 'REJECTED'] as const).map((s) => (
                                                                <SelectItem key={s} value={s} className="text-xs">
                                                                    {s}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── SECTION 5: Action bar (fair ended only) ── */}
                {isEnded && (
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-md p-5 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-gray-900 text-sm">Post-Fair Actions</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {leads.filter((l) => l.pass.emailConsent).length} lead{leads.filter((l) => l.pass.emailConsent).length !== 1 ? 's' : ''} consented to email
                            </p>
                            {bulkEmailResult && (
                                <p className="text-xs text-emerald-600 font-medium mt-1">{bulkEmailResult}</p>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Button
                                variant="outline"
                                onClick={handleBulkEmail}
                                disabled={bulkEmailLoading}
                                className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                {bulkEmailLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4 mr-2" />
                                )}
                                Send Follow-up Emails
                            </Button>
                            <Button
                                onClick={() => setShowMeetingModal(true)}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Request Meetings
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modals / panels ── */}
            <LeadDetailSheet
                lead={selectedLead}
                open={!!selectedLead}
                onClose={() => setSelectedLead(null)}
            />
            <MeetingRequestModal
                leads={leads}
                open={showMeetingModal}
                onClose={() => setShowMeetingModal(false)}
                universityId={universityId}
            />
        </div>
    )
}
