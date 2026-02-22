'use client'

import { registerStudent } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GraduationCap, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { DegreeLevels } from '@/lib/constants'


interface State {
    error?: string | null | any
    success?: boolean
    email?: string
    message?: string
}

const initialState: State = {
    error: null,
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                </>
            ) : (
                "Create Account"
            )}
        </Button>
    )
}

export default function StudentRegisterPage() {
    const [phone, setPhone] = useState({ code: '+91', number: '' })
    const [greTaken, setGreTaken] = useState(false)
    const [gmatTaken, setGmatTaken] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [state, formAction] = useFormState(registerStudent as any, initialState)
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (state?.error) {
            // Handle specific field errors or general errors
            const msg = typeof state.error === 'string' ? state.error : "Please check the form for errors."
            toast.error(msg)
        } else if (state?.success && state?.email) {
            toast.success(state.message || "Account created! Check your email to login.")
            // Redirect to verify request page
            window.location.href = `/auth/verify-request?email=${encodeURIComponent(state.email)}`
        }
    }, [state])

    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <div className="w-full max-w-3xl space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-primary p-2 rounded-lg mb-4">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                        Create Student Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Complete your profile to find your perfect university match
                    </p>
                </div>

                {/* India-only notice */}
                <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800 flex gap-2 items-start">
                    <span className="text-lg leading-snug">🇮🇳</span>
                    <span>
                        Currently, EduMeetup profiling is available to <strong>students based in India</strong> with a valid Indian phone number and resident details (city and PIN code). We do not collect your full address.
                    </span>
                </div>

                <form ref={formRef} className="mt-8 space-y-8" action={formAction}>
                    {/* Section A: Basic Profile */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section A — Basic Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                {/* Honeypot Field - Hidden */}
                                <input type="text" name="website_url" className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} />

                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <Input name="fullName" type="text" required placeholder="John Doe" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <Input name="email" type="email" required placeholder="john@example.com" />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Male" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Male</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Female" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Female</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gender" value="Prefer not to say" required className="accent-primary h-4 w-4" />
                                        <span className="text-sm text-gray-700">Prefer not to answer</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group *</label>
                                <select name="ageGroup" required className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Age Group</option>
                                    <option value="Under 20">Under 20</option>
                                    <option value="21-25">21 - 25</option>
                                    <option value="26-30">26 - 30</option>
                                    <option value="31+">31+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Country of Residence</label>
                                <div className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                                    <span>🇮🇳</span><span>India</span>
                                </div>
                                <input type="hidden" name="country" value="India" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                <Input name="city" type="text" required placeholder="e.g. Mumbai" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                                <Input name="pincode" type="text" required placeholder="e.g. 400001" maxLength={10} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                                <div className="flex gap-2">
                                    <select
                                        className="h-10 w-24 rounded-md border border-gray-300 bg-background px-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={phone.code}
                                        onChange={(e) => setPhone({ ...phone, code: e.target.value })}
                                    >
                                        <option value="+91">+91 (India)</option>
                                    </select>
                                    <Input
                                        value={phone.number}
                                        onChange={(e) => setPhone({ ...phone, number: e.target.value })}
                                        placeholder="98765 43210"
                                        required
                                    />
                                    <input type="hidden" name="phoneNumber" value={`${phone.code} ${phone.number}`} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WhatsApp Number <span className="text-gray-400 font-normal">(Optional — for quicker reach)</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                    <span className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">+91</span>
                                    <Input name="whatsappNumber" type="tel" placeholder="98765 43210" maxLength={15} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Education Level *</label>
                                <select name="currentStatus" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Status</option>
                                    <option value="Grade 12">12th Grade</option>
                                    <option value="Bachelor Final Year">Bachelor’s Final Year</option>
                                    <option value="Bachelor Completed">Bachelor’s Completed</option>
                                    <option value="Master Completed">Master’s Completed</option>
                                    <option value="Working Professional">Working Professional</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section B: Study Preference */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 border-b pb-2">Section B — Study Preference</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Desired Degree Level</label>
                                <select name="preferredDegree" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Degree</option>
                                    {DegreeLevels.map((level) => (
                                        <option key={level.value} value={level.value}>
                                            {level.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Field of Interest</label>
                                <select name="fieldOfInterest" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Field</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Engineering">Engineering</option>
                                    <option value="Business">Business</option>
                                    <option value="Data Science">Data Science</option>
                                    <option value="Health Sciences">Health Sciences</option>
                                    <option value="Social Sciences">Social Sciences</option>
                                    <option value="Arts & Humanities">Arts & Humanities</option>
                                    <option value="Law">Law</option>
                                    <option value="Architecture">Architecture</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range (USD)</label>
                                <select name="budgetRange" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Budget</option>
                                    <option value="< 15,000">&lt; 15,000</option>
                                    <option value="15,000–25,000">15,000–25,000</option>
                                    <option value="25,000–40,000">25,000–40,000</option>
                                    <option value="40,000+">40,000+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Intake</label>
                                <select name="preferredIntake" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="">Select Intake</option>
                                    <option value="Fall">Fall</option>
                                    <option value="Spring">Spring</option>
                                    <option value="Summer">Summer</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Test Type</label>
                                <select name="englishTestType" className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                    <option value="Not Taken Yet">Not Taken Yet</option>
                                    <option value="IELTS">IELTS</option>
                                    <option value="TOEFL">TOEFL</option>
                                    <option value="Duolingo">Duolingo</option>
                                    <option value="PTE">PTE</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">English Score (If taken)</label>
                                <Input name="englishScore" type="number" step="0.5" placeholder="e.g. 7.5 or 100" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">GRE Taken?</label>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="greTaken" value="yes" className="accent-primary h-4 w-4"
                                            onChange={() => setGreTaken(true)} />
                                        <span className="text-sm text-gray-700">Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="greTaken" value="no" defaultChecked className="accent-primary h-4 w-4"
                                            onChange={() => setGreTaken(false)} />
                                        <span className="text-sm text-gray-700">No</span>
                                    </label>
                                </div>
                                {greTaken && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GRE Score (out of 340)</label>
                                        <Input name="greScore" type="number" min="260" max="340" placeholder="e.g. 320" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">GMAT Taken?</label>
                                <div className="flex gap-4 flex-wrap">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gmatTaken" value="yes" className="accent-primary h-4 w-4"
                                            onChange={() => setGmatTaken(true)} />
                                        <span className="text-sm text-gray-700">Yes</span>
                                    </label>
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="radio" name="gmatTaken" value="no" defaultChecked className="accent-primary h-4 w-4"
                                            onChange={() => setGmatTaken(false)} />
                                        <span className="text-sm text-gray-700">No</span>
                                    </label>
                                </div>
                                {gmatTaken && (
                                    <div className="mt-3">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GMAT Score (out of 800)</label>
                                        <Input name="gmatScore" type="number" min="200" max="800" placeholder="e.g. 680" />
                                    </div>
                                )}
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Study Country (Optional)</label>
                                <Input name="preferredCountries" placeholder="e.g. USA, Canada, UK" />
                            </div>

                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm text-gray-500 mb-4">
                            By creating an account, you agree to our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
                        </label>
                        {state?.error && (
                            <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm mb-4">
                                {state.error}
                            </div>
                        )}
                        <SubmitButton />
                    </div>
                </form>

                <div className="text-center text-sm">
                    <span className="text-gray-500">Already have an account? </span>
                    <Link href="/login" className="font-medium text-primary hover:text-primary/80">
                        Sign in
                    </Link>
                </div>
            </div >
        </div >
    )
}
