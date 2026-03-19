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
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
    const searchParams = useSearchParams()
    const callbackUrl = searchParams.get('callbackUrl') || ''

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
                        <input type="hidden" name="callbackUrl" value={callbackUrl} />
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

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button 
                        variant="outline" 
                        type="button" 
                        className="w-full bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-all" 
                        onClick={() => signIn('google', { callbackUrl: callbackUrl || '/student/dashboard' })}
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                            <path d="M1 1h22v22H1z" fill="none" />
                        </svg>
                        Google
                    </Button>

                    {/* Registration prompts */}
                    <div className="mt-6 pt-4 border-t border-border text-center space-y-2">
                        <p className="text-xs text-muted-foreground">
                            New to EdUmeetup, or no email arriving?
                        </p>
                        <a
                            href="/student/register"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline block"
                        >
                            Create your account here →
                        </a>
                        <div className="pt-1 border-t border-border/50">
                            <a
                                href="/alumni-register"
                                className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 hover:underline font-medium"
                            >
                                🎓 IAES Alumni? Join the Alumni Bridge →
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    )
}

