'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { confirmFairParticipation } from '@/app/university/fairs/actions'

interface Program {
    id: string
    name: string
    programName?: string     // alias — accept either shape
    degreeLevel?: string | null
}

interface FairResponsePanelProps {
    fairEventId: string
    fairName: string
    fairDate: string
    programs: Program[]
    onClose: () => void
    onSuccess: () => void
    // Legacy compat — also accept the old shape if needed
    open?: boolean
    onConfirmed?: () => void
    fair?: { id: string; name: string; city: string | null; startDate: string }
}

export function FairResponsePanel({
    // New flat props (spec)
    fairEventId,
    fairName,
    fairDate,
    onClose,
    onSuccess,
    // Legacy nested props (backward compat)
    open,
    onConfirmed,
    fair,
    programs,
}: FairResponsePanelProps) {
    // Normalise props — support both calling conventions
    const _eventId = fairEventId ?? fair?.id ?? ''
    const _name = fairName ?? fair?.name ?? ''
    const _date = fairDate ?? fair?.startDate ?? ''
    const _onClose = onClose
    const _onSuccess = onSuccess ?? onConfirmed ?? (() => { })

    const [repsCount, setRepsCount] = useState<1 | 2 | 3 | null>(null)  // null = not chosen yet
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
    const [specialReqs, setSpecialReqs] = useState('')
    const [inlineError, setInlineError] = useState<string | null>(null)
    const [pending, start] = useTransition()

    const allSelected = programs.length > 0 && selectedPrograms.length === programs.length

    // Support both `name` and `programName` field shapes
    const progName = (p: Program) => p.programName ?? p.name

    const toggleProgram = (name: string) => {
        setSelectedPrograms(prev =>
            prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
        )
    }

    const toggleSelectAll = () => {
        setSelectedPrograms(allSelected ? [] : programs.map(p => progName(p)))
    }

    const handleSubmit = () => {
        if (repsCount === null) return
        setInlineError(null)
        start(async () => {
            const res = await confirmFairParticipation(_eventId, {
                repsAttending: repsCount,
                programsShowcasing: selectedPrograms,
                specialRequirements: specialReqs.trim() || undefined,
            })
            if (res.ok) {
                toast.success(`You're confirmed for ${_name}!`)
                _onSuccess()
            } else {
                setInlineError(res.error)
            }
        })
    }

    // Support both open prop and always-mounted usage
    if (open === false) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={_onClose}
            />

            {/* Slide-in panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="font-semibold text-gray-900">Confirm Participation</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {_name} · {_date}
                        </p>
                    </div>
                    <button
                        onClick={_onClose}
                        className="text-gray-400 hover:text-gray-600 mt-0.5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Rep count */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                            How many representatives will attend?
                        </p>
                        <div className="flex gap-2">
                            {([1, 2, 3] as const).map(n => (
                                <button
                                    key={n}
                                    onClick={() => setRepsCount(n)}
                                    className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${repsCount === n
                                        ? 'bg-teal-600 text-white border-teal-600'
                                        : 'border-gray-200 text-gray-600 hover:border-teal-300 hover:bg-teal-50'
                                        }`}
                                >
                                    {n === 3 ? '3+' : n}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Programs */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">
                                Which programs are you promoting?
                                <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                            </p>
                            {programs.length > 0 && (
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-xs text-teal-600 hover:text-teal-800 shrink-0 ml-2"
                                >
                                    {allSelected ? 'Deselect all' : 'Select all'}
                                </button>
                            )}
                        </div>
                        {programs.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">
                                No programs listed yet. You can still confirm attendance.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {programs.map(p => {
                                    const pn = progName(p)
                                    const isSelected = selectedPrograms.includes(pn)
                                    return (
                                        <label
                                            key={p.id}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-all ${isSelected
                                                ? 'border-teal-400 bg-teal-50 text-teal-800'
                                                : 'border-gray-100 hover:border-teal-200 hover:bg-teal-50/30'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleProgram(pn)}
                                                className="accent-teal-600 w-4 h-4 shrink-0"
                                            />
                                            <span className="flex-1 leading-tight">
                                                {pn}
                                                {p.degreeLevel && (
                                                    <span className="text-xs text-gray-400 ml-1.5">
                                                        {p.degreeLevel}
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Special requirements */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                            Special requirements?
                            <span className="text-gray-400 font-normal ml-1">(optional)</span>
                        </p>
                        <Textarea
                            value={specialReqs}
                            onChange={e => setSpecialReqs(e.target.value)}
                            placeholder="e.g., Power outlet, banner stand, projector screen…"
                            rows={3}
                            className="rounded-xl resize-none text-sm"
                        />
                    </div>

                    {/* Inline error */}
                    {inlineError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {inlineError}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        disabled={repsCount === null || pending}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2"
                    >
                        {pending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-4 h-4" />
                        )}
                        {pending ? 'Confirming…' : 'Confirm Participation'}
                    </Button>
                </div>
            </div>
        </>
    )
}
