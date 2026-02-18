'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookingState } from './BookingWizard'
import { MeetingPurposes } from '@/lib/constants'
import { Briefcase, GraduationCap, HelpCircle, FileText, TrendingUp, MoreHorizontal } from 'lucide-react'

// Icon map helper
const Icons: Record<string, any> = {
    ADMISSION_QUERY: Briefcase,
    PROGRAM_FIT: GraduationCap,
    SCHOLARSHIP_INFO: TrendingUp,
    DOCUMENT_HELP: FileText,
    APPLICATION_STATUS: HelpCircle,
    OTHER: MoreHorizontal
}

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    onNext: () => void
    onBack?: () => void
}

export default function Step1Purpose({ data, updateData, onNext }: StepProps) {
    const isComplete = !!data.purpose

    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h2 className="text-xl font-semibold mb-2">What would you like to discuss?</h2>
                <p className="text-slate-500">Choose a topic so we can prepare for your meeting.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {MeetingPurposes.map((purpose) => {
                    const Icon = Icons[purpose.value] || MoreHorizontal
                    const isSelected = data.purpose === purpose.value

                    return (
                        <div
                            key={purpose.value}
                            onClick={() => updateData({ purpose: purpose.value })}
                            className={`
                                cursor-pointer p-4 rounded-xl border-2 transition-all hover:bg-slate-50
                                flex flex-col items-center justify-center gap-3 text-center h-32
                                ${isSelected
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-slate-100 text-slate-600 hover:border-slate-200'}
                            `}
                        >
                            <Icon className={`h-8 w-8 ${isSelected ? 'text-primary' : 'text-slate-400'}`} />
                            <span className="font-medium text-sm">{purpose.label}</span>
                        </div>
                    )
                })}
            </div>

            <div className="space-y-3 pt-4">
                <Label>Specific Questions (Optional)</Label>
                <Textarea
                    placeholder="e.g., I have a question about the CS program prerequisites..."
                    value={data.studentQuestions || ''}
                    onChange={(e) => updateData({ studentQuestions: e.target.value })}
                    className="min-h-[100px]"
                />
                <p className="text-xs text-slate-400">Max 1000 characters.</p>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={onNext} disabled={!isComplete} size="lg">
                    Next Step
                </Button>
            </div>
        </div>
    )
}
