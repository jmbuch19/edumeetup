'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { BookingState } from './BookingWizard'
import { format, isSameDay, addDays, startOfDay } from 'date-fns'
import { Clock } from 'lucide-react'

// Real AvailabilitySlot row from the DB (returned by getBookingData)
export interface AvailableSlot {
    id: string
    repId: string
    startTime: Date | string  // serialized as string across RSC boundary
    endTime: Date | string
}

// AvailabilityProfile still used for the availability calendar key (not slot generation)
interface AvailabilityProfile {
    repId: string
    dayOfWeek: string
    isActive: boolean
    repUser?: { id: string; name: string | null; image?: string | null }
}

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    availabilityProfiles: AvailabilityProfile[]
    availableSlots: AvailableSlot[]        // real DB rows — replaces computed slots
    existingBookings: { startTime: Date | string; endTime: Date | string; repId: string }[]
    onNext: () => void
    onBack: () => void
}

export default function Step3TimeSlot({
    data, updateData, availabilityProfiles, availableSlots, existingBookings, onNext, onBack,
}: StepProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))

    // Generate next 14 days for the date picker
    const dates = useMemo(
        () => Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i)),
        []
    )

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date)
        // Reset slot selection when changing date
        updateData({ slotId: undefined, startTime: undefined })
    }

    // Filter DB slots to the selected date (comparing UTC dates)
    const slotsForDay = useMemo(() => {
        return availableSlots
            .map(s => ({
                ...s,
                startTime: new Date(s.startTime),
                endTime: new Date(s.endTime),
            }))
            .filter(s => isSameDay(s.startTime, selectedDate))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    }, [availableSlots, selectedDate])

    // Days that have at least one available slot (for calendar hint)
    const daysWithSlots = useMemo(() => {
        return new Set(
            availableSlots.map(s => format(new Date(s.startTime), 'yyyy-MM-dd'))
        )
    }, [availableSlots])

    // Rep name lookup from profiles
    const repName = (repId: string) =>
        availabilityProfiles.find(p => p.repId === repId)?.repUser?.name ?? 'Rep'

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-1">Select a Time</h2>
                <p className="text-sm text-slate-500">
                    Available slots are shown in your local browser timezone.
                </p>
            </div>

            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {dates.map(date => {
                    const isSelected = isSameDay(date, selectedDate)
                    const hasSlots = daysWithSlots.has(format(date, 'yyyy-MM-dd'))
                    return (
                        <button
                            key={date.toISOString()}
                            onClick={() => handleDateSelect(date)}
                            className={`
                                flex-shrink-0 flex flex-col items-center justify-center w-16 h-20
                                rounded-xl border transition-all relative
                                ${isSelected
                                    ? 'bg-primary text-white border-primary shadow-md'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'
                                }
                                ${!hasSlots && !isSelected ? 'opacity-50' : ''}
                            `}
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

            {/* Slot grid */}
            <div className="min-h-[200px]">
                {slotsForDay.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12 gap-3">
                        <Clock className="h-10 w-10 opacity-20" />
                        <p>No available slots on this day.</p>
                        <Button variant="link" onClick={() => handleDateSelect(addDays(selectedDate, 1))}>
                            Check next day
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slotsForDay.map(slot => {
                            const isSelected = data.slotId === slot.id
                            return (
                                <button
                                    key={slot.id}
                                    onClick={() => updateData({
                                        slotId: slot.id,           // DB primary key
                                        startTime: slot.startTime.toISOString(),
                                        repId: slot.repId,
                                    })}
                                    className={`
                                        py-2 px-1 rounded-lg text-sm font-medium border transition-all
                                        ${isSelected
                                            ? 'bg-primary text-white border-primary ring-2 ring-primary/20'
                                            : 'bg-white border-slate-200 hover:border-primary text-slate-700'
                                        }
                                    `}
                                >
                                    <span className="block">{format(slot.startTime, 'HH:mm')}</span>
                                    <span className="block text-xs opacity-70 truncate">
                                        {repName(slot.repId)}
                                    </span>
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
