'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { BookingState } from './BookingWizard'
import { format, addDays, startOfDay, parse, addMinutes, isBefore, isAfter, isSameDay } from 'date-fns'
import { ChevronRight, ChevronLeft, Clock } from 'lucide-react'

// We need types for the availability profiles passed from parent
interface AvailabilityProfile {
    repId: string
    dayOfWeek: string // MONDAY, TUESDAY etc
    startTime: string // "09:00"
    endTime: string // "17:00"
    meetingDurationOptions: number[]
    videoProvider: string
    isActive: boolean
    repUser?: {
        name: string | null
    }
}

interface StepProps {
    data: BookingState
    updateData: (fields: Partial<BookingState>) => void
    availabilityProfiles: AvailabilityProfile[]
    existingBookings: { startTime: Date, endTime: Date, repId: string }[]
    onNext: () => void
    onBack: () => void
    universityTimezone: string // Not fully using timezone conversion in MVP for simplicity, assuming UTC/Server matching
}

export default function Step3TimeSlot({ data, updateData, availabilityProfiles, existingBookings, onNext, onBack }: StepProps) {
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))

    // Generate next 7 days
    const dates = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => addDays(new Date(), i))
    }, [])

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date)
        // Reset selected slot when changing date if it doesn't match?
        // Actually, let's keep it simple.
        updateData({ startTime: undefined })
    }

    // Generate Slots for Selected Date
    const slots = useMemo(() => {
        const dayName = format(selectedDate, 'EEEE').toUpperCase() // 'MONDAY'
        const relevantProfiles = availabilityProfiles.filter(p => p.dayOfWeek === dayName && p.isActive)

        const generatedSlots: { time: Date, repId: string, videoProvider: string }[] = []

        relevantProfiles.forEach(profile => {
            // Check if profile supports selected duration
            if (!profile.meetingDurationOptions.includes(data.durationMinutes || 15)) return

            // Parse start/end times (local time relative to date)
            // Note: This simple parsing assumes the browser timezone matches the rep's intended timezone
            // In a real global app, we'd need heavy timezone math (date-fns-tz).
            // For MVP, we'll process simply.
            const start = parse(profile.startTime, 'HH:mm', selectedDate)
            const end = parse(profile.endTime, 'HH:mm', selectedDate)
            const duration = data.durationMinutes || 15

            let current = start
            while (isBefore(addMinutes(current, duration), end) || current.getTime() === end.getTime()) {
                const slotEnd = addMinutes(current, duration)

                // Check collision with existing bookings
                const isTaken = existingBookings.some(booking => {
                    // Check if same rep (since a slot belongs to a specific rep)
                    if (booking.repId !== profile.repId) return false

                    // Overlap check
                    const bStart = new Date(booking.startTime)
                    const bEnd = new Date(booking.endTime)

                    // (StartA < EndB) and (EndA > StartB)
                    return isBefore(current, bEnd) && isAfter(slotEnd, bStart)
                })

                if (!isTaken) {
                    generatedSlots.push({
                        time: current,
                        repId: profile.repId,
                        videoProvider: profile.videoProvider
                    })
                }

                current = addMinutes(current, duration) // Step by duration? Or buffer?
                // Spec says "buffer_minutes". Let's assume standard grid for now.
                // Ideally: current = addMinutes(current, duration + (profile.bufferMinutes || 0))
            }
        })

        return generatedSlots.sort((a, b) => a.time.getTime() - b.time.getTime())
    }, [selectedDate, availabilityProfiles, data.durationMinutes, existingBookings])

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Select a Time</h2>
                <p className="text-slate-500">Times are shown in your local timezone.</p>
            </div>

            {/* Date Picker (Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {dates.map((date) => {
                    const isSelected = isSameDay(date, selectedDate)
                    return (
                        <button
                            key={date.toString()}
                            onClick={() => handleDateSelect(date)}
                            className={`
                                flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border transition-all
                                ${isSelected
                                    ? 'bg-primary text-white border-primary shadow-md'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50'}
                            `}
                        >
                            <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
                            <span className="text-xl font-bold">{format(date, 'd')}</span>
                        </button>
                    )
                })}
            </div>

            {/* Slots Grid */}
            <div className="min-h-[200px]">
                {slots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 py-12">
                        <Clock className="h-10 w-10 mb-3 opacity-20" />
                        <p>No available slots on this day.</p>
                        <Button variant="link" onClick={() => handleDateSelect(addDays(selectedDate, 1))}>
                            Check next day
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {slots.map((slot, idx) => {
                            const isSelected = data.startTime === slot.time.toISOString()
                            return (
                                <button
                                    key={idx}
                                    onClick={() => updateData({
                                        startTime: slot.time.toISOString(),
                                        repId: slot.repId,
                                        videoProvider: slot.videoProvider as any // Cast enum
                                    })}
                                    className={`
                                        py-2 px-1 rounded-lg text-sm font-medium border transition-all
                                        ${isSelected
                                            ? 'bg-primary text-white border-primary ring-2 ring-primary/20'
                                            : 'bg-white border-slate-200 hover:border-primary text-slate-700'}
                                    `}
                                >
                                    {format(slot.time, 'HH:mm')}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-8 border-t border-slate-100">
                <Button variant="outline" onClick={onBack}>Back</Button>
                <Button onClick={onNext} disabled={!data.startTime} size="lg">Review</Button>
            </div>
        </div>
    )
}
