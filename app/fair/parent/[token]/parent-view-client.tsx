'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { getParentViewData, type ParentViewData, type VisitItem } from './actions'
import { RefreshCw, GraduationCap, ExternalLink, CheckCircle2 } from 'lucide-react'

const REFRESH_INTERVAL_MS = 30_000

const COUNTRY_FLAGS: Record<string, string> = {
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'USA': '🇺🇸',
    'United States': '🇺🇸', 'Canada': '🇨🇦', 'Australia': '🇦🇺',
    'Germany': '🇩🇪', 'France': '🇫🇷', 'Netherlands': '🇳🇱',
    'Ireland': '🇮🇪', 'New Zealand': '🇳🇿', 'Singapore': '🇸🇬',
    'UAE': '🇦🇪', 'India': '🇮🇳', 'China': '🇨🇳', 'Japan': '🇯🇵',
    'South Korea': '🇰🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
}
const flag = (c: string) => COUNTRY_FLAGS[c] ?? '🌍'

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    })
}

function timeAgo(date: Date) {
    const secs = Math.floor((Date.now() - date.getTime()) / 1000)
    if (secs < 5) return 'just now'
    if (secs < 60) return `${secs}s ago`
    return `${Math.floor(secs / 60)}m ago`
}

// ── University visit card ──────────────────────────────────────────────────────
function VisitCard({ visit }: { visit: VisitItem }) {
    return (
        <div className="flex items-center gap-4 bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                {visit.universityLogo ? (
                    <Image
                        src={visit.universityLogo}
                        alt={visit.universityName}
                        width={48}
                        height={48}
                        className="object-contain"
                    />
                ) : (
                    <GraduationCap className="w-5 h-5 text-indigo-400" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                    {visit.universityName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                    {flag(visit.universityCountry)} {visit.universityCountry}
                    &nbsp;·&nbsp;Visited at {formatTime(visit.visitedAt)}
                </p>
            </div>

            {/* Brochure */}
            {visit.brochureUrl && (
                <a
                    href={visit.brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 flex items-center gap-1 text-xs text-indigo-600 font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                    Brochure
                    <ExternalLink className="w-3 h-3" />
                </a>
            )}
        </div>
    )
}

// ── Main client component ─────────────────────────────────────────────────────
export function ParentViewClient({
    token,
    initialData,
}: {
    token: string
    initialData: ParentViewData
}) {
    const [data, setData] = useState<ParentViewData>(initialData)
    const [lastUpdated, setLastUpdated] = useState(new Date())
    const [timeAgoStr, setTimeAgoStr] = useState('just now')
    const [refreshing, setRefreshing] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const doRefresh = async () => {
        if (data.fairEnded) return // Stop refreshing if fair is over
        setRefreshing(true)
        const fresh = await getParentViewData(token)
        if (fresh) {
            setData(fresh)
            setLastUpdated(new Date())
        }
        setRefreshing(false)
    }

    // Auto-refresh
    useEffect(() => {
        if (data.fairEnded) return

        intervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL_MS)
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.fairEnded, token])

    // "X seconds ago" ticker
    useEffect(() => {
        tickRef.current = setInterval(() => {
            setTimeAgoStr(timeAgo(lastUpdated))
        }, 5000)
        return () => {
            if (tickRef.current) clearInterval(tickRef.current)
        }
    }, [lastUpdated])

    const fairDate = new Date(data.fairEventDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
            {/* ── Fair ended banner ── */}
            {data.fairEnded && (
                <div className="bg-slate-700 text-white text-sm font-medium text-center px-6 py-3">
                    🎓 The fair has ended. Your child has finished visiting universities.
                </div>
            )}

            <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
                {/* ── Header card ── */}
                <div className="bg-white rounded-3xl shadow-md p-6 text-center border border-indigo-50">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="text-3xl">🎓</span>
                    </div>
                    <p className="text-sm text-indigo-600 font-semibold uppercase tracking-wider mb-1">
                        Live Fair Update
                    </p>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {data.studentFirstName}&apos;s Visit
                    </h1>
                    <p className="text-gray-500 text-sm">
                        {data.fairEventTitle} &middot; {fairDate}
                    </p>
                </div>

                {/* ── Count banner ── */}
                <div className="bg-indigo-600 rounded-2xl px-6 py-4 flex items-center gap-4 text-white shadow-md">
                    <CheckCircle2 className="w-8 h-8 shrink-0 opacity-90" />
                    <div>
                        <p className="text-2xl font-bold leading-tight">
                            {data.visits.length} universit{data.visits.length !== 1 ? 'ies' : 'y'} visited
                        </p>
                        <p className="text-indigo-200 text-sm">
                            {data.visits.length === 0
                                ? 'No visits recorded yet — check back soon!'
                                : 'so far at this fair'}
                        </p>
                    </div>
                </div>

                {/* ── Visit list ── */}
                {data.visits.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p className="text-lg font-semibold">No visits yet</p>
                        <p className="text-sm mt-1">
                            {data.fairEnded
                                ? 'No universities were recorded during this event.'
                                : 'This page will update automatically as your child visits universities.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {data.visits.map((visit) => (
                            <VisitCard key={visit.id} visit={visit} />
                        ))}
                    </div>
                )}

                {/* ── Last updated ── */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-2">
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
                    <span>
                        {data.fairEnded
                            ? 'Auto-refresh stopped — fair has ended'
                            : `Last updated: ${timeAgoStr} · refreshes every 30s`}
                    </span>
                </div>

                {/* ── Footer ── */}
                <p className="text-center text-xs text-gray-300 pb-4">
                    This is a read-only parent view · Powered by edUmeetup
                </p>
            </div>
        </main>
    )
}
