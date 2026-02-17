'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { proposeReschedule } from '@/app/actions'
import { Calendar, Loader2 } from 'lucide-react'

interface RescheduleModalProps {
    meetingId: string
    currentDate: Date
    trigger?: React.ReactNode
    onSuccess?: () => void
}

export function RescheduleModal({ meetingId, currentDate, trigger, onSuccess }: RescheduleModalProps) {
    const [open, setOpen] = useState(false)
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (!date || !time || !reason) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError('')

        try {
            // Combine date time
            const datetimeStr = `${date}T${time}`
            const res = await proposeReschedule(meetingId, datetimeStr, reason)

            if (res?.error) {
                setError(res.error)
            } else {
                setOpen(false)
                if (onSuccess) onSuccess()
            }
        } catch (e) {
            setError('Failed to propose reschedule')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm">Reschedule</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Propose New Time</DialogTitle>
                    <DialogDescription>
                        Suggest a new time for this meeting. The other party will need to confirm.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Date
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            className="col-span-3"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            Time
                        </Label>
                        <Input
                            id="time"
                            type="time"
                            className="col-span-3"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reason" className="text-right">
                            Reason
                        </Label>
                        <Textarea
                            id="reason"
                            className="col-span-3"
                            placeholder="Why do you need to reschedule?"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Propose Reschedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
