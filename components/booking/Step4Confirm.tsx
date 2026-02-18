'use client'

import { Button } from '@/components/ui/button'
import { BookingState } from './BookingWizard'
import { format } from 'date-fns'
import { Calendar, Clock, Video, Loader2 } from 'lucide-react'

interface StepProps {
    data: BookingState
    university: any
    onConfirm: () => void
    onBack: () => void
    isSubmitting: boolean
}

export default function Step4Confirm({ data, university, onConfirm, onBack, isSubmitting }: StepProps) {
    if (!data.startTime) return null

    const startTime = new Date(data.startTime)

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Review & Confirm</h2>
                <p className="text-slate-500">Almost done! Check the details below.</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <h3 className="font-bold text-lg text-slate-900 mb-4">{university.institutionName}</h3>

                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <Calendar className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <div className="font-medium text-slate-900">
                                {format(startTime, 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="text-sm text-slate-500">Date</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <div className="font-medium text-slate-900">
                                {format(startTime, 'HH:mm')} ({data.durationMinutes} min)
                            </div>
                            <div className="text-sm text-slate-500">Time</div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <Video className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <div className="font-medium text-slate-900">
                                {data.videoProvider?.replace('_', ' ')}
                            </div>
                            <div className="text-sm text-slate-500">Location</div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="text-sm font-medium mb-1">Purpose</div>
                    <div className="p-2 bg-white rounded border border-slate-200 text-sm text-slate-700">
                        {data.purpose?.replace('_', ' ')}
                    </div>

                    {data.studentQuestions && (
                        <>
                            <div className="text-sm font-medium mt-4 mb-1">Your Questions</div>
                            <div className="p-2 bg-white rounded border border-slate-200 text-sm text-slate-700">
                                {data.studentQuestions}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex justify-between pt-4">
                <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>Back</Button>
                <Button onClick={onConfirm} disabled={isSubmitting} size="lg" className="w-full sm:w-auto px-8">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Confirming...
                        </>
                    ) : (
                        "Confirm Booking"
                    )}
                </Button>
            </div>
        </div>
    )
}
