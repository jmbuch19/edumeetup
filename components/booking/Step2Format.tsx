'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { BookingState } from './BookingWizard'
import { MeetingDurations } from '@/lib/constants'
import { Video, VideoOff } from 'lucide-react'

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    availableDurations: number[]
    onNext: () => void
    onBack: () => void
}

export default function Step2Format({ data, updateData, availableDurations, onNext, onBack }: StepProps) {
    const durations = availableDurations.length > 0
        ? MeetingDurations.filter(duration => availableDurations.includes(duration))
        : MeetingDurations

    return (
        <div className="space-y-8 max-w-lg mx-auto">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Meeting Format</h2>
                <p className="text-slate-500">Choose from the durations currently offered by this university.</p>
            </div>

            <div className="space-y-4">
                <Label className="text-base">Duration</Label>
                <div className={`grid gap-4 ${durations.length === 1 ? 'grid-cols-1' : durations.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {durations.map(duration => {
                        const isSelected = data.durationMinutes === duration
                        return (
                            <button
                                type="button"
                                key={duration}
                                onClick={() => updateData({
                                    durationMinutes: duration,
                                    slotId: undefined,
                                    startTime: undefined,
                                    repId: undefined,
                                    videoProvider: undefined,
                                })}
                                className={`cursor-pointer py-4 px-2 rounded-lg border-2 text-center transition-all ${isSelected
                                    ? 'border-primary bg-primary/5 text-primary font-bold'
                                    : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                            >
                                {duration} min
                                {duration === 15 && <span className="block text-xs font-normal mt-1 opacity-70">Recommended</span>}
                            </button>
                        )
                    })}
                </div>
                {availableDurations.length === 0 && (
                    <p className="text-sm text-amber-700">No generated slots are available yet. You can continue to check the calendar, but the university may need to update its availability.</p>
                )}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {data.audioOnly ? <VideoOff className="h-5 w-5 text-slate-500" /> : <Video className="h-5 w-5 text-primary" />}
                    <div>
                        <Label className="font-medium text-slate-900 block">Audio-only preference</Label>
                        <span className="text-xs text-slate-500">Use audio only if your connection is limited.</span>
                    </div>
                </div>
                <Switch
                    checked={data.audioOnly}
                    onChange={(e) => updateData({ audioOnly: e.target.checked })}
                />
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onNext} size="lg">Next Step</Button>
            </div>
        </div>
    )
}
