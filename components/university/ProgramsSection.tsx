'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgramCard } from '@/components/university/ProgramCard'
import { expressInterestBulk } from '@/app/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Program {
    id: string
    programName: string
    degreeLevel: string
    fieldCategory: string
    durationMonths?: number | null
    tuitionFee?: number | null
    currency?: string | null
    intakes: string[]
    stemDesignated: boolean
    description?: string | null
    englishTests: string[]
    minEnglishScore?: number | null
    satRequired?: string | null
    satMinScore?: number | null
    satMaxScore?: number | null
    actRequired?: string | null
    actMinScore?: number | null
    actMaxScore?: number | null
    greRequired?: string | null
    greMinScore?: number | null
    greMaxScore?: number | null
    gmatRequired?: string | null
    gmatMinScore?: number | null
    gmatMaxScore?: number | null
    scholarshipAvail?: string | null
    scholarshipDetails?: string | null
    applicationFee?: number | null
    applicationFeeCur?: string | null
    appDeadlineType?: string | null
    appDeadlineDate?: Date | string | null
    workExpYears?: number | null
    minGpa?: number | null
    minPercentage?: number | null
    coopAvailable?: boolean | null
    specialisations?: string[] | null
}

interface ProgramsSectionProps {
    programs: Program[]
    isLoggedIn: boolean
    universityId: string
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProgramsSection({ programs, isLoggedIn, universityId }: ProgramsSectionProps) {
    const [selected, setSelected] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()

    const toggleSelect = (programId: string) => {
        setSelected(prev =>
            prev.includes(programId)
                ? prev.filter(id => id !== programId)
                : [...prev, programId]
        )
    }

    const handleExpressInterest = () => {
        startTransition(async () => {
            try {
                const result = await expressInterestBulk(universityId, selected)
                if (result?.error) {
                    toast.error(result.error)
                } else {
                    const count = result?.count ?? selected.length
                    const skipped = result?.skipped ?? 0
                    toast.success(
                        skipped > 0
                            ? `Interest expressed in ${count} programme${count !== 1 ? 's' : ''}. ${skipped} already registered.`
                            : `Interest expressed in ${count} programme${count !== 1 ? 's' : ''}!`
                    )
                    setSelected([])
                }
            } catch {
                toast.error('Something went wrong. Please try again.')
            }
        })
    }

    if (programs.length === 0) return null

    return (
        <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4">
                Programmes ({programs.length})
                {isLoggedIn && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        — select one or more to express interest
                    </span>
                )}
            </h2>

            {/* ── Program grid ── */}
            <div className="grid sm:grid-cols-2 gap-4">
                {programs.map(program => (
                    <ProgramCard
                        key={program.id}
                        program={program}
                        isLoggedIn={isLoggedIn}
                        universityId={universityId}
                        selected={selected.includes(program.id)}
                        onToggleSelect={isLoggedIn ? () => toggleSelect(program.id) : undefined}
                    />
                ))}
            </div>

            {/* ── Floating action bar — appears when ≥1 selected ── */}
            {selected.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                    bg-white border border-gray-200 shadow-2xl rounded-2xl px-6 py-4
                    flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200">

                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 text-sm">
                            {selected.length} programme{selected.length > 1 ? 's' : ''} selected
                        </span>
                        <span className="text-xs text-gray-400">
                            {programs
                                .filter(p => selected.includes(p.id))
                                .map(p => p.programName)
                                .join(', ')
                                .slice(0, 60)}{selected.length > 1 ? '...' : ''}
                        </span>
                    </div>

                    <Button
                        onClick={handleExpressInterest}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                        {isPending
                            ? <><Loader2 size={14} className="animate-spin mr-2" />Sending...</>
                            : `Express Interest in All →`
                        }
                    </Button>

                    <button
                        onClick={() => setSelected([])}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                        aria-label="Clear selection"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    )
}
