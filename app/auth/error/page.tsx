
'use client'

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, Home } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const errorMap: Record<string, { title: string, message: string }> = {
        RateLimited: {
            title: "Too Many Requests",
            message: "You have exceeded the rate limit. Please try again in 10 minutes."
        },
        AccountDeactivated: {
            title: "Account Deactivated",
            message: "Your account has been deactivated. Please contact support."
        },
        NotUniversityEmail: {
            title: "Invalid Email Domain",
            message: "This portal is restricted to university email addresses (e.g., .edu, .ac.in)."
        },
        PendingVerification: {
            title: "Verification Pending",
            message: "Your university account is pending verification. Please wait for admin approval."
        },
        Configuration: {
            title: "Configuration Error",
            message: "There is a problem with the server configuration. Please contact support."
        },
        AccessDenied: {
            title: "Access Denied",
            message: "You do not have permission to sign in."
        },
        Verification: {
            title: "Link Expired or Invalid",
            message: "The sign in link is no longer valid. It may have been used already or it may have expired."
        },
        Default: {
            title: "Authentication Error",
            message: "An unexpected error occurred. Please try again."
        }
    }

    const { title, message } = errorMap[error as string] || errorMap.Default

    return (
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h2>

            <p className="text-gray-600">
                {message}
            </p>

            <div className="mt-6 space-y-3">
                <Link href="/login">
                    <Button className="w-full">
                        Try Again
                    </Button>
                </Link>
                <Link href="/">
                    <Button variant="outline" className="w-full">
                        <Home className="mr-2 h-4 w-4" />
                        Go Home
                    </Button>
                </Link>
            </div>
        </div>
    )
}

export default function AuthErrorPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <Suspense fallback={<div>Loading...</div>}>
                <ErrorContent />
            </Suspense>
        </div>
    )
}
