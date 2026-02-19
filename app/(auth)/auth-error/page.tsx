'use client'

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, Ban, Clock, MailWarning, ShieldAlert, ArrowLeft } from "lucide-react"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"

function AuthErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const errorMap: Record<string, { title: string, message: string, icon: React.ElementType, color: string }> = {
        NotUniversityEmail: {
            title: "University email required",
            message: "We only accept official institutional email addresses (e.g. .edu, .ac.in). Personal emails like Gmail or Yahoo are not permitted for university accounts.",
            icon: MailWarning,
            color: "text-amber-600 bg-amber-100"
        },
        PendingVerification: {
            title: "Account pending verification",
            message: "Your university account is currently under review. You will receive an email notification once an admin has verified your institution details.",
            icon: Clock,
            color: "text-blue-600 bg-blue-100"
        },
        AccountDeactivated: {
            title: "Account deactivated",
            message: "Your account has been deactivated. Please contact support@edumeetup.com for assistance.",
            icon: Ban,
            color: "text-red-600 bg-red-100"
        },
        EmailSignin: {
            title: "Link expired or invalid",
            message: "The sign-in link you used is no longer valid. Please request a new one.",
            icon: AlertTriangle,
            color: "text-orange-600 bg-orange-100"
        },
        Verification: {
            title: "Link already used",
            message: "This sign-in link has already been used. Please request a new one to sign in.",
            icon: AlertTriangle,
            color: "text-orange-600 bg-orange-100"
        },
        OAuthAccountNotLinked: {
            title: "Email already registered",
            message: "This email is already associated with another sign-in method. Please sign in using your original method (e.g. Google or Magic Link).",
            icon: ShieldAlert,
            color: "text-purple-600 bg-purple-100"
        },
        Default: {
            title: "Authentication Error",
            message: "An unexpected error occurred during sign in. Please try again.",
            icon: AlertTriangle,
            color: "text-red-600 bg-red-100"
        }
    }

    // "Verification" usually means token issue in Auth.js, so treating same as Expired is fine.
    // Overriding icon import for Verification because CheckCircle2 wasn't in list but used here? 
    // Wait, I imported CheckCircle2 in prev file, here I didn't import CheckCircle2. 
    // Let's stick to AlertTriangle for Verification based on prompt "same as above" (EmailSignin).

    // Fix: Re-map Verification to match EmailSignin logic exactly as requested?
    // "Verification: Link already used — same as above"
    // So distinct message, but similar action.

    const errorConfig = errorMap[error as string] || errorMap.Default
    const Icon = errorConfig.icon

    // Special logic for Verification/EmailSignin re-using same visual? Yes.

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center space-y-6">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${errorConfig.color}`}>
                <Icon className="h-8 w-8" />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900">{errorConfig.title}</h2>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                    {errorConfig.message}
                </p>
            </div>

            <div className="pt-6">
                <Button asChild className="w-full bg-gray-900 hover:bg-gray-800">
                    <Link href={error === 'NotUniversityEmail' || error === 'PendingVerification' ? "/university-login" : "/login"}>
                        Try Again / Sign In
                    </Link>
                </Button>

                <div className="mt-4">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 inline-flex items-center">
                        <ArrowLeft className="mr-1 h-3 w-3" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <Suspense fallback={<div>Loading...</div>}>
                <AuthErrorContent />
            </Suspense>
        </div>
    )
}
