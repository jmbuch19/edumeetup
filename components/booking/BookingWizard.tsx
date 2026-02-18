'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChevronLeft, Check, Loader2 } from 'lucide-react'
import { BookingData, createMeetingRequest } from '@/app/student/book/[universityId]/actions'

// Steps
import Step1Purpose from './Step1Purpose'
import Step2Format from './Step2Format'
import Step3TimeSlot from './Step3TimeSlot'
import Step4Confirm from './Step4Confirm'

interface BookingWizardProps {
    university: any // Typed from Prisma include
    existingBookings: any[] // Typed from Prisma include
}

export type BookingState = Partial<BookingData>

export default function BookingWizard({ university, existingBookings }: BookingWizardProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [data, setData] = useState<BookingState>({
        universityId: university.id,
        // repId: university.availabilityProfiles[0]?.repId, // Default rep? Or select?
        // Let's assume user picks a slot first, and the slot dictates the rep. 
        // OR user picks a rep first? 
        // Spec says: "Step C: Select Time Slot" is where availability is shown.
        // We might aggregate all availability for the university.
        durationMinutes: 15,
        audioOnly: false
    })

    const totalSteps = 4
    const progress = (step / totalSteps) * 100

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    const updateData = (fields: Partial<BookingState>) => {
        setData(prev => ({ ...prev, ...fields }))
    }

    const handleConfirm = async () => {
        if (!data.universityId || !data.repId || !data.startTime || !data.purpose) {
            toast.error("Missing required information")
            return
        }

        setIsSubmitting(true)
        const res = await createMeetingRequest(data as BookingData)
        setIsSubmitting(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Meeting booked successfully!")
            router.push('/student/meetings')
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="mb-8 space-y-4">
                <Button
                    variant="ghost"
                    onClick={step === 1 ? () => router.back() : prevStep}
                    className="pl-0 text-slate-500"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {step === 1 ? "Back to University" : "Back"}
                </Button>

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Book a Meeting with {university.institutionName}
                    </h1>
                    <span className="text-sm text-slate-500 font-medium">Step {step} of {totalSteps}</span>
                </div>

                <Progress value={progress} className="h-2" />
            </div>

            {/* Steps */}
            <Card className="min-h-[400px] p-6 shadow-lg border-slate-200">
                {step === 1 && (
                    <Step1Purpose
                        data={data}
                        updateData={updateData}
                        onNext={nextStep}
                    />
                )}
                {step === 2 && (
                    <Step2Format
                        data={data}
                        updateData={updateData}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {step === 3 && (
                    <Step3TimeSlot
                        data={data}
                        updateData={updateData}
                        availabilityProfiles={university.availabilityProfiles}
                        existingBookings={existingBookings}
                        onNext={nextStep}
                        onBack={prevStep}
                        universityTimezone={university.timezone || 'UTC'}
                    />
                )}
                {step === 4 && (
                    <Step4Confirm
                        data={data}
                        university={university}
                        onConfirm={handleConfirm}
                        onBack={prevStep}
                        isSubmitting={isSubmitting}
                    />
                )}
            </Card>
        </div>
    )
}
