'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { createFairPass, type FairPassFormData } from './actions'
import type { FairStudentPass } from '@prisma/client'
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'

const BUDGET_OPTIONS = [
    'Under USD 15,000',
    'USD 15,000–25,000',
    'USD 25,000–40,000',
    'Above USD 40,000',
] as const

type Prefilled = {
    fullName?: string
    email?: string
    phone?: string
    fieldOfInterest?: string
    budgetRange?: string
    preferredCountries?: string
}

interface FairRegistrationFormProps {
    fairEventId: string
    fairEventTitle: string
    fairEventCity: string
    prefilled: Prefilled
    isLoggedIn: boolean
    profileComplete: boolean
    sessionEmail: string | null
}

// ── Pass / QR view ──────────────────────────────────────────────────────────
function PassView({
    pass,
    fairEventTitle,
}: {
    pass: FairStudentPass
    fairEventTitle: string
}) {
    const firstName = (pass.fullName ?? 'Attendee').split(' ')[0]
    const qrValue = `https://edumeetup.com/scan/${pass.uuid}`

    return (
        <Card className="w-full max-w-sm mx-auto shadow-2xl border-0 bg-white rounded-3xl overflow-hidden">
            {/* Gradient band */}
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400" />
            <CardContent className="flex flex-col items-center gap-6 p-8">
                {/* Tick */}
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Pass Issued
                </div>

                {/* Name + fair */}
                <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{firstName}</p>
                    <p className="text-sm text-gray-500 mt-1">{fairEventTitle}</p>
                </div>

                {/* QR Code */}
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <QRCodeSVG
                        value={qrValue}
                        size={256}
                        level="Q"
                        includeMargin={false}
                    />
                </div>

                <p className="text-xs text-gray-400 text-center">
                    Show this QR at each university booth to connect
                </p>

                {/* Parent View */}
                <Button
                    variant="outline"
                    className="w-full rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() =>
                        window.open(`/fair/parent/${pass.parentToken}`, '_blank')
                    }
                >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Parent View
                </Button>
            </CardContent>
        </Card>
    )
}

// ── Field helpers ───────────────────────────────────────────────────────────
function Field({
    id,
    label,
    required,
    value,
    onChange,
    type = 'text',
    placeholder,
    disabled,
}: {
    id: string
    label: string
    required?: boolean
    value: string
    onChange: (v: string) => void
    type?: string
    placeholder?: string
    disabled?: boolean
}) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="rounded-xl border-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
            />
        </div>
    )
}

