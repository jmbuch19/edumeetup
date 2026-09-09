'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChevronLeft } from 'lucide-react'
import type { University, Meeting, AvailabilityProfile } from '@prisma/client'
import { HardenedBookingData, createMeetingRequestHardened } from '@/app/student/book/[universityId]/actions-hardened'
import { AvailableSlot } from './Step3TimeSlot'

import Step1Purpose from './Step1Purpose'
import Step2Format from './Step2Format'
import Step3TimeSlot from './Step3TimeSlot'
import Step4Confirm from './Step4Confirm'

interface BookingWizardProps {
    university: University & {
        availabilityProfiles?: (AvailabilityProfile & {
            repUser?: { id: string; name: string | null; image?: string | null; role?: string; isActive?: boolean }
        })[]
    }
    existingBookings: Pick<Meeting, 'startTime' | 'endTime' | 'repId' | 'status'>[]
    availableSlots: AvailableSlot[]
}

export type BookingState = Partial<HardenedBookingData>

export function BookingWizard({ university, existingBookings, availableSlots }: BookingWizardProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const availableDurations = useMemo(() => {
        const durations = availableSlots
            .map(slot => Math.round((new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()) / 60_000))
            .filter(duration => [10, 15, 20].includes(duration))
        return Array.from(new Set(durations)).sort((a, b) => a - b)
    }, [availableSlots])

    const [data, setData] = useState<BookingState>(() => ({
        universityId: university.id,
        durationMinutes: availableDurations.includes(15) ? 15 : (availableDurations[0] ?? 15),
        audioOnly: false,
        studentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    }))

    const totalSteps = 4
    const progress = (step / totalSteps) * 100

    const nextStep = () => setStep(s => Math.min(s + 1, totalSteps))
    const prevStep = () => setStep(s => Math.max(s - 1, 1))

    const updateData = (fields: Partial<BookingState>) => {
        setData(prev => ({ ...prev, ...fields }))
    }

    const handleConfirm = async () => {
        if (!data.universityId || !data.repId || !data.slotId || !data.startTime || !data.purpose || !data.durationMinutes) {
            toast.error('Missing required information')
            return
        }

        setIsSubmitting(true)
        const res = await createMeetingRequestHardened(data as HardenedBookingData)
        setIsSubmitting(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Meeting request sent!')
            router.push('/student/meetings')
            router.refresh()
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="mb-8 space-y-4">
                <Button
                    variant="ghost"
                    onClick={step === 1 ? () => router.back() : prevStep}
                    className="pl-0 text-slate-500"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    {step === 1 ? 'Back to University' : 'Back'}
                </Button>

                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">
                        Book a Meeting with {university.institutionName}
                    </h1>
                    <span className="text-sm text-slate-500 font-medium">Step {step} of {totalSteps}</span>
                </div>

                <Progress value={progress} className="h-2" />
            </div>

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
                        availableDurations={availableDurations}
                        onNext={nextStep}
                        onBack={prevStep}
                    />
                )}
                {step === 3 && (
                    <Step3TimeSlot
                        data={data}
                        updateData={updateData}
                        availabilityProfiles={university.availabilityProfiles || []}
                        availableSlots={availableSlots}
                        existingBookings={existingBookings}
                        onNext={nextStep}
                        onBack={prevStep}
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
