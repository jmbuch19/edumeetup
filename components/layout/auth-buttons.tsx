'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"

export function AuthButtons() {
    const pathname = usePathname()
    // Check if we are in the university section (but not in the dashboard, which requires auth anyway)
    // Also include /universities browsing page
    const isUniversityPage = pathname?.startsWith('/university') || pathname?.startsWith('/universities')

    const signUpLink = isUniversityPage ? '/university/register' : '/student/register'
    const signUpText = isUniversityPage ? 'Partner with us' : 'Sign up'
    const loginLink = isUniversityPage ? '/login?type=university' : '/login'

    return (
        <>
            <Link href={loginLink}>
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                    Log in
                </Button>
            </Link>
            <Link href={signUpLink}>
                <Button variant="default" size="sm">
                    {signUpText}
                </Button>
            </Link>
        </>
    )
}
