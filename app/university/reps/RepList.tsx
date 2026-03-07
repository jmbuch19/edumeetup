'use client'

import { Button } from '@/components/ui/button'
import { toggleRepStatus } from './actions'
import { useState } from 'react'

export default function RepList({ reps }: { reps: any[] }) {
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleToggle(id: string, status: string) {
        if (!confirm(`Are you sure you want to ${status === 'ACTIVE' ? 'suspend' : 'activate'} this user?`)) return

        setProcessingId(id)
        await toggleRepStatus(id, status)
        setProcessingId(null)
    }

    if (reps.length === 0) {
        return <div className="p-8 text-center text-gray-500">No representatives found. Add one to get started.</div>
    }

    return (
        <div>
            {reps.map((rep) => (
                <div key={rep.id} className="p-4 border-b flex items-center text-sm hover:bg-gray-50">
                    <div className="flex-1 font-medium">{rep.email}</div>
                    <div className="w-32 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${rep.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {rep.status}
                        </span>
                    </div>
                    <div className="w-32 text-center text-gray-500">
                        {new Date(rep.createdAt).toLocaleDateString()}
                    </div>
                    <div className="w-24 text-right">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={processingId === rep.id}
                            onClick={() => handleToggle(rep.id, rep.status)}
                            className={rep.status === 'ACTIVE' ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                            {rep.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    )
}
