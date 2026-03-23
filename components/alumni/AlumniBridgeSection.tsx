'use client'

import { useState, useEffect, useTransition } from 'react'
import { listVerifiedAlumni } from '@/app/actions/alumni'
import AlumniCard from '@/components/alumni/AlumniCard'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { GraduationCap, Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { ALUMNI_HELP_TOPIC_OPTIONS, ALUMNI_STATUS_OPTIONS } from '@/lib/schemas'

type AlumniResult = Awaited<ReturnType<typeof listVerifiedAlumni>>

export default function AlumniBridgeSection() {
    const [data, setData] = useState<AlumniResult | null>(null)
    const [isPending, startTransition] = useTransition()
    const [filters, setFilters] = useState({
        universityName: '',
        helpTopic: '',
        alumniStatus: '',
        page: 1,
    })
    const [uniSearch, setUniSearch] = useState('')

    const load = (f = filters) => {
        startTransition(async () => {
            const res = await listVerifiedAlumni({
                universityName: f.universityName || undefined,
                helpTopic: f.helpTopic || undefined,
                alumniStatus: f.alumniStatus || undefined,
                page: f.page,
            })
            setData(res)
        })
    }

    useEffect(() => { load() }, [])  // eslint-disable-line

    const applyFilters = () => {
        const next = { ...filters, universityName: uniSearch, page: 1 }
        setFilters(next)
        load(next)
    }

    const changePage = (newPage: number) => {
        const next = { ...filters, page: newPage }
        setFilters(next)
        load(next)
    }

    const updateFilter = (key: string, value: string) => {
        const next = { ...filters, [key]: value === 'all' ? '' : value, page: 1 }
        setFilters(next)
        load(next)
    }

    const alumni = 'alumni' in (data ?? {}) ? (data as any).alumni : []
    const total = 'total' in (data ?? {}) ? (data as any).total : 0
    const totalPages = 'totalPages' in (data ?? {}) ? (data as any).totalPages : 1

    return (
        <section className="mt-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 bg-indigo-gradient rounded-2xl px-6 py-5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20 shrink-0">
                        <span className="text-2xl animate-float">🌉</span>
                    </div>
                    <div>
                        <h2 className="text-[24px] font-[900] text-white leading-none flex items-center gap-2 mb-1.5" style={{ fontFamily: 'var(--font-fraunces)' }}>
                            Alumni Bridge
                            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse-gold inline-block mb-1 shadow-[0_0_8px_rgba(201,168,76,0.6)]"></span>
                        </h2>
                        <p className="text-[14px] leading-tight" style={{ color: '#C9A84C', fontFamily: 'var(--font-jakarta)' }}>
                            Connect with IAES alumni who made it to the USA
                        </p>
                    </div>
                </div>
                {total > 0 && (
                    <span className="md:ml-auto w-fit text-xs font-bold text-[#0B1340] bg-[#C9A84C] px-3 py-1.5 rounded-full shadow-lg">
                        {total} alumni available
                    </span>
                )}
            </div>

            {/* Milestone Notification */}
            <div className="mb-6 glass-card-gold rounded-xl p-4 flex items-center gap-4 animate-pop shadow-md border border-[#C9A84C]/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-l from-white/40 to-transparent pointer-events-none" />
                <div className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-white/60 border border-[#C9A84C]/30 shadow-sm">
                    <span className="text-xl animate-float" style={{ animationDelay: '0.5s' }}>⭐</span>
                </div>
                <div className="relative z-10">
                    <h4 className="text-[#0B1340] text-[16px] leading-tight mb-0.5" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700 }}>
                        Alumni Milestone
                    </h4>
                    <p className="text-[#0B1340]/80 text-[14px]" style={{ fontFamily: 'var(--font-jakarta)' }}>
                        Priya just got her H1B approved!
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-5">
                <div className="flex gap-1.5 flex-1 min-w-0">
                    <Input
                        placeholder="Search by university..."
                        value={uniSearch}
                        onChange={e => setUniSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && applyFilters()}
                        className="h-8 text-xs min-w-0 flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={applyFilters} className="h-8 px-2.5">
                        <Search className="w-3.5 h-3.5" />
                    </Button>
                </div>
                <Select value={filters.alumniStatus || 'all'} onValueChange={v => updateFilter('alumniStatus', v)}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]">
                        <SelectValue placeholder="Current Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {ALUMNI_STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filters.helpTopic || 'all'} onValueChange={v => updateFilter('helpTopic', v)}>
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]">
                        <SelectValue placeholder="Topic" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        {ALUMNI_HELP_TOPIC_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {(filters.universityName || filters.alumniStatus || filters.helpTopic) && (
                    <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400"
                        onClick={() => {
                            setUniSearch('')
                            const next = { universityName: '', helpTopic: '', alumniStatus: '', page: 1 }
                            setFilters(next)
                            load(next)
                        }}>
                        Clear
                    </Button>
                )}
            </div>

            {/* Grid */}
            {isPending ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
            ) : alumni.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 rounded-2xl border border-[#E8EAF6]" style={{ backgroundColor: '#F0F2FF' }}>
                    <GraduationCap className="h-12 w-12 mb-4 animate-float" style={{ color: '#C9A84C' }} />
                    <h3 className="mb-2" style={{ fontFamily: 'var(--font-fraunces)', fontWeight: 700, fontSize: 20, color: '#0B1340' }}>No Alumni Found</h3>
                    <p className="mb-6 max-w-sm" style={{ fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#888888' }}>
                        Try adjusting your filters to discover more IAES alumni who made it to the USA.
                    </p>
                    <button className="px-5 py-2.5 rounded-lg text-sm font-bold hover-lift transition-transform" style={{ backgroundColor: '#C9A84C', color: '#0B1340', fontFamily: 'var(--font-jakarta)' }} onClick={() => applyFilters()}>
                        Clear Filters
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alumni.map((a: any) => (
                            <AlumniCard key={a.id} alumni={a} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-6">
                            <Button variant="outline" size="sm" disabled={filters.page <= 1}
                                onClick={() => changePage(filters.page - 1)} className="h-7 text-xs">
                                <ChevronLeft className="w-3 h-3" />
                            </Button>
                            <span className="text-xs text-gray-500">
                                Page {filters.page} of {totalPages}
                            </span>
                            <Button variant="outline" size="sm" disabled={filters.page >= totalPages}
                                onClick={() => changePage(filters.page + 1)} className="h-7 text-xs">
                                <ChevronRight className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    )
}
