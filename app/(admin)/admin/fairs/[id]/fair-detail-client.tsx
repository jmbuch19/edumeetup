'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setFairLive, endFair, type FairDetail } from '../actions'
import {
    ArrowLeft, QrCode, Printer, ExternalLink,
    Users, ScanLine, Building2, UserCheck,
    Zap, CheckCircle2, MapPin, Calendar,
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

export function FairDetailClient({ fair }: { fair: NonNullable<FairDetail> }) {
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
