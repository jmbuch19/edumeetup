'use client'

import { useState, useTransition } from 'react'
import { updateProctorRequestStatus } from './actions'
import { Shield, Building2, CalendarDays, ChevronDown, Loader2 } from 'lucide-react'
import { ProctorRequestStatus } from '@prisma/client'

const STATUS_CONFIG: Record<ProctorRequestStatus, { label: string; color: string }> = {
    PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-700' },
    CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700' },
    COMPLETED: { label: 'Completed', color: 'bg-slate-100 text-slate-600' },
    CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-600' },
}

type Request = {
    id: string
    examStartDate: Date
    examEndDate: Date
    subjects: string
    studentCount: number
    examType: string
    durationMinutes: number
    requirements: string | null
    policyUrl: string | null
    status: ProctorRequestStatus
    adminNotes: string | null
    fees: number | null
    confirmedAt: Date | null
    createdAt: Date
    university: {
        institutionName: string
        country: string
        repName: string | null
        repEmail: string | null
        contactEmail: string | null
    }
}

function fmt(d: Date | string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function RequestCard({ req, onUpdate }: { req: Request; onUpdate: () => void }) {
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<ProctorRequestStatus>(req.status)
    const [notes, setNotes] = useState(req.adminNotes || '')
    const [fees, setFees] = useState(req.fees ? String(req.fees) : '')
    const [isPending, startTransition] = useTransition()
    const [saved, setSaved] = useState(false)

    function handleSave() {
        startTransition(async () => {
            await updateProctorStatus(req.id, status, notes, fees)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            onUpdate()
        })
    }

    const uniEmail = req.university.repEmail || req.university.contactEmail
    const cfg = STATUS_CONFIG[req.status]

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setOpen(o => !o)}>
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-900">{req.university.institutionName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {req.subjects} · {req.studentCount} students · {fmt(req.examStartDate)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {open && (
                <div className="border-t border-slate-100 p-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div><p className="text-xs text-slate-400 mb-0.5">Country</p><p className="font-medium">{req.university.country}</p></div>
                        <div><p className="text-xs text-slate-400 mb-0.5">Contact</p><p className="font-medium">{req.university.repName || '—'}</p></div>
                        <div><p className="text-xs text-slate-400 mb-0.5">Exam End</p><p className="font-medium">{fmt(req.examEndDate)}</p></div>
                        <div><p className="text-xs text-slate-400 mb-0.5">Duration</p><p className="font-medium">{req.durationMinutes} min</p></div>
                        <div><p className="text-xs text-slate-400 mb-0.5">Type</p><p className="font-medium capitalize">{req.examType}</p></div>
                        <div><p className="text-xs text-slate-400 mb-0.5">Students</p><p className="font-medium">{req.studentCount}</p></div>
                        <div className="col-span-2"><p className="text-xs text-slate-400 mb-0.5">Email</p>
                            {uniEmail ? <a href={`mailto:${uniEmail}`} className="text-primary hover:underline text-xs">{uniEmail}</a> : <p>—</p>}
                        </div>
                    </div>
                    {req.requirements && (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-sm text-amber-700">
                            <strong>Requirements:</strong> {req.requirements}
                        </div>
                    )}
                    {req.policyUrl && (
                        <p className="text-xs text-slate-500">
                            Policy: <a href={req.policyUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{req.policyUrl}</a>
                        </p>
                    )}

                    {/* Admin controls */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Actions</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                                <select value={status} onChange={e => setStatus(e.target.value as ProctorRequestStatus)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white">
                                    {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Fee (USD)</label>
                                <input type="number" step="0.01" placeholder="e.g. 500"
                                    value={fees} onChange={e => setFees(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes to University</label>
                                <input type="text" placeholder="Optional note..."
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white" />
                            </div>
                        </div>
                        <button onClick={handleSave} disabled={isPending}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-all"
                            style={{ background: 'linear-gradient(135deg, #3333CC, #1e3a5f)' }}>
                            {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : saved ? '✓ Saved' : 'Update & Notify University'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export function ProctorAdminUI({ initial }: { initial: Request[] }) {
    const [requests, setRequests] = useState<Request[]>(initial)
    const [filter, setFilter] = useState<'ALL' | ProctorRequestStatus>('ALL')

    const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter)
    const pending = requests.filter(r => r.status === 'PENDING').length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-5 w-5 text-primary" />
                        <h1 className="text-xl font-bold text-slate-900">Proctor Requests</h1>
                        {pending > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pending} pending</span>
                        )}
                    </div>
                    <p className="text-sm text-slate-500">Manage proctoring service requests from verified universities.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {(['ALL', ...Object.keys(STATUS_CONFIG)] as string[]).map(s => (
                        <button key={s} onClick={() => setFilter(s as any)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-primary text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary/40'}`}>
                            {s === 'ALL' ? 'All' : STATUS_CONFIG[s as ProctorRequestStatus]?.label ?? s}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No requests match this filter.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => <RequestCard key={r.id} req={r} onUpdate={() => { }} />)}
                </div>
            )}
        </div>
    )
}
