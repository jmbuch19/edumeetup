'use client'

import { verifyUniversity } from '@/app/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-react'
import { useState } from 'react'

export function VerificationButtons({ id }: { id: string }) {
    const [loading, setLoading] = useState(false)

    const handleVerify = async (action: 'approve' | 'reject') => {
        if (action === 'reject' && !confirm('Are you sure you want to reject this university?')) return

        setLoading(true)
        const formData = new FormData()
        formData.append('universityId', id)
        formData.append('action', action)

        try {
            const result = await verifyUniversity(formData)
            if (result?.error) {
                toast.error(result.error)
            } else {
                toast.success(`University ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-end gap-2">
            <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleVerify('approve')}
                disabled={loading}
            >
                <CheckCircle className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => handleVerify('reject')}
                disabled={loading}
            >
                <XCircle className="h-4 w-4 mr-1" /> Reject
            </Button>
        </div>
    )
}