// ── Main component ──────────────────────────────────────────────────────────
export function FairRegistrationForm({
    fairEventId,
    fairEventTitle,
    fairEventCity,
    prefilled,
    isLoggedIn,
    profileComplete,
    sessionEmail,
}: FairRegistrationFormProps) {
    // Form fields
    const [fullName, setFullName] = useState(prefilled.fullName ?? '')
    const [email, setEmail] = useState(prefilled.email ?? sessionEmail ?? '')
    const [phone, setPhone] = useState(prefilled.phone ?? '')
    const [currentInstitution, setCurrentInstitution] = useState('')
    const [currentCourse, setCurrentCourse] = useState('')
    const [currentSemester, setCurrentSemester] = useState('')
    const [englishExam, setEnglishExam] = useState('')
    const [fieldOfInterest, setFieldOfInterest] = useState(prefilled.fieldOfInterest ?? '')
    const [budgetRange, setBudgetRange] = useState(prefilled.budgetRange ?? '')
    const [preferredCountries, setPreferredCountries] = useState(prefilled.preferredCountries ?? '')

    // Consents (walk-in only)
    const [consentEmail, setConsentEmail] = useState(false)
    const [consentWhatsapp, setConsentWhatsapp] = useState(false)
    const [consentContact, setConsentContact] = useState(false)

    // UI state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [pass, setPass] = useState<FairStudentPass | null>(null)

    // Determine which fields are missing for logged-in incomplete users
    const missingFields = isLoggedIn && !profileComplete
        ? {
            fullName: !prefilled.fullName,
            phone: !prefilled.phone,
            fieldOfInterest: !prefilled.fieldOfInterest,
            budgetRange: !prefilled.budgetRange,
            preferredCountries: !prefilled.preferredCountries,
        }
        : null

    const handleSubmit = async () => {
        setError(null)

        // Walk-in consent validation
        if (!isLoggedIn && !consentEmail) {
            setError('Please agree to receive digital brochures via Email to continue.')
            return
        }

        if (!fullName.trim()) { setError('Full name is required.'); return }
        if (!email.trim()) { setError('Email is required.'); return }
        if (!phone.trim()) { setError('Phone number is required.'); return }

        if (!isLoggedIn) {
            if (!currentInstitution.trim()) { setError('Current institution is required.'); return }
            if (!currentCourse.trim()) { setError('Current course / major is required.'); return }
            if (!currentSemester.trim()) { setError('Current year / semester is required.'); return }
            if (!fieldOfInterest.trim()) { setError('Field of interest is required.'); return }
        }

        setLoading(true)
        try {
            const formData: FairPassFormData = {
                fullName,
                email,
                phone,
                currentInstitution: currentInstitution || undefined,
                currentCourse: currentCourse || undefined,
                currentSemester: currentSemester || undefined,
                englishExam: englishExam || undefined,
                fieldOfInterest: fieldOfInterest || undefined,
                budgetRange: budgetRange || undefined,
                preferredCountries: preferredCountries || undefined,
                emailConsent: consentEmail,
                whatsappConsent: consentWhatsapp,
                marketingConsent: consentContact,
            }

            const result = await createFairPass(formData, fairEventId)

            if (result.error) {
                setError(result.error)
            } else if (result.pass) {
                setPass(result.pass)
            }
        } finally {
            setLoading(false)
        }
    }

    // ── QR pass view ─────────────────────────────────────────────────────────
    if (pass) {
        return (
            <div className="flex flex-col items-center gap-6">
                <PassView pass={pass} fairEventTitle={fairEventTitle} />
            </div>
        )
    }

    // ── Header ────────────────────────────────────────────────────────────────
    const header = (
        <div className="text-center mb-8">
            <p className="text-sm font-semibold text-indigo-600 tracking-wider uppercase mb-2">
                edUmeetup
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{fairEventTitle}</h1>
            {fairEventCity && (
                <p className="text-gray-500 mt-1">{fairEventCity}</p>
            )}
        </div>
    )

    // ── STATE A — logged in, complete profile ─────────────────────────────────
    if (isLoggedIn && profileComplete) {
        return (
            <div className="max-w-md mx-auto">
                {header}
                <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900">
                            Welcome back, {prefilled.fullName?.split(' ')[0] ?? 'there'}! 👋
                        </CardTitle>
                        <CardDescription>We'll use your existing profile to issue your pass.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6">
                        {/* Read-only summary */}
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm text-gray-700">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Name</span>
                                <span className="font-medium">{prefilled.fullName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Email</span>
                                <span className="font-medium">{prefilled.email ?? sessionEmail}</span>
                            </div>
                            {prefilled.phone && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Phone</span>
                                    <span className="font-medium">{prefilled.phone}</span>
                                </div>
                            )}
                            {prefilled.fieldOfInterest && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Field</span>
                                    <span className="font-medium">{prefilled.fieldOfInterest}</span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                        )}

                        <Button
                            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold"
                            disabled={loading}
                            onClick={handleSubmit}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Issuing Pass…</>
                            ) : (
                                'Confirm & Get Your Pass'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── STATE B — logged in, incomplete profile ───────────────────────────────
    if (isLoggedIn && !profileComplete) {
        return (
            <div className="max-w-md mx-auto">
                {header}
                <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg text-gray-900">
                            Complete your profile
                        </CardTitle>
                        <CardDescription>
                            Fill in the missing details to get your digital pass.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-6">
                        {/* Fixed fields (pre-filled, disabled) */}
                        {prefilled.fullName ? (
                            <Field id="fullName" label="Full Name" value={fullName} onChange={setFullName} disabled />
                        ) : (
                            <Field id="fullName" label="Full Name" required value={fullName} onChange={setFullName} placeholder="Your full name" />
                        )}

                        <Field id="email" label="Email" value={email} onChange={setEmail} disabled />

                        {prefilled.phone ? (
                            <Field id="phone" label="Phone / WhatsApp" value={phone} onChange={setPhone} disabled />
                        ) : (
                            <Field id="phone" label="Phone / WhatsApp" required value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
                        )}

                        {missingFields?.fieldOfInterest && (
                            <Field id="fieldOfInterest" label="Field of Interest" value={fieldOfInterest} onChange={setFieldOfInterest} placeholder="e.g. Computer Science" />
                        )}

                        {missingFields?.budgetRange && (
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700">Budget Range</Label>
                                <Select value={budgetRange} onValueChange={setBudgetRange}>
                                    <SelectTrigger className="rounded-xl border-gray-200">
                                        <SelectValue placeholder="Select budget range" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BUDGET_OPTIONS.map((opt) => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {missingFields?.preferredCountries && (
                            <Field id="preferredCountries" label="Preferred Countries" value={preferredCountries} onChange={setPreferredCountries} placeholder="e.g. UK, Canada, Australia" />
                        )}

                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                        )}

                        <Button
                            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold"
                            disabled={loading}
                            onClick={handleSubmit}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Issuing Pass…</>
                            ) : (
                                'Confirm & Get Your Pass'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── STATE C — walk-in (not logged in) ────────────────────────────────────
    return (
        <div className="max-w-lg mx-auto">
            {header}
            <Card className="shadow-xl border-0 rounded-3xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-amber-400" />
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-gray-900">Get Your Digital Pass</CardTitle>
                    <CardDescription>Fill in your details to receive a QR code pass for today's fair.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pb-6">
                    <Field id="fullName" label="Full Name" required value={fullName} onChange={setFullName} placeholder="Your full name" />
                    <Field id="email" label="Email" required value={email} onChange={setEmail} type="email" placeholder="you@example.com" />
                    <Field id="phone" label="Phone / WhatsApp Number" required value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
                    <Field id="currentInstitution" label="Current School / College" required value={currentInstitution} onChange={setCurrentInstitution} placeholder="e.g. Pune University" />
                    <Field id="currentCourse" label="Current Major / Program" required value={currentCourse} onChange={setCurrentCourse} placeholder="e.g. Mechanical Engineering" />
                    <Field id="currentSemester" label="Current Year / Semester" required value={currentSemester} onChange={setCurrentSemester} placeholder="e.g. 3rd Year / 6th Semester" />

                    {/* English proficiency */}
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">
                            English Proficiency Test
                            <span className="ml-1 text-gray-400 text-xs">(optional)</span>
                        </Label>
                        <Select value={englishExam} onValueChange={setEnglishExam}>
                            <SelectTrigger className="rounded-xl border-gray-200">
                                <SelectValue placeholder="Have you taken IELTS / TOEFL / PTE?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Not attempted">Not attempted yet</SelectItem>
                                <SelectItem value="IELTS">IELTS (score to be added)</SelectItem>
                                <SelectItem value="TOEFL">TOEFL (score to be added)</SelectItem>
                                <SelectItem value="PTE">PTE Academic (score to be added)</SelectItem>
                                <SelectItem value="Duolingo">Duolingo English Test</SelectItem>
                                <SelectItem value="Other">Other exam</SelectItem>
                            </SelectContent>
                        </Select>
                        {englishExam && englishExam !== 'Not attempted' && (
                            <Input
                                className="mt-1.5 rounded-xl border-gray-200 text-sm"
                                placeholder={`e.g. ${englishExam} 6.5 (optional — enter your score)`}
                                value={englishExam.includes(' ') ? englishExam.split(' ').slice(1).join(' ') : ''}
                                onChange={(e) => setEnglishExam(
                                    e.target.value ? `${englishExam.split(' ')[0]} ${e.target.value}` : englishExam.split(' ')[0]
                                )}
                            />
                        )}
                    </div>

                    {/* Field of Interest — required */}
                    <Field id="fieldOfInterest" label="Field of Interest" required value={fieldOfInterest} onChange={setFieldOfInterest} placeholder="e.g. Computer Science, Business, Architecture" />

                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-gray-700">Budget Range</Label>
                        <Select value={budgetRange} onValueChange={setBudgetRange}>
                            <SelectTrigger className="rounded-xl border-gray-200">
                                <SelectValue placeholder="Select budget range (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {BUDGET_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Field id="preferredCountries" label="Preferred Countries" value={preferredCountries} onChange={setPreferredCountries} placeholder="e.g. UK, Canada, Australia" />

                    {/* Consent checkboxes */}
                    <div className="pt-2 space-y-3 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consent</p>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="consentEmail"
                                checked={consentEmail}
                                onChange={(e) => setConsentEmail(e.target.checked)}
                                className="mt-0.5"
                            />
                            <Label htmlFor="consentEmail" className="text-sm text-gray-700 leading-snug cursor-pointer">
                                I agree to receive my digital brochures via Email
                                <span className="text-red-500 ml-0.5">*</span>
                            </Label>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="consentWhatsapp"
                                checked={consentWhatsapp}
                                onChange={(e) => setConsentWhatsapp(e.target.checked)}
                                className="mt-0.5"
                            />
                            <Label htmlFor="consentWhatsapp" className="text-sm text-gray-700 leading-snug cursor-pointer">
                                I agree to receive brochures via WhatsApp
                                <span className="ml-1 text-gray-400 text-xs">(optional)</span>
                            </Label>
                        </div>

                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="consentContact"
                                checked={consentContact}
                                onChange={(e) => setConsentContact(e.target.checked)}
                                className="mt-0.5"
                            />
                            <Label htmlFor="consentContact" className="text-sm text-gray-700 leading-snug cursor-pointer">
                                I agree universities may contact me for admissions updates
                                <span className="ml-1 text-gray-400 text-xs">(optional)</span>
                            </Label>
                        </div>

                        {/* Consent footnote */}
                        <p className="text-xs text-gray-400 leading-relaxed pt-1">
                            Your details are shared only with universities whose table you scan at this fair.
                            By registering you agree to our{' '}
                            <a
                                href="/privacy-policy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline text-indigo-500 hover:text-indigo-700"
                            >
                                Privacy Policy
                            </a>.{' '}
                            You can withdraw consent anytime.
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                    )}

                    <Button
                        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-semibold"
                        disabled={loading}
                        onClick={handleSubmit}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Issuing Pass…</>
                        ) : (
                            'Get Your Pass'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
