'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { verifyEmail } from '@/app/actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

function VerifyEmailForm() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const email = searchParams.get('email') || ''
    const [otp, setOtp] = useState('')
    const [loading, setLoading] = useState(false)

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) {
            toast.error('Email not found. Please register again.')
            return
        }
        if (otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP.')
            return
        }

        setLoading(true)
        try {
            const result = await verifyEmail(email, otp)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Email verified successfully!')
                router.push('/student/dashboard') // Or determine role based routing if needed
            }
        } catch {
            toast.error('Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    if (!email) {
        return (
            <div className="text-center">
                <p className="text-red-500">Invalid link. Email is missing.</p>
                <Button onClick={() => router.push('/student/register')} variant="link">
                    Go to Registration
                </Button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900">Verify Email</h2>
                <p className="mt-2 text-sm text-gray-600">
                    We sent a 6-digit code to <strong>{email}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-1">Check your spam folder if you don&apos;t see it.</p>
            </div>

            <form onSubmit={handleVerify} className="mt-8 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                    <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="text-center text-2xl tracking-widest"
                        autoFocus
                    />
                </div>

                <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify'}
                </Button>
            </form>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
            <Suspense fallback={<div>Loading...</div>}>
                <VerifyEmailForm />
            </Suspense>
        </div>
    )
}
