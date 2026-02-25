'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, Video, Users, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { MeetingActions } from '@/components/university/meeting-actions'

interface Meeting {
    id: string
    title: string
    startTime: Date
    endTime: Date
    meetingType: string
    status: string
    joinUrl: string | null
    agenda: string | null
}

// ... inside CalendarView ...


interface AvailabilitySlot {
    id: string
    startTime: Date
    endTime: Date
    isBooked: boolean
}

interface CalendarViewProps {
    meetings: Meeting[]
    slots: AvailabilitySlot[]
}

export function CalendarView({ meetings, slots }: CalendarViewProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

    // Filter events for selected date
    const dayMeetings = meetings.filter(m => isSameDay(new Date(m.startTime), selectedDate))
    const daySlots = slots.filter(s => isSameDay(new Date(s.startTime), selectedDate))

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-auto w-full">
            {/* Calendar Grid */}
            <div className="w-full lg:w-2/3 bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col overflow-x-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                        {format(currentMonth, 'MMMM yyyy')}
                    </h2>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="min-w-[500px]">
                        <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="py-2">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1 flex-1">
                            {/* Add empty slots for start padding if needed - for MVP assuming simple grid */}
                            {/* Actually better to align days correctly. user: date-fns getDay() */}
                            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-24 bg-gray-50/30 rounded-md"></div>
                            ))}

                            {daysInMonth.map(day => {
                                const hasMeeting = meetings.some(m => isSameDay(new Date(m.startTime), day))
                                const hasSlot = slots.some(s => isSameDay(new Date(s.startTime), day) && !s.isBooked)
                                const isSelected = isSameDay(day, selectedDate)

                                return (
                                    <div
                                        key={day.toISOString()}
                                        onClick={() => setSelectedDate(day)}
                                        className={cn(
                                            "h-24 p-2 border rounded-md cursor-pointer transition-colors relative flex flex-col justify-between hover:border-primary/50",
                                            isSelected ? "border-primary bg-blue-50/30 ring-1 ring-primary" : "border-gray-100",
                                            !isSameMonth(day, currentMonth) && "text-gray-300 bg-gray-50"
                                        )}
                                    >
                                        <span className={cn(
                                            "text-sm font-medium block w-6 h-6 rounded-full flex items-center justify-center",
                                            isSameDay(day, new Date()) && "bg-primary text-white"
                                        )}>
                                            {format(day, 'd')}
                                        </span>

                                        <div className="space-y-1">
                                            {hasMeeting && (
                                                <div className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded w-fit max-w-full truncate">
                                                    <Video className="w-3 h-3" />
                                                    <span>Mtg</span>
                                                </div>
                                            )}
                                            {hasSlot && (
                                                <div className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1 py-0.5 rounded w-fit max-w-full truncate">
                                                    <CalendarIcon className="w-3 h-3" />
                                                    <span>Slot</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Details */}
            <div className="w-full lg:w-1/3 bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">
                    {format(selectedDate, 'EEEE, MMMM d')}
                </h3>

                <div className="flex-1 overflow-y-auto space-y-6">
                    {/* Meetings Section */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Meetings</h4>
                        {dayMeetings.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No meetings scheduled.</p>
                        ) : (
                            <div className="space-y-3">
                                {dayMeetings.map(meeting => (
                                    <div key={meeting.id} className="p-3 bg-indigo-50 rounded-md border border-indigo-100">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-semibold text-sm text-indigo-900">{meeting.title}</div>
                                                <div className="text-xs text-indigo-600 mt-1">
                                                    {format(new Date(meeting.startTime), 'h:mm a')} - {format(new Date(meeting.endTime), 'h:mm a')}
                                                </div>
                                            </div>
                                            {meeting.meetingType === 'GROUP' ?
                                                <Users className="w-4 h-4 text-indigo-500" /> :
                                                <Video className="w-4 h-4 text-indigo-500" />
                                            }
                                            <MeetingActions meeting={meeting} />
                                        </div>
                                        <div className="mt-2 text-xs">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded font-medium",
                                                meeting.status === 'SCHEDULED' ? "bg-green-200 text-green-800" :
                                                    meeting.status === 'COMPLETED' ? "bg-gray-200 text-gray-800" : "bg-red-200 text-red-800"
                                            )}>
                                                {meeting.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Availability Section */}
                    <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Availability Slots</h4>
                        {daySlots.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No open slots this day.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {daySlots.map(slot => (
                                    <div key={slot.id} className={cn(
                                        "p-2 rounded text-center text-xs font-medium border",
                                        slot.isBooked ? "bg-red-50 text-red-700 border-red-100" : "bg-green-50 text-green-700 border-green-100"
                                    )}>
                                        {format(new Date(slot.startTime), 'h:mm a')}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
