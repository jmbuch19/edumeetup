'use client'

import { useState, useTransition } from 'react'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { confirmFairParticipation } from '@/app/actions/university/fair-invitation-actions'

interface Program {
    id: string
    name: string
    degreeLevel?: string | null
}

interface FairResponsePanelProps {
    open: boolean
    onClose: () => void
    onConfirmed: () => void
    fair: {
        id: string
        name: string
        city: string | null
        startDate: string
    }
    programs: Program[]
}

export function FairResponsePanel({
    open,
    onClose,
    onConfirmed,
    fair,
    programs,
}: FairResponsePanelProps) {
    const [repsCount, setRepsCount] = useState<1 | 2 | 3>(1)
    const [selectedPrograms, setSelectedPrograms] = useState<string[]>([])
    const [specialReqs, setSpecialReqs] = useState('')
    const [pending, start] = useTransition()

    const toggleProgram = (name: string) => {
        setSelectedPrograms(prev =>
            prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
        )
    }

    const handleSubmit = () => {
        start(async () => {
            const res = await confirmFairParticipation(fair.id, {
                repsAttending: repsCount,
                programsShowcasing: selectedPrograms,
                specialRequirements: specialReqs.trim() || undefined,
            })
            if (res.ok) {
                toast.success(`You're confirmed for ${fair.name}!`)
                onConfirmed()
            } else {
                toast.error(res.error)
            }
        })
    }

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Slide-in panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="font-semibold text-gray-900">Confirm Fair Participation</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {fair.name}
                            {fair.city ? ` · ${fair.city}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
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
                        <p className="text-sm font-medium text-gray-700">
                            Which programs are you promoting?
                            <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
                        </p>
                        {programs.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">
                                No programs listed yet. You can still confirm attendance.
                            </p>
                        ) : (
                            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                                {programs.map(p => {
                                    const isSelected = selectedPrograms.includes(p.name)
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
                                                onChange={() => toggleProgram(p.name)}
                                                className="accent-teal-600 w-4 h-4 shrink-0"
                                            />
                                            <span className="flex-1 leading-tight">
                                                {p.name}
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
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100">
                    <Button
                        onClick={handleSubmit}
                        disabled={pending}
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
