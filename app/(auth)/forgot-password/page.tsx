'use native'
import { useState } from 'react'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        try {
            const result = await forgotPassword(formData)
            if (result.error) {
                toast.error(result.error)
            } else {
                setSuccess(true)
                toast.success("Reset link sent!")
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
                    <CardTitle className="text-2xl font-bold tracking-tight">Forgot password</CardTitle>
                    <CardDescription>
                        Enter your email address and we will send you a link to reset your password.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center">
                            <div className="rounded-full bg-green-100 p-3 text-green-600">
                                <Mail className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Check your email</h3>
                            <p className="text-sm text-gray-500 max-w-xs">
                                We have sent a password reset link to your email address.
                            </p>
                            <Button asChild variant="outline" className="w-full mt-4">
                                <Link href="/login">Back to login</Link>
                            </Button>
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" placeholder="m@example.com" required disabled={loading} />
                            </div>
                            <Button className="w-full" type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Reset Link
                            </Button>
                        </form>
                    )}
                </CardContent>
                {!success && (
                    <CardFooter>
                        <Button variant="link" className="w-full" asChild>
                            <Link href="/login" className="flex items-center gap-2 text-muted-foreground">
                                <ArrowLeft className="h-4 w-4" /> Back to login
                            </Link>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    )
}
