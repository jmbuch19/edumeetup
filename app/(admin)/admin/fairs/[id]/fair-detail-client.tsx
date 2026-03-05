'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setFairLive, endFair, answerFairQuestion, exportAllRegistrationsCSV, type FairDetail, type FairQuestionRow, type RegistrationRow } from '../actions'
import {
    ArrowLeft, QrCode, Printer, ExternalLink,
    Users, ScanLine, Building2, UserCheck,
    Zap, CheckCircle2, MapPin, Calendar, MessageCircleQuestion, Loader2,
    Download, Mail, MessageCircle, ShieldCheck, Eye,
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
    UPCOMING: 'bg-blue-50 text-blue-700 border-blue-200',
    LIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: number; icon: React.ElementType; color: string
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{label}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}

export function FairDetailClient({
    fair, questions = [], registrations = [],
}: {
    fair: NonNullable<FairDetail>
    questions?: FairQuestionRow[]
    registrations?: RegistrationRow[]
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [action, setAction] = useState<'live' | 'end' | null>(null)
    const [confirmEnd, setConfirmEnd] = useState(false)

    const registrationUrl = `https://edumeetup.com/fair?eventId=${fair.id}`
    const localUrl = `http://localhost:3000/fair?eventId=${fair.id}`

    const handleSetLive = () => {
        setAction('live')
        startTransition(async () => {
            await setFairLive(fair.id)
            router.refresh()
            setAction(null)
        })
    }

    const handleEnd = () => {
        if (!confirmEnd) { setConfirmEnd(true); return }
        setAction('end')
        startTransition(async () => {
            await endFair(fair.id)
            router.refresh()
            setAction(null)
            setConfirmEnd(false)
        })
    }

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <Link href="/admin/fairs" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2">
                        <ArrowLeft className="w-4 h-4" /> All Fairs
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">{fair.name}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {(fair.city || fair.country) && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {[fair.venue, fair.city, fair.country].filter(Boolean).join(', ')}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(fair.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[fair.status]}`}>
                            {fair.status === 'LIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
                            {fair.status}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 shrink-0">
                    {fair.status === 'UPCOMING' && (
                        <Button
                            onClick={handleSetLive}
                            disabled={pending}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm"
                        >
                            <Zap className="w-4 h-4" />
                            {action === 'live' ? 'Going Live…' : 'Go Live'}
                        </Button>
                    )}
                    {fair.status === 'LIVE' && (
                        <Button
                            onClick={handleEnd}
                            disabled={pending}
                            variant={confirmEnd ? 'destructive' : 'outline'}
                            className="rounded-xl gap-2 text-sm"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {action === 'end' ? 'Ending…' : confirmEnd ? 'Confirm End Fair' : 'End Fair'}
                        </Button>
                    )}
                    <Link href={`/dashboard/university/fair-report/${fair.id}`} target="_blank">
                        <Button variant="outline" className="rounded-xl gap-2 text-sm">
                            <ExternalLink className="w-4 h-4" /> Report
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Passes Issued" value={fair.totalPasses} icon={Users} color="text-indigo-600" />
                <StatCard label="Booth Scans" value={fair.totalScans} icon={ScanLine} color="text-violet-600" />
                <StatCard label="Universities" value={fair.uniqueUnis} icon={Building2} color="text-blue-600" />
                <StatCard label="Registered" value={fair.registeredStudents} icon={UserCheck} color="text-emerald-600" />
            </div>

            {/* QR + entrance section */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Printable QR card */}
                <Card className="border-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <QrCode className="w-5 h-5 text-indigo-600" />
                            Entrance QR Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-5">
                        {/* printable area */}
                        <div id="fair-qr-printable" className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl border border-gray-100 w-full">
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">edUmeetup Fair</p>
                            <p className="text-lg font-bold text-gray-900 text-center">{fair.name}</p>
                            {(fair.city || fair.venue) && (
                                <p className="text-sm text-gray-500">{[fair.venue, fair.city].filter(Boolean).join(' · ')}</p>
                            )}
                            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <QRCodeSVG
                                    value={registrationUrl}
                                    size={220}
                                    level="Q"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="text-xs text-gray-400 text-center">Scan to register & receive your fair pass</p>
                            <p className="text-[10px] text-gray-300 font-mono break-all text-center">{registrationUrl}</p>
                        </div>

                        <div className="flex gap-2 w-full">
                            <Button
                                onClick={handlePrint}
                                className="flex-1 rounded-xl gap-2"
                                variant="outline"
                            >
                                <Printer className="w-4 h-4" /> Print / Save PDF
                            </Button>
                            <a href={localUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                                <Button variant="outline" className="w-full rounded-xl gap-2">
                                    <ExternalLink className="w-4 h-4" /> Test Locally
                                </Button>
                            </a>
                        </div>

                        <div className="w-full bg-gray-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Production URL</p>
                            <p className="text-xs font-mono text-indigo-700 break-all">{registrationUrl}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Info + links card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <LinkRow
                            label="Student Registration"
                            desc="Entrance QR target — share with attendees"
                            href={`/fair?eventId=${fair.id}`}
                        />
                        <LinkRow
                            label="University Scanner"
                            desc="For university reps to scan student passes"
                            href={`/event/${fair.id}/scan`}
                        />
                        <LinkRow
                            label="Fair Report Dashboard"
                            desc="Leads, CSV export, follow-up tracking"
                            href={`/dashboard/university/fair-report/${fair.id}`}
                        />

                        <div className="pt-3 border-t border-gray-100 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Fair ID</span>
                                <span className="font-mono text-xs text-gray-700 truncate max-w-[160px]">{fair.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Slug</span>
                                <span className="font-mono text-xs text-gray-700">{fair.slug}</span>
                            </div>
                            {fair.capacity && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Capacity</span>
                                    <span className="font-semibold">{fair.capacity}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Walk-ins</span>
                                <span className="font-semibold">{fair.walkIns}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Q&A Answer Panel ── */}
            <AdminQAPanel questions={questions} />

            {/* ── All Registrations Panel ── */}
            <AllRegistrationsPanel registrations={registrations} fairId={fair.id} fairName={fair.name} />
        </div>
    )
}

// ── Admin Q&A answer panel ────────────────────────────────────────────────────
function AdminQAPanel({ questions }: { questions: FairQuestionRow[] }) {
    if (questions.length === 0) return null

    const unanswered = questions.filter(q => !q.answer)
    const answered = questions.filter(q => q.answer)
    const ordered = [...unanswered, ...answered]

    return (
        <Card className="border-indigo-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircleQuestion className="w-5 h-5 text-indigo-600" />
                    Questions &amp; Answers
                    {unanswered.length > 0 && (
                        <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {unanswered.length} unanswered
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 divide-y divide-gray-100">
                {ordered.map(q => <QRow key={q.id} q={q} />)}
            </CardContent>
        </Card>
    )
}

function QRow({ q }: { q: FairQuestionRow }) {
    const [ansText, setAnsText] = useState(q.answer ?? '')
    const [saved, setSaved] = useState(!!q.answer)
    const [err, setErr] = useState('')
    const [pending, start] = useTransition()

    const handleSave = () => {
        setErr('')
        start(async () => {
            const res = await answerFairQuestion(q.id, ansText)
            if (res.ok) { setSaved(true) }
            else { setErr(res.error) }
        })
    }

    return (
        <div className="pt-4 first:pt-0 space-y-2">
            <div className="flex items-start gap-2">
                <span className="mt-0.5 text-xs font-bold text-indigo-400 uppercase tracking-wide min-w-[18px]">Q</span>
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{q.question}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">{q.askerRole}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">
                            {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {!q.answer && (
                            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                Unanswered
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-bold text-emerald-500 uppercase tracking-wide min-w-[18px]">A</span>
                <div className="flex-1 space-y-1.5">
                    <textarea
                        value={ansText}
                        onChange={e => { setAnsText(e.target.value); setSaved(false) }}
                        rows={2}
                        placeholder="Type your answer…"
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 resize-none"
                    />
                    <div className="flex items-center justify-between">
                        {err && <span className="text-xs text-red-500">{err}</span>}
                        {saved && !pending && <span className="text-xs text-emerald-600 font-medium">✓ Saved &amp; live</span>}
                        <button
                            onClick={handleSave}
                            disabled={pending || !ansText.trim() || saved}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
                        >
                            {pending && <Loader2 className="w-3 h-3 animate-spin" />}
                            {saved ? 'Saved' : 'Save Answer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function LinkRow({ label, desc, href }: { label: string; desc: string; href: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors group"
        >
            <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </a>
    )
}

// ── All Registrations Panel (admin only) ──────────────────────────────────────
// Shows every student who got a gate pass — booth visitors AND browse-only attendees.
// Per data share agreement, all registrant data belongs to edumeetup + participating universities.
function AllRegistrationsPanel({
    registrations,
    fairId,
    fairName,
}: {
    registrations: RegistrationRow[]
    fairId: string
    fairName: string
}) {
    const [exporting, setExporting] = useState(false)
    const [open, setOpen] = useState(false)

    const handleExport = async () => {
        setExporting(true)
        const result = await exportAllRegistrationsCSV(fairId)
        setExporting(false)
        if (result.csv) {
            const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${fairName.replace(/\s+/g, '_')}_all_registrations.csv`
            a.click()
            URL.revokeObjectURL(url)
        }
    }

    const browsersOnly = registrations.filter(r => r.boothVisits === 0)
    const boothVisitors = registrations.filter(r => r.boothVisits > 0)

    return (
        <Card className="border-indigo-100">
            <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="w-5 h-5 text-indigo-600" />
                            All Registrations
                            <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                                {registrations.length}
                            </span>
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                            Every student who generated a gate pass — including {browsersOnly.length} browse-only (no booth visit)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setOpen(o => !o)}
                            className="rounded-xl gap-1.5 text-xs"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            {open ? 'Hide' : 'View All'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExport}
                            disabled={exporting || registrations.length === 0}
                            className="rounded-xl gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs"
                        >
                            {exporting
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Download className="w-3.5 h-3.5" />
                            }
                            Export CSV
                        </Button>
                    </div>
                </div>

                {/* Summary stats */}
                <div className="flex gap-4 text-xs text-gray-500 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {registrations.filter(r => r.isRegistered).length} registered accounts
                    </span>
                    <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {registrations.filter(r => r.isPartialProfile).length} walk-ins
                    </span>
                    <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-violet-500" />
                        {boothVisitors.length} visited ≥1 booth
                    </span>
                    <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        {registrations.filter(r => r.emailConsent).length} email consent
                    </span>
                </div>
            </CardHeader>

            {open && registrations.length > 0 && (
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-t border-b border-gray-100 bg-gray-50/70">
                                    {['Name / Email', 'Institution', 'Course', 'Field', 'Booths', 'Type', 'Consent'].map(h => (
                                        <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {registrations.map(r => (
                                    <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 whitespace-nowrap">{r.fullName ?? '—'}</p>
                                            <p className="text-xs text-gray-400">{r.email}</p>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{r.currentInstitution ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{r.currentCourse ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{r.fieldOfInterest ?? '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                r.boothVisits > 0
                                                    ? 'bg-violet-100 text-violet-700'
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}>
                                                {r.boothVisits}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                r.isPartialProfile
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {r.isPartialProfile ? 'Walk-in' : 'Registered'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1.5">
                                                {r.emailConsent && <Mail className="w-3.5 h-3.5 text-blue-500" />}
                                                {r.whatsappConsent && <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />}
                                                {!r.emailConsent && !r.whatsappConsent && <span className="text-xs text-gray-300">—</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            )}

            {registrations.length === 0 && (
                <CardContent>
                    <p className="text-sm text-gray-400 text-center py-6">No registrations yet for this fair.</p>
                </CardContent>
            )}
        </Card>
    )
}
