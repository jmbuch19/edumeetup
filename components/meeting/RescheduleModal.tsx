'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getRescheduleAvailableSlots, proposeMeetingReschedule, type RescheduleSlotOption } from '@/app/actions/meeting-reschedule'
import { Loader2, RefreshCw } from 'lucide-react'

interface RescheduleModalProps {
    meetingId: string
    currentDate: Date
    trigger?: React.ReactNode
    onSuccess?: () => void
}

function formatInZone(iso: string, timeZone?: string) {
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone,
        }).format(new Date(iso))
    } catch {
        return new Date(iso).toLocaleString()
    }
}

export function RescheduleModal({ meetingId, currentDate, trigger, onSuccess }: RescheduleModalProps) {
    const [open, setOpen] = useState(false)
    const [slots, setSlots] = useState<RescheduleSlotOption[]>([])
    const [selectedSlotId, setSelectedSlotId] = useState('')
    const [reason, setReason] = useState('')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const loadSlots = async () => {
        setLoadingSlots(true)
        setError('')
        setSelectedSlotId('')
        try {
            const res = await getRescheduleAvailableSlots(meetingId)
            if (res.error) {
                setSlots([])
                setError(res.error)
            } else {
                setSlots(res.slots)
            }
        } catch {
            setSlots([])
            setError('Failed to load available slots')
        } finally {
            setLoadingSlots(false)
        }
    }

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (nextOpen) void loadSlots()
    }

    const handleSubmit = async () => {
        if (!selectedSlotId || !reason.trim()) {
            setError('Please choose an available slot and provide a reason')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await proposeMeetingReschedule(meetingId, selectedSlotId, reason)
            if (res?.error) {
                setError(res.error)
                if (res.error.toLowerCase().includes('slot')) void loadSlots()
            } else {
                setOpen(false)
                setSlots([])
                setSelectedSlotId('')
                setReason('')
                onSuccess?.()
            }
        } catch {
            setError('Failed to propose reschedule')
        } finally {
            setLoading(false)
        }
    }

    const selectedSlot = slots.find(slot => slot.id === selectedSlotId)
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Reschedule</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Propose New Time</DialogTitle>
                    <DialogDescription>
                        Current meeting: {currentDate.toLocaleString()}. Choose one of the representative&apos;s open slots below.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                            <Label>Available slots</Label>
                            <Button type="button" variant="ghost" size="sm" onClick={() => void loadSlots()} disabled={loadingSlots}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${loadingSlots ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {loadingSlots ? (
                            <div className="flex min-h-28 items-center justify-center rounded-md border text-sm text-slate-500">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading open slots…
                            </div>
                        ) : slots.length === 0 ? (
                            <div className="rounded-md border border-dashed p-4 text-sm text-slate-500">
                                No matching open slots are currently available for this meeting duration.
                            </div>
                        ) : (
                            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                                {slots.map(slot => {
                                    const selected = selectedSlotId === slot.id
                                    return (
                                        <button
                                            key={slot.id}
                                            type="button"
                                            onClick={() => setSelectedSlotId(slot.id)}
                                            className={`w-full rounded-md border p-3 text-left transition ${selected ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            <div className="font-medium text-slate-900">
                                                {formatInZone(slot.startTime, browserTimezone)}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {slot.durationMinutes} min · Representative: {formatInZone(slot.startTime, slot.repTimezone)} ({slot.repTimezone})
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {selectedSlot && (
                        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Selected: {formatInZone(selectedSlot.startTime, browserTimezone)} ({browserTimezone})
                        </p>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            placeholder="Why do you need to reschedule?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            maxLength={500}
                        />
                        <p className="text-right text-xs text-slate-400">{reason.length}/500</p>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading || loadingSlots || !selectedSlotId}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Propose Reschedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
