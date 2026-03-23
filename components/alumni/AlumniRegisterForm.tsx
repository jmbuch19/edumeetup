'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registerAlumni } from '@/app/actions/alumni'
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import {
    ALUMNI_STATUS_OPTIONS,
    ALUMNI_AVAILABLE_FOR_OPTIONS,
    ALUMNI_HELP_TOPIC_OPTIONS,
} from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { GraduationCap, MapPin, BookOpen, Heart, Shield, ChevronRight, ChevronLeft } from 'lucide-react'

const STEPS = [
    { id: 1, label: 'Who you are', icon: GraduationCap },
    { id: 2, label: 'US Journey', icon: MapPin },
    { id: 3, label: 'How you can help', icon: Heart },
    { id: 4, label: 'Your Story', icon: BookOpen },
    { id: 5, label: 'Consent', icon: Shield },
]

const DEGREE_OPTIONS = [
    { value: 'BACHELORS', label: "Bachelor's Degree (BS/BA/BEng)" },
    { value: 'MASTERS', label: "Master's Degree (MS/MA/MBA/MEng)" },
    { value: 'PHD', label: 'PhD / Doctorate' },
    { value: 'ASSOCIATE', label: 'Associate Degree' },
    { value: 'OTHER', label: 'Other' },
]

function MultiSelect({
    options,
    value,
    onChange,
}: {
    options: readonly { value: string; label: string }[]
    value: string[]
    onChange: (val: string[]) => void
}) {
    const toggle = (v: string) => {
        onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
    }
    return (
        <div className="space-y-2">
            {options.map(opt => (
                <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={value.includes(opt.value)}
                        onChange={() => toggle(opt.value)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 accent-amber-500"
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                        {opt.label}
                    </span>
                </label>
            ))}
        </div>
    )
}

export default function AlumniRegisterForm({ inviteToken }: { inviteToken?: string }) {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [turnstileError, setTurnstileError] = useState(false)

    const [form, setForm] = useState({
        // Step 1
        fullName: '',
        email: '',
        whatsapp: '',
        yearWentToUSA: '',
        // Step 2
        usUniversityName: '',
        usProgram: '',
        usDegreeLevel: '',
        usCity: '',
        alumniStatus: '' as string,
        // Step 3
        availableFor: [] as string[],
        helpTopics: [] as string[],
        weeklyCapacity: '',
        availabilityNote: '',
        // Step 4
        linkedinUrl: '',
        inspirationMessage: '',
        // Step 5
        consentDataSharing: false,
        showWhatsapp: false,
        showLinkedin: true,
        showUsCity: true,
    })

    const set = (key: keyof typeof form, value: unknown) =>
        setForm(prev => ({ ...prev, [key]: value }))

    const validateStep = () => {
        if (step === 1) {
            if (!form.fullName.trim()) { toast.error('Full name is required'); return false }
            if (!form.email.trim()) { toast.error('Email is required'); return false }
            if (!/^\S+@\S+\.\S+$/.test(form.email)) { toast.error('Please enter a valid email address'); return false }
        }
        if (step === 2) {
            if (!form.usUniversityName.trim()) { toast.error('University name is required'); return false }
            if (!form.usProgram.trim()) { toast.error('Degree program is required'); return false }
            if (!form.alumniStatus) { toast.error('Please select your current status'); return false }
        }
        if (step === 3) {
            if (form.availableFor.length === 0) { toast.error('Please select at least one way you can help'); return false }
        }
        if (step === 5) {
            if (!form.consentDataSharing) { toast.error('Data sharing consent is required to appear in the alumni directory'); return false }
        }
        return true
    }

    const next = () => { if (validateStep()) setStep(s => Math.min(s + 1, 5)) }
    const back = () => setStep(s => Math.max(s - 1, 1))

    const handleSubmit = async () => {
        if (!validateStep()) return
        setIsSubmitting(true)
        try {
            const res = await registerAlumni({
                fullName: form.fullName,
                email: form.email,
                whatsapp: form.whatsapp || undefined,
                yearWentToUSA: form.yearWentToUSA ? parseInt(form.yearWentToUSA) : undefined,
                usUniversityName: form.usUniversityName,
                usProgram: form.usProgram,
                usDegreeLevel: form.usDegreeLevel || undefined,
                usCity: form.usCity || undefined,
                alumniStatus: form.alumniStatus as any,
                availableFor: form.availableFor,
                helpTopics: form.helpTopics,
                weeklyCapacity: form.weeklyCapacity ? parseInt(form.weeklyCapacity) : undefined,
                availabilityNote: form.availabilityNote || undefined,
                linkedinUrl: form.linkedinUrl || undefined,
                inspirationMessage: form.inspirationMessage || undefined,
                consentDataSharing: form.consentDataSharing,
                showWhatsapp: form.showWhatsapp,
                showLinkedin: form.showLinkedin,
                showUsCity: form.showUsCity,
                inviteToken,
                turnstileToken: turnstileToken || undefined,
            })
            if ('error' in res) {
                toast.error(res.error)
            } else {
                toast.success('Registration complete! Check your email for a login link to access your alumni dashboard.')
                // Wait briefly then redirect or keep on success page
                setTimeout(() => {
                    router.push('/login?message=check-email')
                }, 2000)
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const progress = ((step - 1) / (STEPS.length - 1)) * 100

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        <GraduationCap className="w-4 h-4" />
                        IAES Alumni Bridge
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Share Your Journey & Inspire Others</h1>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Thank you for being a valued part of the IAES family! Your story can inspire and guide future students heading to the USA.
                    </p>
                </div>

                {/* Step indicator */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        {STEPS.map((s, i) => {
                            const Icon = s.icon
                            const isActive = step === s.id
                            const isDone = step > s.id
                            return (
                                <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone ? 'bg-amber-500 border-amber-500 text-white' :
                                        isActive ? 'border-amber-500 text-amber-600 bg-amber-50' :
                                        'border-gray-200 text-gray-400'
                                    }`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[10px] font-medium hidden sm:block ${isActive ? 'text-amber-600' : 'text-gray-400'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                    <Progress value={progress} className="h-1.5 [&>[data-slot=indicator]]:bg-gradient-to-r [&>[data-slot=indicator]]:from-amber-400 [&>[data-slot=indicator]]:to-orange-500" />
                </div>

                <Card className="border-0 shadow-xl shadow-amber-100/40">
                    <CardContent className="p-6 sm:p-8">

                        {/* Step 1: Who You Are */}
                        {step === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Who are you?</h2>
                                    <p className="text-sm text-gray-500">Tell us a bit about yourself so we can set up your account.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Full Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. John Doe"
                                        value={form.fullName}
                                        onChange={e => set('fullName', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email Address <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="email"
                                        placeholder="e.g. john@example.com"
                                        value={form.email}
                                        onChange={e => set('email', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>WhatsApp / Contact Number <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                        placeholder="+91 98765 43210"
                                        value={form.whatsapp}
                                        onChange={e => set('whatsapp', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Year You Went to the USA <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 2019"
                                        min={1990}
                                        max={new Date().getFullYear()}
                                        value={form.yearWentToUSA}
                                        onChange={e => set('yearWentToUSA', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: US Journey */}
                        {step === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Your US Journey</h2>
                                    <p className="text-sm text-gray-500">Tell us about your university experience in the USA.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>University Name in the USA <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g. Arizona State University"
                                        value={form.usUniversityName}
                                        onChange={e => set('usUniversityName', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Degree Program / Major <span className="text-red-500">*</span></Label>
                                        <Input
                                            placeholder="e.g. MS Computer Science"
                                            value={form.usProgram}
                                            onChange={e => set('usProgram', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Degree Level</Label>
                                        <Select value={form.usDegreeLevel} onValueChange={v => set('usDegreeLevel', v)}>
                                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                                            <SelectContent>
                                                {DEGREE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>City & State <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                        placeholder="e.g. Tempe, Arizona"
                                        value={form.usCity}
                                        onChange={e => set('usCity', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Current Status <span className="text-red-500">*</span></Label>
                                    <div className="space-y-2">
                                        {ALUMNI_STATUS_OPTIONS.map(opt => (
                                            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-amber-50 transition-colors">
                                                <input type="radio" name="alumniStatus" value={opt.value}
                                                    checked={form.alumniStatus === opt.value}
                                                    onChange={() => set('alumniStatus', opt.value)}
                                                    className="accent-amber-500 w-4 h-4"
                                                />
                                                <span className="text-sm">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: How you can help */}
                        {step === 3 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">How can you help?</h2>
                                    <p className="text-sm text-gray-500">Let students know the best ways to connect with you.</p>
                                </div>
                                <div className="space-y-3">
                                    <Label>Would you be open to helping current IAES students? <span className="text-red-500">*</span></Label>
                                    <MultiSelect
                                        options={ALUMNI_AVAILABLE_FOR_OPTIONS}
                                        value={form.availableFor}
                                        onChange={v => set('availableFor', v)}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label>What topics could you speak or write about?</Label>
                                    <MultiSelect
                                        options={ALUMNI_HELP_TOPIC_OPTIONS}
                                        value={form.helpTopics}
                                        onChange={v => set('helpTopics', v)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Weekly Capacity <span className="text-gray-400 text-xs">(max sessions/week)</span></Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 2"
                                            min={1} max={20}
                                            value={form.weeklyCapacity}
                                            onChange={e => set('weeklyCapacity', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Availability Note</Label>
                                        <Input
                                            placeholder="e.g. Weekends IST only"
                                            value={form.availabilityNote}
                                            onChange={e => set('availabilityNote', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Your Story */}
                        {step === 4 && (
                            <div className="space-y-5">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Your Story</h2>
                                    <p className="text-sm text-gray-500">This is the most inspiring part — let future students hear directly from you.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>LinkedIn Profile <span className="text-gray-400 text-xs">(optional)</span></Label>
                                    <Input
                                        type="url"
                                        placeholder="https://linkedin.com/in/yourname"
                                        value={form.linkedinUrl}
                                        onChange={e => set('linkedinUrl', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Any message for future IAES / EdUmeetup students?</Label>
                                    <Textarea
                                        placeholder="Share a tip, motivation, or anything you wish someone had told you before going to the USA..."
                                        rows={5}
                                        maxLength={1000}
                                        value={form.inspirationMessage}
                                        onChange={e => set('inspirationMessage', e.target.value)}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-right text-gray-400">{form.inspirationMessage.length}/1000</p>
                                </div>
                            </div>
                        )}

                        {/* Step 5: Consent */}
                        {step === 5 && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">Privacy & Consent</h2>
                                    <p className="text-sm text-gray-500">You control exactly what students can see. All data is only shown to verified, logged-in students on EdUmeetup.</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">What you share with students</p>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={form.showLinkedin} onChange={e => set('showLinkedin', e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
                                        <span className="text-sm">Show my <strong>LinkedIn profile</strong> to students</span>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={form.showUsCity} onChange={e => set('showUsCity', e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
                                        <span className="text-sm">Show my <strong>city in the US</strong> on my profile card</span>
                                    </label>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={form.showWhatsapp} onChange={e => set('showWhatsapp', e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
                                        <span className="text-sm">Share my <strong>WhatsApp number</strong> with students who connect with me</span>
                                    </label>
                                </div>
                                <div className="border rounded-xl p-4 space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.consentDataSharing}
                                            onChange={e => set('consentDataSharing', e.target.checked)}
                                            className="mt-0.5 h-4 w-4 accent-amber-500"
                                        />
                                        <span className="text-sm font-medium leading-relaxed">
                                            I consent to sharing my profile with verified EdUmeetup students for the purpose of mentoring and guidance.
                                            I understand I can update or remove my profile at any time from my dashboard. <span className="text-red-500">*</span>
                                        </span>
                                    </label>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <p className="text-xs text-blue-700">
                                        🔒 Your profile will be <strong>live immediately</strong> after registration. The IAES team reviews all alumni profiles in the background. You'll be able to manage everything from your Alumni Dashboard.
                                    </p>
                                </div>

                                <div className="pt-4">
                                    <TurnstileWidget
                                        onVerify={(token) => { setTurnstileToken(token); setTurnstileError(false) }}
                                        onExpire={() => setTurnstileToken(null)}
                                        onError={() => setTurnstileError(true)}
                                    />
                                    {turnstileError && (
                                        <p className="text-sm text-red-500 mt-2 text-center">
                                            Bot protection failed. Please refresh the page and try again.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-6 mt-6 border-t">
                            <Button
                                variant="ghost"
                                onClick={back}
                                disabled={step === 1}
                                className="gap-1"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </Button>
                            {step < 5 ? (
                                <Button
                                    onClick={next}
                                    className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !turnstileToken}
                                    className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Join Alumni Bridge 🌉'}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
