'use client'

import { useState } from 'react'
import { updatePassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center text-red-600">
                            Invalid or missing token. Please request a new password reset link.
                        </div>
                        <Button asChild className="w-full mt-4">
                            <Link href="/forgot-password">Request Reset</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            // Append token to formData since it's not in an input
            formData.append('token', token as string)

            const result = await updatePassword(formData)

            if (result.error) {
                toast.error(result.error)
            } else {
                setSuccess(true)
                toast.success("Password updated successfully!")
                // Redirect after delay
                setTimeout(() => router.push('/login'), 3000)
            }
        } catch {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
                    <CardDescription>
                        Enter your new password below.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                            <div className="rounded-full bg-green-100 p-3 text-green-600">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Password Reset Complete</h3>
                            <p className="text-sm text-gray-500">
                                Your password has been updated successfully.
                            </p>
                            <Button asChild className="w-full mt-4">
                                <Link href="/login">Continue to Login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Input
                                    id="newPassword"
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    disabled={loading}
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Reset Password
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
