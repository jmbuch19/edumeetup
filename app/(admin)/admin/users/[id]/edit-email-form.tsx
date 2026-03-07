'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Pencil, X, Check, Loader2 } from 'lucide-react'
import { updateUserEmail } from '../actions'

export function EditEmailForm({ userId, currentEmail }: { userId: string; currentEmail: string }) {
    const [editing, setEditing] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [isPending, startTransition] = useTransition()

    function handleCancel() {
        setEditing(false)
        setNewEmail('')
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const fd = new FormData()
        fd.set('userId', userId)
        fd.set('newEmail', newEmail)
        startTransition(async () => {
            const res = await updateUserEmail(fd)
            if (res?.error) {
                toast.error(res.error)
            } else {
                toast.success('Email updated — student will need to log in with the new address. Email verification reset.')
                setEditing(false)
                setNewEmail('')
            }
        })
    }

    if (!editing) {
        return (
            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 w-fit">
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Current Email</p>
                    <p className="text-sm font-medium text-slate-800">{currentEmail}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}
                    className="gap-1 text-xs text-amber-600 hover:bg-amber-50">
                    <Pencil className="h-3 w-3" /> Fix Email
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col gap-0.5">
                <p className="text-xs text-muted-foreground">Current: <span className="text-slate-500 line-through">{currentEmail}</span></p>
                <Input
                    type="email"
                    placeholder="Enter corrected email…"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="h-8 text-sm w-72"
                    required
                    autoFocus
                />
            </div>
            <div className="flex gap-1 mt-4">
                <Button type="submit" size="sm" disabled={isPending || !newEmail}
                    className="gap-1 bg-amber-600 hover:bg-amber-700 text-white h-8">
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Update
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={handleCancel} className="h-8">
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>
        </form>
    )
}
