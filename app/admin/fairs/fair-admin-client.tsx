'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    createFairEventWithNotify,
    setFairLiveWithNotify,
    setFairEndedWithNotify,
    type FairRow,
} from './actions'
import {
    Users, ScanLine, Building2, QrCode,
    Plus, Zap, CheckCircle2, ExternalLink, Copy,
    X, Loader2, Calendar, MapPin,
} from 'lucide-react'

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; cls: string }> = {
    UPCOMING: { label: 'Upcoming', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    LIVE: { label: 'Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPLETED: { label: 'Completed', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-600 border-red-200' },
}

function Badge({ status }: { status: string }) {
    const s = STATUS[status] ?? STATUS.UPCOMING
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
            {status === 'LIVE' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {s.label}
        </span>
    )
}

// ── Confirmation dialog ───────────────────────────────────────────────────────
function ConfirmDialog({
    title, body, confirmLabel, confirmCls, onConfirm, onCancel, loading,
}: {
    title: string; body: string; confirmLabel: string; confirmCls: string
    onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
                <div className="flex items-start justify-between">
                    <h3 className="text-base font-bold text-gray-900">{title}</h3>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-gray-600">{body}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 rounded-xl border border-gray-200 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white ${confirmCls} flex items-center justify-center gap-2`}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Create form dialog ────────────────────────────────────────────────────────
function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [isHybrid, setIsHybrid] = useState(false)
    const [form, setForm] = useState({
        name: '', slug: '', city: '', venue: '', country: '',
        description: '', startDate: '', endDate: '', capacity: '', onlineUrl: '',
    })

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value
        if (k === 'name') {
            setForm(f => ({
                ...f, name: val,
                slug: val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            }))
        } else {
            setForm(f => ({ ...f, [k]: val }))
        }
    }

    const handleSubmit = () => {
        setError(null)
        startTransition(async () => {
            const res = await createFairEventWithNotify({ ...form, isHybrid })
            if (!res.success) { setError(res.error); return }
            onCreated()
        })
    }

    const field = (label: string, key: keyof typeof form, opts?: {
        placeholder?: string; type?: string; required?: boolean; mono?: boolean
    }) => (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {label}{opts?.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
                type={opts?.type ?? 'text'}
                value={form[key]}
                onChange={set(key)}
                placeholder={opts?.placeholder}
                className={`w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 ${opts?.mono ? 'font-mono' : ''}`}
            />
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Create Fair Event</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-2 gap-4">
                    <div className="col-span-2">{field('Event Name', 'name', { required: true, placeholder: 'edUmeetup Mumbai Fair 2026' })}</div>
                    <div className="col-span-2">
                        {field('Slug', 'slug', { required: true, placeholder: 'mumbai-2026', mono: true })}
                        <p className="text-xs text-gray-400 mt-1">Auto-generated from name. Editable.</p>
                    </div>
                    {field('Start Date & Time', 'startDate', { type: 'datetime-local', required: true })}
                    {field('End Date & Time', 'endDate', { type: 'datetime-local', required: true })}
                    {field('City', 'city', { placeholder: 'Mumbai', required: true })}
                    {field('Country', 'country', { placeholder: 'India', required: true })}
                    <div className="col-span-2">{field('Venue', 'venue', { placeholder: 'NESCO Convention Centre, Goregaon' })}</div>
                    <div className="col-span-2 space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                        <textarea
                            value={form.description}
                            onChange={set('description')}
                            rows={2}
                            placeholder="Brief description of the fair event…"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none"
                        />
                    </div>
                    {field('Capacity', 'capacity', { type: 'number', placeholder: '500' })}
                    <div className="flex items-center gap-3 self-end pb-1">
                        <button
                            type="button"
                            onClick={() => setIsHybrid(h => !h)}
                            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${isHybrid ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${isHybrid ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-sm font-medium text-gray-700">Hybrid event</span>
                    </div>
                    {isHybrid && (
                        <div className="col-span-2">{field('Online URL', 'onlineUrl', { placeholder: 'https://zoom.us/j/...' })}</div>
                    )}
                </div>

                {error && (
                    <div className="mx-6 mb-4 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>
                )}

                <div className="flex gap-3 px-6 pb-6">
                    <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={pending || !form.name || !form.slug || !form.startDate || !form.endDate}
                        className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                    >
                        {pending ? <><Loader2 className="w-4 h-4 animate-spin" />Creating & notifying…</> : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Row actions ───────────────────────────────────────────────────────────────
function RowActions({ fair, onRefresh }: { fair: FairRow; onRefresh: () => void }) {
    const [confirm, setConfirm] = useState<'live' | 'end' | null>(null)
    const [pending, startTransition] = useTransition()
    const [copied, setCopied] = useState(false)

    const handleGoLive = () => {
        startTransition(async () => {
            await setFairLiveWithNotify(fair.id)
            setConfirm(null)
            onRefresh()
        })
    }
    const handleEnd = () => {
        startTransition(async () => {
            await setFairEndedWithNotify(fair.id)
            setConfirm(null)
            onRefresh()
        })
    }
    const handleCopy = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/event/${fair.slug}/scan`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <>
            {confirm === 'live' && (
                <ConfirmDialog
                    title="Go Live?"
                    body={`This will notify all verified universities and students about "${fair.name}". Scanner links will be sent.`}
                    confirmLabel="Yes, go live"
                    confirmCls="bg-emerald-600 hover:bg-emerald-700"
                    loading={pending}
                    onConfirm={handleGoLive}
                    onCancel={() => setConfirm(null)}
                />
            )}
            {confirm === 'end' && (
                <ConfirmDialog
                    title="End Fair?"
                    body={`This will send lead reports to all universities that scanned students at "${fair.name}". This cannot be undone.`}
                    confirmLabel="End & send reports"
                    confirmCls="bg-red-600 hover:bg-red-700"
                    loading={pending}
                    onConfirm={handleEnd}
                    onCancel={() => setConfirm(null)}
                />
            )}

            <div className="flex items-center gap-2 flex-wrap">
                {fair.status === 'UPCOMING' && (
                    <button
                        onClick={() => setConfirm('live')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                        <Zap className="w-3.5 h-3.5" /> Go Live
                    </button>
                )}
                {fair.status === 'LIVE' && (
                    <button
                        onClick={() => setConfirm('end')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" /> End Fair
                    </button>
                )}
                {fair.status === 'COMPLETED' && (
                    <a
                        href={`/dashboard/university/fair-report/${fair.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-semibold transition-colors"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> View Report
                    </a>
                )}
                <button
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 text-xs font-semibold transition-colors"
                >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Scanner Link'}
                </button>
            </div>
        </>
    )
}

// ── Main client ───────────────────────────────────────────────────────────────
interface Props {
    events: FairRow[]
    platformStats: { totalPasses: number; totalScans: number; uniqueUnis: number }
}

export function FairAdminClient({ events: initialEvents, platformStats }: Props) {
    const router = useRouter()
    const [events, setEvents] = useState(initialEvents)
    const [showCreate, setShowCreate] = useState(false)

    const refresh = useCallback(() => router.refresh(), [router])

    const STATS = [
        { label: 'Total Fair Events', value: events.length, icon: Calendar },
        { label: 'Passes Issued', value: platformStats.totalPasses, icon: Users },
        { label: 'Booth Scans', value: platformStats.totalScans, icon: ScanLine },
        { label: 'Universities', value: platformStats.uniqueUnis, icon: Building2 },
    ]

    return (
        <>
            {showCreate && (
                <CreateDialog
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); refresh() }}
                />
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map(({ label, value, icon: Icon }) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Icon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{value}</p>
                            <p className="text-xs text-gray-500">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">All Fair Events</h2>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> New Fair Event
                </button>
            </div>

            {/* Empty state */}
            {events.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 flex flex-col items-center gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-2xl">
                        <QrCode className="w-8 h-8 text-gray-300" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-700">No fair events yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Create your first event — universities and students will be notified automatically.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create First Event
                    </button>
                </div>
            )}

            {/* Table */}
            {events.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-gray-100">
                        {events.map(fair => (
                            <div key={fair.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-gray-900">{fair.name}</p>
                                        {fair.city && (
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3" />
                                                {[fair.city, fair.country].filter(Boolean).join(', ')}
                                            </p>
                                        )}
                                    </div>
                                    <Badge status={fair.status} />
                                </div>
                                <p className="text-xs text-gray-500">
                                    {new Date(fair.startDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                <div className="flex gap-4 text-xs text-gray-500">
                                    <span>{fair.passes} passes</span>
                                    <span>{fair.scans} scans</span>
                                </div>
                                <RowActions fair={fair} onRefresh={refresh} />
                            </div>
                        ))}
                    </div>

                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Passes</th>
                                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scans</th>
                                    <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {events.map(fair => (
                                    <tr key={fair.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="font-semibold text-gray-900">{fair.name}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{fair.slug}</p>
                                        </td>
                                        <td className="px-4 py-4 text-gray-600">
                                            {fair.city
                                                ? <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gray-400" />{[fair.city, fair.country].filter(Boolean).join(', ')}</span>
                                                : <span className="text-gray-300">—</span>
                                            }
                                        </td>
                                        <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                                            {new Date(fair.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-4 text-right font-semibold text-indigo-600">{fair.passes}</td>
                                        <td className="px-4 py-4 text-right font-semibold text-violet-600">{fair.scans}</td>
                                        <td className="px-4 py-4 text-center"><Badge status={fair.status} /></td>
                                        <td className="px-4 py-4"><RowActions fair={fair} onRefresh={refresh} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    )
}
