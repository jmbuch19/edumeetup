'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { SubmitButton } from "@/components/SubmitButton"
import { Input } from "@/components/ui/input"
import { Building2, AlertCircle, Clock, CheckCircle2, Info } from "lucide-react"
import { loginUniversity } from "@/app/actions"

function UniversityLoginForm() {
    const searchParams = useSearchParams()
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Rate Limit State
    const [rateLimitEnds, setRateLimitEnds] = useState<number | null>(null)
    const [timeLeft, setTimeLeft] = useState<string | null>(null)

    // Handle URL Error Params
    useEffect(() => {
        const errorType = searchParams.get('error')
        if (errorType === 'NotUniversityEmail') setError("Please use your official university email address")
        if (errorType === 'PendingVerification') setError("Your university account is pending admin verification. You'll receive an email once approved.")
        if (errorType === 'AccountDeactivated') setError("Your account has been deactivated. Contact support@edumeetup.com.")
        if (errorType === 'EmailSignin') setError("The magic link has expired")
        if (errorType === 'Verification') setError("This link has already been used")
    }, [searchParams])

    // Countdown Timer
    useEffect(() => {
        if (!rateLimitEnds) return

        const interval = setInterval(() => {
            const now = Date.now()
            const diff = rateLimitEnds - now

            if (diff <= 0) {
                setRateLimitEnds(null)
                setTimeLeft(null)
                setError(null)
                clearInterval(interval)
            } else {
                const minutes = Math.floor(diff / 60000)
                const seconds = Math.floor((diff % 60000) / 1000)
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [rateLimitEnds])

    const BLOCKED_DOMAINS = [
        'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.in', 'hotmail.com',
        'outlook.com', 'live.com', 'icloud.com', 'rediffmail.com', 'protonmail.com',
        'proton.me', 'tempmail.com', 'mailinator.com'
    ]

    const ALLOWED_TLDS = ['.edu', '.ac.in', '.ac.uk', '.edu.au', '.ac.nz', '.edu.in', '.ac.za', '.edu.sg']

    const validateEmail = (email: string) => {
        const domain = email.split('@')[1]?.toLowerCase()
        if (!domain) return null // Let HTML validation handle empty/invalid format first

        if (BLOCKED_DOMAINS.includes(domain)) {
            return "Please use your official university email (e.g. name@university.edu or name@college.ac.in). Gmail, Yahoo and other personal emails are not accepted."
        }

        // Check Allowed TLDs (Optional strictness, but requested to "Allow only..." implies strict whitelist logic or at least exclude public)
        // User request: "Block these domains... Allow only emails ending in..."
        // So we strictly enforce ending with one of the allowed TLDs if not in blocked list?
        // "Allow only emails ending in:..." suggests a whitelist approach for extensions.
        const hasValidTLD = ALLOWED_TLDS.some(tld => domain.endsWith(tld))
        if (!hasValidTLD && !BLOCKED_DOMAINS.includes(domain)) {
            // If strictly enforcing, we block everything else.
            // But simpler approach requested: Block specific, Allow specific.
            // Let's stick to the prompt: "Allow only emails ending in..." -> Whitelist check.
            return "Please use an institutional email ending in .edu, .ac.in, etc."
        }

        return null
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)

        // Client-side Validation
        const validationError = validateEmail(email)
        if (validationError) {
            setError(validationError)
            return
        }

        setIsLoading(true)

        try {
            const formData = new FormData()
            formData.append('email', email)

            const result = await loginUniversity(formData)

            if (result?.error) {
                if (result.error.includes('Too many attempts')) {
                    setRateLimitEnds(Date.now() + 60000)
                }
                throw new Error(result.error)
            }

            if (result?.success) {
                setIsSuccess(true)
                setEmail("")
            }
        } catch (error: any) {
            setError(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-blue-100 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Check your inbox</h3>
                    <p className="mt-2 text-gray-600">
                        We sent a secure login link to <span className="font-semibold text-gray-900">{email}</span>
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-left text-sm text-blue-800 space-y-2 border border-blue-100">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Link expires in 15 minutes</li>
                        <li>Single use only</li>
                        <li>Check spam folder if missing</li>
                        <li className="font-semibold">Your account must be verified by edUmeetup admin before dashboard access</li>
                    </ul>
                </div>
                <div className="pt-4">
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Use a different email
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-blue-100">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
                <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold mb-4 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    University Portal
                </div>
                <h2 className="text-2xl font-bold text-gray-900">University Staff Login</h2>
                <p className="text-sm text-gray-500 mt-1">Access your admissions dashboard</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${rateLimitEnds ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-medium text-sm">{error}</p>
                        {rateLimitEnds && timeLeft && (
                            <p className="text-xs mt-1 font-mono font-bold">Try again in {timeLeft}</p>
                        )}
                    </div>
                </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Institutional Email
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="name@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || !!rateLimitEnds}
                        required
                        className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>

                <SubmitButton
                    type="submit"
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white"
                    isLoading={isLoading}
                    disabled={!!rateLimitEnds}
                    idleLabel="Send Sign-in Link"
                    loadingLabel="Sending Link..."
                    successLabel="Link Sent!"
                    errorLabel="Try Again"
                />
            </form>

            <div className="mt-8">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                </div>

                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => signIn('google')}
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google Workspace (.edu)
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4 flex gap-3">
                <Info className="h-5 w-5 text-blue-700 shrink-0" />
                <div className="text-sm text-blue-800">
                    <p className="mb-1 font-medium">Verification Required</p>
                    <p>University accounts require admin verification before access is granted. New here? <Link href="/university/register" className="underline hover:text-blue-900">Register your institution</Link>.</p>
                </div>
            </div>

            <div className="mt-8 text-center bg-gray-50 -mx-8 -mb-8 py-4 border-t border-gray-100 rounded-b-xl">
                <Link
                    href="/login"
                    className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                >
                    Are you a student? <span className="font-semibold underline decoration-blue-200 underline-offset-2">Student sign in →</span>
                </Link>
            </div>
        </div>
    )
}

export default function UniversityLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-sky-50">
            <Suspense fallback={<div className="text-center text-blue-600">Loading portal...</div>}>
                <UniversityLoginForm />
            </Suspense>
        </div>
    )
}
