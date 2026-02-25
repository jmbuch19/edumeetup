'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createAdvisoryRequest, AdvisoryRequestData } from '@/app/actions/advisory-actions'
import { CheckCircle, ArrowRight, ArrowLeft, Calendar, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdvisoryFormProps {
    onClose: () => void
}

export function AdvisoryForm({ onClose }: AdvisoryFormProps) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<AdvisoryRequestData>({})

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault()
        setStep(prev => prev + 1)
    }

    const handleBack = () => {
        setStep(prev => prev - 1)
    }

    const handleChange = (field: keyof AdvisoryRequestData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const res = await createAdvisoryRequest(formData)
            if (res.success) {
                setStep(4) // Success step
                router.refresh()
            } else {
                alert(res.error || "Failed to submit")
            }
        } catch (e) {
            console.error(e)
            alert("Something went wrong")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden max-w-2xl w-full mx-auto">
            {step < 4 && (
                <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-900">Book Guided Session</h2>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-amber-500' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
            )}

            <div className="p-4 sm:p-8">
                {step === 1 && (
                    <form onSubmit={handleNext} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Where are you headed?</h3>
                            <p className="text-sm text-gray-500">Step 1 of 3: Helps us match you with the right expert.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Target Degree</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                                    required
                                    value={formData.targetDegree || ''}
                                    onChange={e => handleChange('targetDegree', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="Bachelor's">Bachelor&apos;s</option>
                                    <option value="Master's">Master&apos;s</option>
                                    <option value="MBA">MBA</option>
                                    <option value="PhD">PhD</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Field of Interest</Label>
                                <Input
                                    required
                                    placeholder="e.g. Computer Science"
                                    value={formData.fieldOfInterest || ''}
                                    onChange={e => handleChange('fieldOfInterest', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Target Country</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                                    required
                                    value={formData.targetCountry || ''}
                                    onChange={e => handleChange('targetCountry', e.target.value)}
                                >
                                    <option value="">Select...</option>
                                    <option value="USA">USA</option>
                                    <option value="UK">UK</option>
                                    <option value="Canada">Canada</option>
                                    <option value="Australia">Australia</option>
                                    <option value="Europe">Europe</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="bg-gray-900 text-white">
                                Next Step <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleNext} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Quick Validity Check</h3>
                            <p className="text-sm text-gray-500">Step 2 of 3: Helps us give realistic advice on funding & admissions.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>English Test (IELTS/TOEFL)</Label>
                                <Input
                                    placeholder="e.g. 7.5 or Not Taken"
                                    value={formData.englishScore || ''}
                                    onChange={e => handleChange('englishScore', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>GRE/GMAT (Optional)</Label>
                                <Input
                                    placeholder="Score or Not Taken"
                                    value={formData.greGmatScore || ''}
                                    onChange={e => handleChange('greGmatScore', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Annual Budget Range (Tuition + Living)</Label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                                    required
                                    value={formData.budgetRange || ''}
                                    onChange={e => handleChange('budgetRange', e.target.value)}
                                >
                                    <option value="">Select range...</option>
                                    <option value="< $15k">Less than $15,000</option>
                                    <option value="$15k - $30k">$15,000 - $30,000</option>
                                    <option value="$30k - $50k">$30,000 - $50,000</option>
                                    <option value="$50k+">$50,000+</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button type="button" variant="ghost" onClick={handleBack}>
                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                            </Button>
                            <Button type="submit" className="bg-gray-900 text-white">
                                Next Step <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Let&apos;s Meet</h3>
                            <p className="text-sm text-gray-500">Step 3 of 3: Scheduling Logistics</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Preferred Time</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm"
                                        value={formData.preferredTime || ''}
                                        onChange={e => handleChange('preferredTime', e.target.value)}
                                    >
                                        <option>Weekday Mornings</option>
                                        <option>Weekday Afternoons</option>
                                        <option>Weekday Evenings</option>
                                        <option>Weekends</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Target Intake</Label>
                                    <Input
                                        placeholder="e.g. Fall 2026"
                                        value={formData.targetIntake || ''}
                                        onChange={e => handleChange('targetIntake', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>One big question for your adviser?</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    placeholder="e.g. Can I get a scholarship with my GDP? Is 3 years gap okay?"
                                    value={formData.openQuestion || ''}
                                    onChange={e => handleChange('openQuestion', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg text-sm text-amber-800 flex gap-2">
                            <Calendar className="w-5 h-5 shrink-0" />
                            <p>An adviser will review your profile and email you meeting times within 24 hours.</p>
                        </div>

                        <div className="flex justify-between pt-4">
                            <Button type="button" variant="ghost" onClick={handleBack}>
                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-gray-900 hover:bg-gray-800 text-white min-w-[140px]"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Request Session'}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="text-center py-12 animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Received!</h2>
                        <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                            We have assigned your profile to an adviser. They will contact you shortly to schedule your session.
                        </p>
                        <Button onClick={onClose} variant="outline" className="w-full max-w-[200px]">
                            Back to Dashboard
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
