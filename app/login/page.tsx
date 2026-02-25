'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/app/actions' // Import Server Action

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)

    async function handleLogin(formData: FormData) {
        setIsLoading(true)

        try {
            const result = await login(formData)

            if (result?.error) {
                // Handle different error shapes (string or object)
                const errorMessage = typeof result.error === 'string'
                    ? result.error
                    : Object.values(result.error).flat().join(', ')

                toast.error(errorMessage)
            } else if (result?.success) {
                toast.success(result.message)
            }
            // On success, signIn redirects to /auth/verify-request automatically
        } catch (error) {
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
                                name="email" // Added name for FormData
                                type="email"
                                placeholder="name@example.com"
                                required
                                disabled={isLoading}
                            />
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
