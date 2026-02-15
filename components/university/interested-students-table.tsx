'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createMeeting } from "@/app/actions"

interface InterestWithStudent {
    id: string
    student: {
        id: string
        fullName: string
        country: string | null
        user: {
            email: string
            id: string // userId needed for participant
        }
    }
    program: {
        programName: string
    } | null
    status: string
    createdAt: Date
}

interface AvailabilitySlot {
    id: string
    startTime: Date
    endTime: Date
    isBooked: boolean
}

export function InterestedStudentsTable({ interests, availabilitySlots = [] }: { interests: InterestWithStudent[], availabilitySlots?: AvailabilitySlot[] }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [scheduleMode, setScheduleMode] = useState<'MANUAL' | 'SLOT'>('SLOT')
    const [selectedSlotId, setSelectedSlotId] = useState<string>('')

    const toggleSelection = (userId: string) => {
        setSelectedIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        )
    }

    const handleScheduleClick = () => {
        if (selectedIds.length === 0) return
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)

        // Append selected participants
        selectedIds.forEach(id => formData.append('participants', id))

        // If slot selected, append ID (though hidden input should handle it if rendered)
        if (scheduleMode === 'SLOT' && selectedSlotId) {
            formData.set('availabilitySlotId', selectedSlotId)
            // also set start/end times from slot if not set? 
            // Form should have them as hidden or populated inputs if rely on actions reading them
            // createMeeting reads 'startTime'.
            // So we must ensure startTime input is populated even if hidden/disabled
            const slot = availabilitySlots.find(s => s.id === selectedSlotId)
            if (slot) {
                formData.set('startTime', new Date(slot.startTime).toISOString()) // ISO might be issue if action expects distinct format? Action uses new Date(startTime).
                // Actually action expects string potentially from datetime-local input? 
                // datetime-local is "YYYY-MM-DDTHH:mm".
                // Let's just set it to ISO string, new Date() handles it.
                // Duration is calculated in action? 'duration' field.
                // Slot has fixed end time. Action calculates end based on duration.
                // We should set duration based on slot length.
                const duration = (new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60000
                formData.set('duration', duration.toString())
            }
        }

        const result = await createMeeting(formData)
        setIsLoading(false)

        if (result?.error) {
            alert(result.error)
        } else {
            alert("Meeting Scheduled Successfully!")
            setIsModalOpen(false)
            setSelectedIds([])
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Interested Students ({interests.length})</h2>
                <Button
                    onClick={handleScheduleClick}
                    disabled={selectedIds.length === 0}
                >
                    Schedule Meeting ({selectedIds.length})
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Select</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {interests.map((interest) => (
                            <TableRow key={interest.id}>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedIds.includes(interest.student.user.id)}
                                        onChange={() => toggleSelection(interest.student.user.id)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{interest.student.fullName}</TableCell>
                                <TableCell>{interest.program?.programName || 'General Interest'}</TableCell>
                                <TableCell>{interest.student.country || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{interest.status}</Badge>
                                </TableCell>
                                <TableCell>{new Date(interest.createdAt).toLocaleDateString()}</TableCell>
                            </TableRow>
                        ))}
                        {interests.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    No interested students found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-bold mb-4">Schedule Meeting</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Title/Topic</label>
                                <input name="title" required className="w-full p-2 border rounded bg-transparent" placeholder="e.g. Interview, Info Session" />
                            </div>

                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={scheduleMode === 'SLOT'}
                                        onChange={() => setScheduleMode('SLOT')}
                                    />
                                    Use Availability Slot
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="radio"
                                        name="mode"
                                        checked={scheduleMode === 'MANUAL'}
                                        onChange={() => setScheduleMode('MANUAL')}
                                    />
                                    Manual Time
                                </label>
                            </div>

                            {scheduleMode === 'SLOT' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Select Slot</label>
                                    <select
                                        className="w-full p-2 border rounded bg-transparent"
                                        value={selectedSlotId}
                                        onChange={(e) => setSelectedSlotId(e.target.value)}
                                        required={scheduleMode === 'SLOT'}
                                    >
                                        <option value="">-- Select a time --</option>
                                        {availabilitySlots.map(slot => (
                                            <option key={slot.id} value={slot.id}>
                                                {new Date(slot.startTime).toLocaleDateString()} at {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </option>
                                        ))}
                                    </select>
                                    {availabilitySlots.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">No availability slots set. Use manual mode or add slots in Availability tab.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Date & Time</label>
                                        <input name="startTime" type="datetime-local" required={scheduleMode === 'MANUAL'} className="w-full p-2 border rounded bg-transparent" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Duration (min)</label>
                                        <select name="duration" className="w-full p-2 border rounded bg-transparent">
                                            <option value="15">15 mins</option>
                                            <option value="30">30 mins</option>
                                            <option value="45">45 mins</option>
                                            <option value="60">1 hour</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Type</label>
                                <select name="type" className="w-full p-2 border rounded bg-transparent">
                                    <option value="ONE_TO_ONE">1:1 Meering (Individual)</option>
                                    <option value="GROUP">Group Session</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    * ONE_TO_ONE will create separate invites for each student if multiple are selected, or a single meeting?
                                    <br />Current Impl: Creates ONE meeting object with multiple participants.
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Video Link (Zoom/Meet)</label>
                                <input name="joinUrl" type="url" placeholder="https://..." className="w-full p-2 border rounded bg-transparent" />
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Scheduling...' : 'Send Invites'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
