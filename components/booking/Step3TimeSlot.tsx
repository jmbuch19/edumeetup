'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BookingState } from './BookingWizard'
import { format, isSameDay, addDays, startOfDay } from 'date-fns'
import { Clock } from 'lucide-react'
import type { VideoProvider } from '@prisma/client'

export interface AvailableSlot {
    id: string
    repId: string
    startTime: Date | string
    endTime: Date | string
}

interface AvailabilityProfile {
    repId: string
    dayOfWeek: string
    isActive: boolean
    videoProvider: VideoProvider
    repUser?: { id: string; name: string | null; image?: string | null }
}

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    availabilityProfiles: AvailabilityProfile[]
    availableSlots: AvailableSlot[]
    existingBookings: { startTime: Date | string; endTime: Date | string; repId: string | null }[]
    onNext: () => void
    onBack: () => void
}

export default function Step3TimeSlot({
    data, updateData, availabilityProfiles, availableSlots, onNext, onBack,
}: StepProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
    const selectedDuration = data.durationMinutes ?? 15

    const durationMatchedSlots = useMemo(() => {
        return availableSlots
            .map(slot => ({
                ...slot,
                startTime: new Date(slot.startTime),
                endTime: new Date(slot.endTime),
            }))
            .filter(slot => Math.round((slot.endTime.getTime() - slot.startTime.getTime()) / 60_000) === selectedDuration)
    }, [availableSlots, selectedDuration])

    const dates = useMemo(
        () => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i)),
        []
    )

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date)
        updateData({ slotId: undefined, startTime: undefined, repId: undefined, videoProvider: undefined })
    }

    const slotsForDay = useMemo(() => {
        return durationMatchedSlots
            .filter(slot => isSameDay(slot.startTime, selectedDate))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    }, [durationMatchedSlots, selectedDate])

    const daysWithSlots = useMemo(() => {
        return new Set(durationMatchedSlots.map(slot => format(slot.startTime, 'yyyy-MM-dd')))
    }, [durationMatchedSlots])

    const repProfile = (repId: string) => availabilityProfiles.find(profile => profile.repId === repId)
    const repName = (repId: string) => repProfile(repId)?.repUser?.name ?? 'University representative'

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-1">Select a Time</h2>
                <p className="text-sm text-slate-500">
                    Showing {selectedDuration}-minute slots in your local browser timezone.
                </p>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {dates.map(date => {
                    const isSelected = isSameDay(date, selectedDate)
                    const hasSlots = daysWithSlots.has(format(date, 'yyyy-MM-dd'))
                    return (
                        <button
                            type="button"
                            key={date.toISOString()}
                            onClick={() => handleDateSelect(date)}
                            className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all relative ${isSelected
                                ? 'bg-primary text-white border-primary shadow-md'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'} ${!hasSlots && !isSelected ? 'opacity-50' : ''}`}
                        >
                            <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                            <span className="text-xl font-bold">{format(date, 'd')}</span>
                            {hasSlots && !isSelected && (
                                <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-green-400" />
                            )}
                        </button>
                    )
                })}
            </div>

            <div className="min-h-[200px]">
                {slotsForDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12 gap-3">
                        <Clock className="h-10 w-10 opacity-20" />
                        <p>No {selectedDuration}-minute slots on this day.</p>
                        <Button variant="link" onClick={() => handleDateSelect(addDays(selectedDate, 1))}>
                            Check next day
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slotsForDay.map(slot => {
                            const isSelected = data.slotId === slot.id
                            const profile = repProfile(slot.repId)
                            return (
                                <button
                                    type="button"
                                    key={slot.id}
                                    onClick={() => updateData({
                                        slotId: slot.id,
                                        startTime: slot.startTime.toISOString(),
                                        repId: slot.repId,
                                        videoProvider: profile?.videoProvider,
                                    })}
                                    className={`py-2 px-1 rounded-lg text-sm font-medium border transition-all ${isSelected
                                        ? 'bg-primary text-white border-primary ring-2 ring-primary/20'
                                        : 'bg-white border-slate-200 hover:border-primary text-slate-700'}`}
                                >
                                    <span className="block">{format(slot.startTime, 'HH:mm')}</span>
                                    <span className="block text-xs opacity-70 truncate">{repName(slot.repId)}</span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-100">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onNext} disabled={!data.slotId} size="lg">Review</Button>
            </div>
        </div>
    )
}
