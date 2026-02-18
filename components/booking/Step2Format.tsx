'use client'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { BookingState } from './BookingWizard'
import { MeetingDurations } from '@/lib/constants'
import { Clock, Video, VideoOff } from 'lucide-react'

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    onNext: () => void
    onBack: () => void
}

export default function Step2Format({ data, updateData, onNext, onBack }: StepProps) {
    return (
        <div className="space-y-8 max-w-lg mx-auto">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Meeting Format</h2>
                <p className="text-slate-500">Choose how long you need.</p>
            </div>

            <div className="space-y-4">
                <Label className="text-base">Duration</Label>
                <div className="grid grid-cols-3 gap-4">
                    {MeetingDurations.map(duration => {
                        const isSelected = data.durationMinutes === duration
                        return (
                            <div
                                key={duration}
                                onClick={() => updateData({ durationMinutes: duration })}
                                className={`
                                    cursor-pointer py-4 px-2 rounded-lg border-2 text-center transition-all
                                    ${isSelected
                                        ? 'border-primary bg-primary/5 text-primary font-bold'
                                        : 'border-slate-100 text-slate-600 hover:border-slate-200'}
                                `}
                            >
                                {duration} min
                                {duration === 15 && <span className="block text-xs font-normal mt-1 opacity-70">Recommended</span>}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {data.audioOnly ? <VideoOff className="h-5 w-5 text-slate-500" /> : <Video className="h-5 w-5 text-primary" />}
                    <div>
                        <Label className="font-medium text-slate-900 block">Audio-only mode</Label>
                        <span className="text-xs text-slate-500">Turn this on if you have a slow internet connection.</span>
                    </div>
                </div>
                <Switch
                    checked={data.audioOnly}
                    onCheckedChange={(checked) => updateData({ audioOnly: checked })}
                />
            </div>

            <div className="flex justify-between pt-8">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onNext} size="lg">Next Step</Button>
            </div>
        </div>
    )
}
