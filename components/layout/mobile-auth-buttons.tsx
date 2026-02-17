'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { usePathname } from "next/navigation"

export function MobileLoginButton() {
    const pathname = usePathname()
    const isUniversityPage = pathname?.startsWith('/university') || pathname?.startsWith('/universities')
    const loginLink = isUniversityPage ? '/login?type=university' : '/login'

    return (
        <Link href={loginLink}>
            <Button variant="ghost" size="sm">
                Log in
            </Button>
        </Link>
    )
}

export function MobileSignUpItem() {
    const pathname = usePathname()
    const isUniversityPage = pathname?.startsWith('/university') || pathname?.startsWith('/universities')
    const signUpLink = isUniversityPage ? '/university/register' : '/student/register'
    const signUpText = isUniversityPage ? 'Partner with us' : 'Sign up'

    return (
        <DropdownMenuItem asChild>
            <Link href={signUpLink} className="w-full cursor-pointer font-semibold text-primary">
                {signUpText}
            </Link>
        </DropdownMenuItem>
    )
}
