'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Clock, CheckCircle } from 'lucide-react'
import { getAvailableSlots, createMeetingRequest } from '@/app/meeting-actions'
import { Loader2 } from 'lucide-react'

export default function BookingWizard({ universityId, universityName }: { universityId: string, universityName: string }) {
    const [step, setStep] = useState(1)
    const [date, setDate] = useState('')
    const [slots, setSlots] = useState<string[]>([])
    const [selectedSlot, setSelectedSlot] = useState('')
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [bookingDetails, setBookingDetails] = useState({ purpose: '', note: '' })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const d = e.target.value
        setDate(d)
        if (d) {
            setLoadingSlots(true)
            setSlots([])
            try {
                const available = await getAvailableSlots(universityId, d)
                setSlots(available)
            } catch (err) {
                console.error(err)
                setError('Failed to load slots')
            } finally {
                setLoadingSlots(false)
            }
        }
    }

    const handleSlotSelect = (time: string) => {
        setSelectedSlot(time)
        setStep(2) // Move to details
    }

    const handleSubmit = async () => {
        setSubmitting(true)
        setError('')

        const formData = new FormData()
        formData.append('universityId', universityId)
        formData.append('date', date)
        formData.append('time', selectedSlot)
        formData.append('purpose', bookingDetails.purpose)
        formData.append('note', bookingDetails.note)

        const res = await createMeetingRequest(formData)

        if (res?.error) {
            setError(res.error)
        } else {
            setSuccess(true)
        }
        setSubmitting(false)
    }

    if (success) {
        return (
            <div className="text-center py-12 space-y-4">
                <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Meeting Requested!</h2>
                <p className="text-gray-600">
                    Your request to meet with {universityName} has been sent. <br />
                    You will be notified when it is confirmed.
                </p>
                <div className="flex justify-center pt-4">
                    <Button onClick={() => window.location.href = '/student/dashboard'}>
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <Card className="w-full max-w-xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Book a Meeting
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Step 1: Date & Time */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Select Date</Label>
                            <Input
                                type="date"
                                min={new Date().toISOString().split('T')[0]}
                                onChange={handleDateChange}
                                value={date}
                            />
                        </div>

                        {loadingSlots && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-primary" />
                            </div>
                        )}

                        {!loadingSlots && date && slots.length === 0 && (
                            <p className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
                                No available slots found for this date.
                            </p>
                        )}

                        {!loadingSlots && slots.length > 0 && (
                            <div className="space-y-2">
                                <Label>Select Time</Label>
                                <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                    {slots.map(slot => (
                                        <Button
                                            key={slot}
                                            variant="outline"
                                            className="text-sm"
                                            onClick={() => handleSlotSelect(slot)}
                                        >
                                            {slot}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4 text-sm text-blue-800">
                            <Clock className="h-4 w-4" />
                            <span>
                                <span suppressHydrationWarning>
                                    {new Date(date).toLocaleDateString()}
                                </span> at {selectedSlot}
                            </span>
                            <Button variant="ghost" size="sm" className="ml-auto h-auto p-0 text-blue-800 underline" onClick={() => setStep(1)}>
                                Change
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <Label>Meeting Purpose</Label>
                            <Input
                                placeholder="e.g. Discuss Computer Science program"
                                value={bookingDetails.purpose}
                                onChange={e => setBookingDetails({ ...bookingDetails, purpose: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Questions / Notes</Label>
                            <Input
                                placeholder="Any specific questions?"
                                value={bookingDetails.note}
                                onChange={e => setBookingDetails({ ...bookingDetails, note: e.target.value })}
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}

                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleSubmit} disabled={!bookingDetails.purpose || submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Request Meeting
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
