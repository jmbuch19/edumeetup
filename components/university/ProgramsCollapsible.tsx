'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ChevronDown, ExternalLink, X } from 'lucide-react'
import { expressInterestBulk } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string
    durationMonths: number | null
    tuitionFee: number | null
    currency: string | null
    intakes: string[]
    stemDesignated: boolean
    coopAvailable: boolean
    greRequired: string | null
    gmatRequired: string | null
    satRequired: string | null
    actRequired: string | null
    greMinScore: number | null
    greMaxScore: number | null
    gmatMinScore: number | null
    gmatMaxScore: number | null
    scholarshipAvail: string | null
    scholarshipDetails: string | null
    appDeadlineType: string | null
    appDeadlineDate: Date | null
    specialisations: string[]
    programUrl: string | null
}

interface ProgramsCollapsibleProps {
    programs: Program[]
    isLoggedIn: boolean
    universityId: string
}

export function ProgramsCollapsible({
    programs,
    isLoggedIn,
    universityId,
}: ProgramsCollapsibleProps) {
    const [open, setOpen] = useState(false)
    const [selected, setSelected] = useState<string[]>([])
    const [submitting, startTransition] = useTransition()
    const router = useRouter()

    function toggleSelect(programId: string) {
        setSelected(prev =>
            prev.includes(programId)
                ? prev.filter(id => id !== programId)
                : [...prev, programId]
        )
    }

    function handleExpressInterest() {
        startTransition(async () => {
            const res = await expressInterestBulk(universityId, selected)
            if (res.error) {
                toast.error(res.error)
            } else if (res.count !== undefined && res.skipped !== undefined) {
                const msg = res.skipped > 0
                    ? `${res.count} added, ${res.skipped} already registered`
                    : `${res.count} programme${res.count !== 1 ? 's' : ''} selected! ✅`
                toast.success(msg)
                setSelected([])
                router.refresh()
            }
        })
    }

    if (programs.length === 0) return null

    return (
        <div className="relative">

            {/* ── Collapsible trigger ── */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between
                    bg-white border rounded-xl px-5 py-4
                    hover:bg-gray-50 transition-colors shadow-sm"
            >
                <span className="font-semibold text-gray-900 flex items-center gap-2">
                    📚 Browse Our Programs
                    <span className="text-sm font-normal text-muted-foreground">
                        ({programs.length})
                    </span>
                </span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform
                    duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {/* ── Expanded program list ── */}
            {open && (
                <div className="border border-t-0 rounded-b-xl overflow-hidden
                    divide-y bg-white shadow-sm">
                    {programs.map(program => (
                        <div key={program.id}
                            className={`px-5 py-4 hover:bg-gray-50/50 transition-colors
                                ${selected.includes(program.id)
                                    ? 'bg-blue-50/40 border-l-2 border-l-blue-500'
                                    : ''
                                }`}
                        >
                            {/* Line 1: Name + Select button */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    {program.programUrl ? (
                                        <a href={program.programUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={e => e.stopPropagation()}
                                            className="font-semibold text-gray-900
                                                hover:text-blue-600 hover:underline
                                                truncate flex items-center gap-1 text-sm"
                                        >
                                            {program.programName}
                                            <ExternalLink className="h-3 w-3
                                                flex-shrink-0 text-gray-400" />
                                        </a>
                                    ) : (
                                        <span className="font-semibold text-gray-900
                                            truncate text-sm">
                                            {program.programName}
                                        </span>
                                    )}
                                </div>
                                {isLoggedIn && (
                                    <button
                                        onClick={() => toggleSelect(program.id)}
                                        className={`flex-shrink-0 text-xs px-3 py-1.5
                                            rounded-full border font-medium
                                            transition-all whitespace-nowrap
                                            ${selected.includes(program.id)
                                                ? 'bg-green-600 text-white border-green-600'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                            }`}
                                    >
                                        {selected.includes(program.id) ? '✅ Selected' : '+ Select'}
                                    </button>
                                )}
                            </div>

                            {/* Line 2: Degree · Field · STEM · Co-op */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className="text-xs bg-gray-100 text-gray-600
                                    rounded-full px-2 py-0.5">
                                    {program.degreeLevel}
                                </span>
                                <span className="text-xs bg-gray-100 text-gray-600
                                    rounded-full px-2 py-0.5">
                                    {program.fieldCategory}
                                </span>
                                {program.stemDesignated && (
                                    <span className="text-xs bg-green-50 text-green-700
                                        border border-green-200 rounded-full px-2 py-0.5">
                                        🔬 STEM
                                    </span>
                                )}
                                {program.coopAvailable && (
                                    <span className="text-xs bg-blue-50 text-blue-700
                                        border border-blue-200 rounded-full px-2 py-0.5">
                                        💼 Co-op
                                    </span>
                                )}
                            </div>

                            {/* Line 3: Fee · Duration · Intake · Deadline */}
                            <div className="flex flex-wrap gap-3 text-xs
                                text-muted-foreground mb-2">
                                {program.tuitionFee && (
                                    <span>
                                        💰 ${program.tuitionFee.toLocaleString()}/yr
                                    </span>
                                )}
                                {program.durationMonths && (
                                    <span>⏱ {program.durationMonths} months</span>
                                )}
                                {program.intakes.length > 0 && (
                                    <span>📅 {program.intakes.join(', ')}</span>
                                )}
                                {program.appDeadlineType === 'ROLLING' && (
                                    <span>🔄 Rolling deadline</span>
                                )}
                                {program.appDeadlineType === 'FIXED' &&
                                 program.appDeadlineDate && (
                                    <span>
                                        📌 Deadline:{' '}
                                        {new Date(program.appDeadlineDate)
                                            .toLocaleDateString('en-IN', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                    </span>
                                )}
                            </div>

                            {/* Line 4: Test requirements */}
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {[
                                    { label: 'GRE',  req: program.greRequired,
                                      min: program.greMinScore,  max: program.greMaxScore },
                                    { label: 'GMAT', req: program.gmatRequired,
                                      min: program.gmatMinScore, max: program.gmatMaxScore },
                                    { label: 'SAT',  req: program.satRequired,  min: null, max: null },
                                    { label: 'ACT',  req: program.actRequired,  min: null, max: null },
                                ].filter(t => t.req).map(test => (
                                    <span key={test.label}
                                        className={`text-xs px-2 py-0.5 rounded-full border
                                            ${test.req === 'REQUIRED'
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : test.req === 'RECOMMENDED'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                    : 'bg-gray-50 text-gray-400 border-gray-200'
                                            }`}
                                    >
                                        {test.label}
                                        {test.req === 'REQUIRED' && ' ✅'}
                                        {test.req === 'RECOMMENDED' && ' ⚠️'}
                                        {test.req === 'NOT_REQUIRED' && ' ❌'}
                                        {(test.min || test.max) &&
                                         test.req !== 'NOT_REQUIRED' &&
                                            ` ${test.min ?? '?'}–${test.max ?? '?'}`
                                        }
                                    </span>
                                ))}
                            </div>

                            {/* Line 5: Scholarship */}
                            {program.scholarshipAvail &&
                             program.scholarshipAvail !== 'NO' && (
                                <p className="text-xs text-yellow-700">
                                    🎓 Scholarship:{' '}
                                    {program.scholarshipAvail === 'YES'
                                        ? 'Available'
                                        : 'May be available'}
                                    {program.scholarshipDetails &&
                                        ` — ${program.scholarshipDetails}`}
                                </p>
                            )}

                            {/* Line 6: Specialisations */}
                            {program.specialisations.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    <span className="text-xs text-gray-400 self-center">
                                        Tracks:
                                    </span>
                                    {program.specialisations.map(s => (
                                        <span key={s}
                                            className="text-xs bg-indigo-50 text-indigo-600
                                                border border-indigo-100 rounded-full px-2 py-0.5"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            )}

                        </div>
                    ))}
                </div>
            )}

            {/* ── Floating action bar ── */}
            {selected.length > 0 && isLoggedIn && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                    bg-white border shadow-2xl rounded-2xl px-6 py-4
                    flex items-center gap-4
                    animate-in slide-in-from-bottom-4 duration-200">
                    <span className="font-medium text-gray-900 text-sm">
                        {selected.length} programme{selected.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button
                        onClick={handleExpressInterest}
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700"
                        size="sm"
                    >
                        {submitting ? 'Sending...' : 'Express Interest in All →'}
                    </Button>
                    <button
                        onClick={() => setSelected([])}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Guest CTA */}
            {!isLoggedIn && open && programs.length > 0 && (
                <div className="mt-4 text-center">
                    <a href="/student/register"
                        className="text-sm text-blue-600 hover:underline">
                        Register to express interest in these programmes →
                    </a>
                </div>
            )}
        </div>
    )
}
