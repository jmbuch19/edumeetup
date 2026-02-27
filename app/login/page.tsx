'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/app/actions'
import { COMMON_TYPO_DOMAINS } from '@/lib/schemas'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)

    function checkEmailTypo(email: string): string | null {
        const domain = email.trim().toLowerCase().split('@')[1] ?? ''
        const suggestion = COMMON_TYPO_DOMAINS[domain]
        return suggestion ? `Did you mean @${suggestion}?` : null
    }

    async function handleLogin(formData: FormData) {
        // Normalize email before submitting
        const emailVal = (formData.get('email') as string ?? '').trim().toLowerCase()
        formData.set('email', emailVal)

        setIsLoading(true)
        try {
            const result = await login(formData)

            if (result?.error) {
                const errorMessage = typeof result.error === 'string'
                    ? result.error
                    : Object.values(result.error).flat().join(', ')
                toast.error(errorMessage)
            } else if (result?.success) {
                toast.success(result.message)
            }
        } catch {
            toast.error('An unexpected error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container flex min-h-screen w-screen flex-col items-center justify-center px-4">
            <Card className="w-full max-w-sm">
                <CardHeader className="text-center">
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your email to sign in via Magic Link
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                disabled={isLoading}
                                className={emailError ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
                                onBlur={(e) => {
                                    e.target.value = e.target.value.trim().toLowerCase()
                                    setEmailError(checkEmailTypo(e.target.value))
                                }}
                            />
                            {emailError && (
                                <p className="flex items-center gap-1 text-xs text-amber-600">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {emailError} Please fix before signing in.
                                </p>
                            )}
                        </div>
                        <Button className="w-full" type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            Sign In with Email
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
