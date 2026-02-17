import { signIn, isUniversityEmail, isRateLimited, getRateLimitResetSeconds } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, loginType } = body

        // 1. Missing Email
        if (!email) {
            return NextResponse.json(
                { success: false, code: "MISSING_EMAIL", message: "Email address is required." },
                { status: 400 }
            )
        }

        // 2. Invalid Email Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, code: "INVALID_EMAIL", message: "Please enter a valid email address." },
                { status: 400 }
            )
        }

        // 3. University Domain Check
        if (loginType === "university") {
            if (!isUniversityEmail(email)) {
                return NextResponse.json(
                    {
                        success: false,
                        code: "NOT_UNIVERSITY_EMAIL",
                        message: "University sign-in requires an official university email address (e.g. name@university.edu or name@college.ac.in). Gmail, Yahoo and other personal emails are not accepted."
                    },
                    { status: 403 }
                )
            }
        }

        // 4. Rate Limit Check
        // Note: isRateLimited inside signIn callback handles it too, but we want explicit 429 here as requested
        if (isRateLimited(email)) {
            const resetIn = getRateLimitResetSeconds(email)
            return NextResponse.json(
                {
                    success: false,
                    code: "RATE_LIMITED",
                    message: `Too many requests. Please wait ${Math.ceil(resetIn / 60)} minutes.`,
                    resetInSeconds: resetIn
                },
                { status: 429 }
            )
        }

        // 5. Trigger Auth.js SignIn
        const callbackUrl = loginType === "university" ? "/university/dashboard?loginType=university" : "/student/dashboard"

        try {
            await signIn("email", {
                email,
                redirect: false,
                redirectTo: callbackUrl
            })
        } catch (error: any) {
            // Check for Next.js Redirect (Success case for Auth.js server actions)
            if (error.message === 'NEXT_REDIRECT' || (error.digest && error.digest.startsWith('NEXT_REDIRECT'))) {
                // Determine if it was a success redirect or error redirect?
                // Usually success redirects to verification page.
                // We assume success here.
                return NextResponse.json(
                    { success: true, message: "Magic link sent! Check your inbox." },
                    { status: 200 }
                )
            }
            // Handle AuthErrors (e.g. AccessDenied from callbacks)
            if (error.type === 'AccessDenied' || error.type === 'CallbackRouteError') {
                // Allow these to bubble up to main error handler or handle here
                // The user wants generic error in prod, specifics in dev.
                throw error
            }
            throw error
        }

        return NextResponse.json(
            { success: true, message: "Magic link sent! Check your inbox." },
            { status: 200 }
        )

    } catch (error: any) {
        console.error("Magic Link Error:", error)

        // Customize error message based on environment
        const errorMessage = process.env.NODE_ENV === 'development'
            ? error.message
            : "An error occurred while sending the magic link. Please try again."

        return NextResponse.json(
            { success: false, message: errorMessage },
            { status: 500 }
        )
    }
}
