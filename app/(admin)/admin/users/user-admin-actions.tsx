'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Shield, ShieldOff, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { blockUser, unblockUser, deleteUser, syncProfileComplete } from './actions'
import { useRouter } from 'next/navigation'

interface UserAdminActionsProps {
    userId: string
    studentId?: string | null
    isActive: boolean
    profileComplete?: boolean
    isActuallyComplete?: boolean // computed from actual fields
}

export function UserAdminActions({
    userId,
    studentId,
    isActive,
    profileComplete,
    isActuallyComplete,
}: UserAdminActionsProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [loading, setLoading] = useState<'block' | 'sync' | 'delete' | null>(null)

    const profileMismatch = studentId && isActuallyComplete !== profileComplete

    async function handleBlock() {
        setLoading('block')
        startTransition(async () => {
            const res = isActive ? await blockUser(userId) : await unblockUser(userId)
            if ('error' in res && res.error) toast.error(res.error)
            else toast.success(isActive ? 'User blocked' : 'User unblocked')
            setLoading(null)
        })
    }

    async function handleSync() {
        if (!studentId) return
        setLoading('sync')
        startTransition(async () => {
            const res = await syncProfileComplete(studentId)
            if ('error' in res && res.error) toast.error(res.error)
            else toast.success(`Profile status synced — now marked as ${res.isComplete ? 'Complete' : 'Incomplete'}`)
            setLoading(null)
        })
    }

    async function handleDelete() {
        if (!confirm('Permanently delete this user? This cannot be undone.')) return
        setLoading('delete')
        startTransition(async () => {
            const res = await deleteUser(userId)
            if ('error' in res && res.error) { toast.error(res.error); setLoading(null); return }
            toast.success('User deleted')
            router.push('/admin/users')
        })
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Sync profile status — only shown when stored value is stale */}
            {profileMismatch && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSync}
                    disabled={isPending}
                    className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                    {loading === 'sync' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Sync Profile Status
                </Button>
            )}

            {/* Block / Unblock */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleBlock}
                disabled={isPending}
                className={`gap-1.5 ${isActive
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-700 hover:bg-green-50'
                    }`}
            >
                {loading === 'block' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isActive ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                ) : (
                    <Shield className="h-3.5 w-3.5" />
                )}
                {isActive ? 'Block User' : 'Unblock User'}
            </Button>

            {/* Delete */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
            >
                {loading === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete User
            </Button>
        </div>
    )
}
