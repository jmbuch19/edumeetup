'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { SubmitButton } from "@/components/SubmitButton"
import { Input } from "@/components/ui/input"
import { GraduationCap, AlertCircle, Clock } from "lucide-react" // Using GraduationCap as logo icon based on existing

function LoginForm() {
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
        if (errorType === 'EmailSignin') setError("The magic link has expired")
        if (errorType === 'Verification') setError("This link has already been used")
        if (errorType === 'AccountDeactivated') setError("Your account has been deactivated. Contact support@edumeetup.com.")
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
                setError(null) // Clear rate limit error
                clearInterval(interval)
            } else {
                const minutes = Math.floor(diff / 60000)
                const seconds = Math.floor((diff % 60000) / 1000)
                setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [rateLimitEnds])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            const res = await fetch("/api/auth/send-magic-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, loginType: 'student' }),
            })

            const data = await res.json()

            if (res.status === 429) {
                // Rate Limited
                // Try to parse "Try again in X minutes" or just default 60s if not found
                // The API might return text, let's look at standard headers or message
                // Assuming simplistic handling for now or robust parsing
                // If API returns "Too many attempts", we can set a default lockout (e.g., 60s) 
                // or if we have the specific time from header.

                // Let's assume 60 seconds default lockout for UX if not explicit, 
                // OR parse the message if it contains numbers.
                // For this MVP, let's set a 60s timer if we hit 429.
                setRateLimitEnds(Date.now() + 60000)
                setError(data.error || "Too many attempts. Please wait.")
                setIsLoading(false)
                return
            }

            if (!res.ok) {
                throw new Error(data.error || "Something went wrong")
            }

            setIsSuccess(true)
            setEmail("") // Clear for security/cleanliness? Or keep for reference? 
            // UX: Layout changes to Success screen, so clearing is fine.
        } catch (error: any) {
            setError(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (isSuccess) {
        return (
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-indigo-100 text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <Clock className="h-8 w-8 text-green-600" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">Check your inbox</h3>
                    <p className="mt-2 text-gray-600">
                        We sent a magic link to <span className="font-semibold text-gray-900">{email}</span>
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-left text-sm text-blue-800 space-y-2">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Link expires in 15 minutes</li>
                        <li>Single use only</li>
                        <li>Check your spam folder if not found</li>
                    </ul>
                </div>
                <div className="pt-4">
                    <button
                        onClick={() => setIsSuccess(false)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Click here to try another email
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-indigo-100">
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl font-bold text-indigo-600">eU</span>
                    <span className="text-xl font-semibold text-gray-900">edUmeetup</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Student Sign In</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your email to continue</p>
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
                        Email address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading || !!rateLimitEnds}
                        required
                        className="h-11"
                    />
                    <p className="text-xs text-gray-500">
                        Any email works — Gmail, Yahoo, Rediffmail, or your college email.
                    </p>
                </div>

                <SubmitButton
                    type="submit"
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
                    isLoading={isLoading}
                    disabled={!!rateLimitEnds}
                    idleText="Send Sign-in Link"
                    loadingText="Sending Link..."
                    successText="Link Sent!"
                    errorText="Try Again"
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
                        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
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
                        Sign in with Google
                    </button>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link
                    href="/university/login"
                    className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
                >
                    Are you a university? <span className="font-semibold underline decoration-indigo-200 underline-offset-2">University sign in →</span>
                </Link>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    )
}
