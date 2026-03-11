'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail, AlertCircle, ShieldCheck, Info } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/app/actions'
import { COMMON_TYPO_DOMAINS } from '@/lib/schemas'

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [emailError, setEmailError] = useState<string | null>(null)
    const [trustDevice, setTrustDevice] = useState(true)
    const [showTip, setShowTip] = useState(false)

    function checkEmailTypo(email: string): string | null {
        const domain = email.trim().toLowerCase().split('@')[1] ?? ''
        const suggestion = COMMON_TYPO_DOMAINS[domain]
        return suggestion ? `Did you mean @${suggestion}?` : null
    }

    async function handleLogin(formData: FormData) {
        const emailVal = (formData.get('email') as string ?? '').trim().toLowerCase()
        formData.set('email', emailVal)

        // Store device trust preference so SessionGuard can act on it after magic link redirect
        if (typeof window !== 'undefined') {
            if (trustDevice) {
                localStorage.removeItem('em_shared_device')
            } else {
                localStorage.setItem('em_shared_device', '1')
            }
        }

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

                        {/* Trust This Device */}
                        <div className={`rounded-lg border px-3 py-2.5 transition-colors ${trustDevice ? 'border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800' : 'border-border bg-muted/40'}`}>
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={trustDevice}
                                    onChange={(e) => setTrustDevice(e.target.checked)}
                                    className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck className={`h-3.5 w-3.5 shrink-0 ${trustDevice ? 'text-indigo-600' : 'text-muted-foreground'}`} />
                                        <span className={`text-sm font-medium ${trustDevice ? 'text-indigo-700 dark:text-indigo-300' : 'text-muted-foreground'}`}>
                                            Trust this device
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setShowTip(!showTip)}
                                            className="text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <Info className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {trustDevice
                                            ? 'Stay signed in for 30 days on this device.'
                                            : 'You will be signed out when the browser closes.'}
                                    </p>
                                </div>
                            </label>
                            {showTip && (
                                <p className="mt-2 text-xs text-muted-foreground border-t border-border pt-2">
                                    ⚠️ Uncheck this on a shared or public computer so others cannot access your account.
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

                    {/* Registration prompt — shown when user has no account */}
                    <div className="mt-4 pt-4 border-t border-border text-center space-y-1">
                        <p className="text-xs text-muted-foreground">
                            New to EdUmeetup, or no email arriving?
                        </p>
                        <a
                            href="/student/register"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                            Create your account here →
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

