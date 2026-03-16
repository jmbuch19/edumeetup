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
            <div className="flex items-center gap-3 mb-5">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 leading-none">
                            Alumni Bridge <span className="text-base">🌉</span>
                        </h2>
                        <p className="text-xs text-gray-400 leading-none mt-0.5">
                            Connect with IAES alumni who made it to the USA
                        </p>
                    </div>
                </div>
                {total > 0 && (
                    <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                        {total} alumni available
                    </span>
                )}
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
                <div className="text-center py-12 text-gray-400">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">No alumni found</p>
                    <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
