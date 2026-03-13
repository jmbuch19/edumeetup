'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
    AlertCircle, BookmarkPlus, ChevronDown, ChevronRight, ExternalLink,
    GraduationCap, MessageCircle, Send, Calendar, Loader2, CheckCircle2,
    FileText, Users, Globe, BookCheck,
} from 'lucide-react'
import { sendFairMessage, saveToShortlist } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────
export type MessageItem = {
    id: string
    content: string
    senderRole: string  // 'STUDENT' | 'UNIVERSITY_REP'
    sentAt: string
}

export type VisitData = {
    id: string              // FairAttendance.id
    createdAt: string
    matchedPrograms: string[]   // resolved names
    repNotes: string | null
    emailSent: boolean
    university: {
        id: string
        institutionName: string
        country: string | null
        logo: string | null
        about: string | null
        brochureUrl: string | null
    }
    fairEvent: {
        id: string
        name: string
        endedAt: string | null
    }
    pass: {
        id: string
        isPartialProfile: boolean
    }
    messages: MessageItem[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'USA': '🇺🇸',
    'United States': '🇺🇸', 'United States of America': '🇺🇸',
    'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Germany': '🇩🇪',
    'France': '🇫🇷', 'Netherlands': '🇳🇱', 'Ireland': '🇮🇪',
    'New Zealand': '🇳🇿', 'Singapore': '🇸🇬', 'UAE': '🇦🇪',
    'India': '🇮🇳', 'China': '🇨🇳', 'Japan': '🇯🇵',
    'South Korea': '🇰🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
    'Sweden': '🇸🇪', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
}

const flag = (country: string) => COUNTRY_FLAGS[country] ?? '🌍'

const conversationClosed = (endedAt: string | null) => {
    // Fair is closed if endedAt is set (manually ended) or if it ended > 7 days ago by date
    if (!endedAt) return false
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return new Date(endedAt) < sevenDaysAgo
}

// ── FairMessage Thread ─────────────────────────────────────────────────────────
function MessageThread({
    attendanceId,
    studentId,
    isClosed,
    initialMessages,
}: {
    attendanceId: string
    studentId: string
    isClosed: boolean
    initialMessages: MessageItem[]
}) {
    const [messages, setMessages] = useState<MessageItem[]>(initialMessages)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSend = async () => {
        const body = draft.trim()
        if (!body || sending) return

        setSending(true)
        const optimistic: MessageItem = {
            id: `opt-${Date.now()}`,
            content: body,
            senderRole: 'STUDENT',
            sentAt: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, optimistic])
        setDraft('')

        const result = await sendFairMessage(attendanceId, studentId, body)
        setSending(false)
        if (!result.success) {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
            setDraft(body)
        }
    }

    return (
        <div className="border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            {/* Closed banner */}
            {isClosed && (
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100 rounded-b-2xl text-xs text-amber-700 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    This conversation has closed (fair ended more than 7 days ago)
                </div>
            )}

            {/* Messages */}
            <div className="max-h-52 overflow-y-auto px-4 py-3 space-y-2">
                {messages.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                        No messages yet. Say hello! 👋
                    </p>
                ) : (
                    messages.map((m) => {
                        const isStudent = m.senderRole === 'STUDENT'
                        return (
                            <div
                                key={m.id}
                                className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm ${isStudent
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                        }`}
                                >
                                    {m.content}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            {!isClosed && (
                <div className="flex items-center gap-2 px-4 pb-4 pt-2">
                    <Input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message…"
                        className="rounded-xl border-gray-200 text-sm"
                        disabled={sending}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!draft.trim() || sending}
                        size="sm"
                        className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                    >
                        {sending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            )}
        </div>
    )
}

// ── University Card ────────────────────────────────────────────────────────────
function UniversityCard({
    visit,
    studentId,
}: {
    visit: VisitData
    studentId: string
}) {
    const [showMessages, setShowMessages] = useState(false)
    const [bookmarked, setBookmarked] = useState(false)
    const [bookmarkLoading, setBookmarkLoading] = useState(false)

    const isClosed = conversationClosed(visit.fairEvent.endedAt)
    const { university } = visit

    const handleBookmark = async () => {
        if (bookmarked) return
        setBookmarkLoading(true)
        const result = await saveToShortlist(studentId, university.id)
        setBookmarkLoading(false)
        if (result.success) setBookmarked(true)
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            {/* Card header */}
            <div className="flex items-start gap-4 p-4">
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {university.logo ? (
                        <Image
                            src={university.logo}
                            alt={university.institutionName}
                            width={56}
                            height={56}
                            className="object-contain"
                        />
                    ) : (
                        <GraduationCap className="w-6 h-6 text-indigo-400" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                        {university.institutionName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {flag(university.country || '')} {university.country || 'Unknown'}
                    </p>

                    {/* Matched programs */}
                    {visit.matchedPrograms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {visit.matchedPrograms.slice(0, 3).map((p) => (
                                <span
                                    key={p}
                                    className="text-xs bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full font-medium"
                                >
                                    {p}
                                </span>
                            ))}
                            {visit.matchedPrograms.length > 3 && (
                                <span className="text-xs text-gray-400 self-center">
                                    +{visit.matchedPrograms.length - 3} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-3 flex flex-wrap gap-2">
                {university.brochureUrl && (
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8"
                    >
                        <a href={university.brochureUrl} target="_blank" rel="noopener noreferrer">
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            View Brochure
                        </a>
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBookmark}
                    disabled={bookmarked || bookmarkLoading}
                    className={`rounded-xl text-xs h-8 ${bookmarked
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        }`}
                >
                    {bookmarkLoading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : bookmarked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    ) : (
                        <BookmarkPlus className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {bookmarked ? 'Saved!' : 'Save to Shortlist'}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl border-violet-200 text-violet-700 hover:bg-violet-50 text-xs h-8"
                >
                    <Link href={`/student/meetings?universityId=${university.id}`}>
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Request Meeting
                    </Link>
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMessages((v) => !v)}
                    className={`rounded-xl text-xs h-8 ${showMessages
                        ? 'border-indigo-300 text-indigo-700 bg-indigo-50'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    Message Rep
                    {visit.messages.length > 0 && (
                        <span className="ml-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                            {visit.messages.length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Message thread (inline expandable) */}
            {showMessages && (
                <MessageThread
                    attendanceId={visit.id}
                    studentId={studentId}
                    isClosed={isClosed}
                    initialMessages={visit.messages}
                />
            )}
        </div>
    )
}

// ── Country Accordion ─────────────────────────────────────────────────────────
function CountryAccordion({
    country,
    visits,
    studentId,
    defaultOpen,
}: {
    country: string
    visits: VisitData[]
    studentId: string
    defaultOpen: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{flag(country)}</span>
                    <div className="text-left">
                        <p className="font-bold text-gray-900">{country}</p>
                        <p className="text-sm text-gray-500">
                            {visits.length} universit{visits.length !== 1 ? 'ies' : 'y'} visited
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-medium">
                        {visits.reduce((acc, v) => acc + v.matchedPrograms.length, 0)} matched programs
                    </span>
                    {open ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Content */}
            {open && (
                <div className="bg-gray-50/60 px-5 pb-5 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visits.map((visit) => (
                        <UniversityCard key={visit.id} visit={visit} studentId={studentId} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Filter bar ─────────────────────────────────────────────────────────────────
type SortOption = 'recent' | 'country' | 'program-match'

function FilterBar({
    countries,
    fields,
    country,
    field,
    sort,
    onCountry: setCountry,
    onField: setField,
    onSort: setSort,
}: {
    countries: string[]
    fields: string[]
    country: string
    field: string
    sort: SortOption
    onCountry: (v: string) => void
    onField: (v: string) => void
    onSort: (v: SortOption) => void
}) {
    return (
        <div className="flex flex-wrap gap-3">
            <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-44 rounded-xl border-gray-200 bg-white text-sm">
                    <Globe className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All countries" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All countries</SelectItem>
                    {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                            {flag(c)} {c}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={field} onValueChange={setField}>
                <SelectTrigger className="w-48 rounded-xl border-gray-200 bg-white text-sm">
                    <BookCheck className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All fields" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="ALL">All fields</SelectItem>
                    {fields.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="w-44 rounded-xl border-gray-200 bg-white text-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="country">By Country</SelectItem>
                    <SelectItem value="program-match">Program Match</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function FairVisitsDashboard({
    visits: initialVisits,
    studentId,
    hasPartialProfile,
}: {
    visits: VisitData[]
    studentId: string
    hasPartialProfile: boolean
}) {
    const [countryFilter, setCountryFilter] = useState('ALL')
    const [fieldFilter, setFieldFilter] = useState('ALL')
    const [sort, setSort] = useState<SortOption>('recent')

    // ── Derived ────────────────────────────────────────────────────────────
    const allCountries = useMemo(
        () => [...new Set(initialVisits.map((v) => v.university.country || 'Unknown'))].sort(),
        [initialVisits],
    )
    const allFields = useMemo(
        () => [...new Set(initialVisits.flatMap((v) => v.matchedPrograms))].sort(),
        [initialVisits],
    )

    const uniqueFairEvents = useMemo(
        () => new Set(initialVisits.map((v) => v.fairEvent.id)).size,
        [initialVisits],
    )
    const uniqueCountries = useMemo(
        () => new Set(initialVisits.map((v) => v.university.country || 'Unknown')).size,
        [initialVisits],
    )

    const filtered = useMemo(() => {
        let list = [...initialVisits]
        if (countryFilter !== 'ALL') list = list.filter((v) => v.university.country === countryFilter)
        if (fieldFilter !== 'ALL') list = list.filter((v) => v.matchedPrograms.includes(fieldFilter))

        if (sort === 'recent') list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        else if (sort === 'country') list.sort((a, b) => (a.university.country || 'Unknown').localeCompare(b.university.country || 'Unknown'))
        else if (sort === 'program-match') list.sort((a, b) => b.matchedPrograms.length - a.matchedPrograms.length)

        return list
    }, [initialVisits, countryFilter, fieldFilter, sort])

    // Group by country
    const byCountry = useMemo(() => {
        const map = new Map<string, VisitData[]>()
        for (const v of filtered) {
            const c = v.university.country || 'Unknown'
            if (!map.has(c)) map.set(c, [])
            map.get(c)!.push(v)
        }
        return map
    }, [filtered])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            {/* ── Sticky partial-profile banner ── */}
            {hasPartialProfile && (
                <div className="sticky top-0 z-30 bg-amber-500 text-white px-6 py-3 flex items-center justify-between gap-4 shadow">
                    <p className="text-sm font-medium">
                        Complete your profile in 2 minutes to apply directly to the universities you visited.
                    </p>
                    <Link
                        href="/onboarding/student"
                        className="shrink-0 text-amber-900 bg-white hover:bg-amber-50 font-semibold text-xs px-4 py-1.5 rounded-full transition-colors"
                    >
                        Complete Profile →
                    </Link>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                {/* ── Empty state ── */}
                {initialVisits.length === 0 ? (
                    <div className="text-center py-24 space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center mx-auto">
                            <Users className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">No fair visits yet</h2>
                        <p className="text-gray-500 max-w-xs mx-auto">
                            Register for an upcoming education fair to start connecting with universities.
                        </p>
                        <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700 mt-2">
                            <Link href="/fair">Find Upcoming Fairs →</Link>
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* ── Summary line ── */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">My Fair Visits</h1>
                            <p className="text-gray-500">
                                You visited{' '}
                                <span className="font-semibold text-indigo-700">
                                    {initialVisits.length} universit{initialVisits.length !== 1 ? 'ies' : 'y'}
                                </span>{' '}
                                across{' '}
                                <span className="font-semibold text-violet-700">
                                    {uniqueCountries} countr{uniqueCountries !== 1 ? 'ies' : 'y'}
                                </span>{' '}
                                at{' '}
                                <span className="font-semibold text-blue-700">
                                    {uniqueFairEvents} fair event{uniqueFairEvents !== 1 ? 's' : ''}
                                </span>
                            </p>
                        </div>

                        {/* ── Filter bar ── */}
                        <FilterBar
                            countries={allCountries}
                            fields={allFields}
                            country={countryFilter}
                            field={fieldFilter}
                            sort={sort}
                            onCountry={setCountryFilter}
                            onField={setFieldFilter}
                            onSort={setSort}
                        />

                        {/* ── No results after filter ── */}
                        {filtered.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <p className="text-lg font-semibold">No results match your filters</p>
                                <p className="text-sm mt-1">Try adjusting the country or field filters.</p>
                            </div>
                        ) : (
                            /* ── Country accordion groups ── */
                            <div className="space-y-4">
                                {Array.from(byCountry.entries()).map(([country, visits], i) => (
                                    <CountryAccordion
                                        key={country}
                                        country={country}
                                        visits={visits}
                                        studentId={studentId}
                                        defaultOpen={i === 0}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
