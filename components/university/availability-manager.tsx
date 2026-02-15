'use client'

import React, { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { deleteAvailabilitySlot, setAvailability } from '@/app/actions/availability'
import { useRouter } from 'next/navigation'

interface Slot {
    id: string
    startTime: Date
    endTime: Date
    isBooked: boolean
}

export function AvailabilityManager({ initialSlots }: { initialSlots: Slot[] }) {
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [time, setTime] = useState<string>("09:00")
    const [duration, setDuration] = useState<number>(30) // minutes
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleAddSlot = async () => {
        if (!date || !time) return

        const [hours, minutes] = time.split(':').map(Number)
        const startTime = new Date(date)
        startTime.setHours(hours, minutes, 0, 0)

        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + duration)

        startTransition(async () => {
            const result = await setAvailability([{ startTime, endTime }])
            if (result.success) {
                // simple toast or alert?
                // For MVP just refresh
                router.refresh()
            } else {
                alert("Failed to add slot")
            }
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this slot?")) return
        startTransition(async () => {
            await deleteAvailabilitySlot(id)
            router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Add Slot Form */}
                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm w-full md:w-1/3 space-y-4 h-fit">
                    <h3 className="font-semibold text-lg">Add Availability</h3>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Time</label>
                            <input
                                type="time"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Duration (min)</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                            >
                                <option value={15}>15m</option>
                                <option value={30}>30m</option>
                                <option value={45}>45m</option>
                                <option value={60}>1h</option>
                            </select>
                        </div>
                    </div>

                    <Button onClick={handleAddSlot} disabled={isPending} className="w-full">
                        {isPending ? "Adding..." : <><Plus className="mr-2 h-4 w-4" /> Add Slot</>}
                    </Button>
                </div>

                {/* Slots List */}
                <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm w-full md:w-2/3">
                    <h3 className="font-semibold text-lg mb-4">Upcoming Slots</h3>
                    {initialSlots.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            No availability slots set.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {initialSlots.map(slot => (
                                <div key={slot.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 text-blue-700 font-bold p-2 rounded text-xs text-center min-w-[50px]">
                                            {format(new Date(slot.startTime), "MMM d")}
                                        </div>
                                        <div>
                                            <div className="font-medium">
                                                {format(new Date(slot.startTime), "h:mm a")} - {format(new Date(slot.endTime), "h:mm a")}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {slot.isBooked ?
                                                    <span className="text-red-500 font-bold">Booked</span> :
                                                    <span className="text-green-600">Available</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    {!slot.isBooked && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDelete(slot.id)}
                                            disabled={isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
