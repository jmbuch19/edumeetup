'use client'

import { useState, useEffect } from 'react'
import { Building2, LayoutList, ChevronDown, ChevronRight, MapPin, GraduationCap, Globe } from 'lucide-react'
import Link from 'next/link'
import { UniversityCard } from '@/components/university-card'

type View = 'grouped' | 'flat'

// ── Types matched to Prisma return shapes ──────────────────────────────────────

interface ProgramPreview {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string | null
}

interface School {
    id: string
    institutionName: string
    country: string
    city: string | null
    logo: string | null
    groupSlug: string | null
    verificationStatus: string
    programs: ProgramPreview[]
}

interface Parent {
    id: string
    institutionName: string
    country: string
    city: string | null
    logo: string | null
    groupSlug: string | null
    schools: School[]
    programs: { id: string }[]   // own programs (usually 0 for a pure parent)
}

interface FlatUni {
    id: string
    institutionName: string
    [key: string]: any
}

interface Props {
    parents: Parent[]
    standalones: FlatUni[]
    flatUniversities: FlatUni[]
    userRole?: string
    totalPages: number
    currentPage: number
    flatQuery: string
    flatCountry: string
    flatField: string
    searchParams: Record<string, string | string[] | undefined>
}

const STORAGE_KEY = 'em_uni_browse_view'

// ── Country flag helper ────────────────────────────────────────────────────────
const FLAG_MAP: Record<string, string> = {
    'United States': '🇺🇸', 'USA': '🇺🇸',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧',
    'Canada': '🇨🇦', 'Australia': '🇦🇺',
    'New Zealand': '🇳🇿', 'Germany': '🇩🇪',
    'Ireland': '🇮🇪', 'Netherlands': '🇳🇱',
    'India': '🇮🇳', 'Singapore': '🇸🇬',
}
function flag(country: string) { return FLAG_MAP[country] ?? '🌐' }

// ── Grouped: Parent card with expandable schools ───────────────────────────────

function ParentCard({ parent, userRole }: { parent: Parent; userRole?: string }) {
    const [open, setOpen] = useState(false)
    const schoolCount = parent.schools.length
    const totalPrograms = parent.schools.reduce((acc, s) => acc + s.programs.length, 0) + parent.programs.length

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            {/* Parent header */}
            <div className="px-6 py-5 flex items-start gap-4">
                {parent.logo ? (
                    <img src={parent.logo} alt={parent.institutionName} className="w-14 h-14 rounded-xl object-contain border border-gray-100 bg-white shrink-0" />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-2xl shrink-0">
                        {parent.institutionName.charAt(0).toUpperCase()}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight">{parent.institutionName}</h3>
                        <span className="text-xl">{flag(parent.country)}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {parent.city ? `${parent.city}, ` : ''}{parent.country}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {schoolCount} {schoolCount === 1 ? 'school' : 'schools'}
                        </span>
                        <span className="flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {totalPrograms} programs
                        </span>
                        {parent.groupSlug && (
                            <Link
                                href={`/universities/group/${parent.groupSlug}`}
                                className="flex items-center gap-1 text-indigo-600 hover:underline"
                            >
                                <Globe className="h-3.5 w-3.5" /> View all →
                            </Link>
                        )}
                    </div>
                </div>
                {schoolCount > 0 && (
                    <button
                        onClick={() => setOpen(v => !v)}
                        className="shrink-0 flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors mt-1"
                    >
                        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {open ? 'Hide' : 'Show'} schools
                    </button>
                )}
            </div>

            {/* Schools list */}
            {open && schoolCount > 0 && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {parent.schools.map(school => (
                        <Link
                            key={school.id}
                            href={`/universities/${school.id}`}
                            className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 transition-colors group"
                        >
                            {school.logo ? (
                                <img src={school.logo} alt={school.institutionName} className="w-9 h-9 rounded-lg object-contain border border-gray-100 bg-white shrink-0" />
                            ) : (
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                    {school.institutionName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 text-sm group-hover:text-indigo-700 transition-colors truncate">
                                    {school.institutionName}
                                </p>
                                {school.programs.length > 0 && (
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {school.programs.slice(0, 3).map(p => p.programName).join(' · ')}
                                        {school.programs.length > 3 ? ` +${school.programs.length - 3} more` : ''}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-gray-400 shrink-0 group-hover:text-indigo-500 mt-0.5">→</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main browse client ─────────────────────────────────────────────────────────

export function UniversityBrowseClient({
    parents,
    standalones,
    flatUniversities,
    userRole,
    totalPages,
    currentPage,
    flatQuery,
    flatCountry,
    flatField,
    searchParams,
}: Props) {
    const [view, setView] = useState<View>('flat') // SSR safe default

    // Restore saved preference from localStorage after hydration
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY) as View | null
            if (saved === 'grouped' || saved === 'flat') setView(saved)
        } catch { /* localStorage may be unavailable */ }
    }, [])

    function switchView(v: View) {
        setView(v)
        try { localStorage.setItem(STORAGE_KEY, v) } catch { /* ignore */ }
    }

    const hasGroups = parents.length > 0

    return (
        <div className="space-y-6">
            {/* View toggle — only shown if there are parent institutions */}
            {hasGroups && (
                <div className="flex items-center gap-2">
                    <div className="inline-flex bg-gray-100 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => switchView('grouped')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'grouped'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Building2 className="h-4 w-4" />
                            By Institution
                        </button>
                        <button
                            onClick={() => switchView('flat')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'flat'
                                ? 'bg-white text-indigo-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutList className="h-4 w-4" />
                            All Schools
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">
                        {view === 'grouped'
                            ? `${parents.length} institution${parents.length !== 1 ? 's' : ''} · ${standalones.length} standalone`
                            : `${flatUniversities.length} verified schools`
                        }
                    </p>
                </div>
            )}

            {/* Grouped view */}
            {view === 'grouped' && hasGroups && (
                <div className="space-y-4">
                    {parents.map(p => (
                        <ParentCard key={p.id} parent={p} userRole={userRole} />
                    ))}
                    {standalones.length > 0 && (
                        <>
                            <h3 className="text-sm font-medium text-gray-500 pt-2">Independent Universities</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {standalones.map(uni => (
                                    <UniversityCard key={uni.id} university={uni as any} userRole={userRole} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Flat view (existing) */}
            {(view === 'flat' || !hasGroups) && (
                <>
                    {flatUniversities.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {flatUniversities.map(uni => (
                                <UniversityCard key={uni.id} university={uni as any} userRole={userRole} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <h3 className="text-lg font-medium">No universities found</h3>
                            <p className="text-muted-foreground">Try adjusting your filters.</p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            {currentPage > 1 && (
                                <a href={`?${new URLSearchParams({ ...(flatQuery && { q: flatQuery }), ...(flatCountry && { country: flatCountry }), ...(flatField && { field: flatField }), page: String(currentPage - 1) })}`}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >← Previous</a>
                            )}
                            <span className="py-2 px-4 text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            {currentPage < totalPages && (
                                <a href={`?${new URLSearchParams({ ...(flatQuery && { q: flatQuery }), ...(flatCountry && { country: flatCountry }), ...(flatField && { field: flatField }), page: String(currentPage + 1) })}`}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                >Next →</a>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
