'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function AdminSubError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[AdminSubError]', error.message, error.digest)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin page error</h2>
            <p className="text-gray-500 mb-1 text-sm font-mono">
                {error.message || 'An unexpected error occurred.'}
            </p>
            {error.digest && (
                <p className="text-xs text-gray-400 mb-6 font-mono">Digest: {error.digest}</p>
            )}
            <div className="flex gap-3 mt-4">
                <Button onClick={() => reset()}>Try Again</Button>
                <Link href="/login">
                    <Button variant="outline">Back to Login</Button>
                </Link>
            </div>
        </div>
    )
}
