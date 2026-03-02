'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2, Trash2, Calendar, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'

interface DeleteAccountDialogProps {
    userEmail: string
    deletionRequestedAt: Date | null
    deletionScheduledFor: Date | null
    supportEmail?: string
}

type Step = 'warning' | 'confirm' | 'done'

export default function DeleteAccountDialog({
    userEmail,
    deletionRequestedAt,
    deletionScheduledFor,
    supportEmail = 'support@edumeetup.com',
}: DeleteAccountDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>('warning')
    const [confirmText, setConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)
    const [scheduledFor, setScheduledFor] = useState<string | null>(null)

    const formatDate = (d: Date | null | string) =>
        d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

    // Already requested
    if (deletionRequestedAt) {
        return (
            <div className="space-y-4">
                <h3 className="font-semibold text-slate-800">Delete Account</h3>
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold">
                        <Calendar className="h-4 w-4" />
                        Account deletion is scheduled
                    </div>
                    <p className="text-sm text-amber-700">
                        Requested on <strong>{formatDate(deletionRequestedAt)}</strong>. Your account data will be
                        permanently deleted on <strong>{formatDate(deletionScheduledFor)}</strong>.
                    </p>
                    <p className="text-sm text-amber-600">
                        If this was a mistake, email{' '}
                        <a href={`mailto:${supportEmail}`} className="underline font-medium">
                            {supportEmail}
                        </a>{' '}
                        before the deletion date.
                    </p>
                </div>
            </div>
        )
    }

    async function handleDelete() {
        if (confirmText !== 'DELETE') return
        setIsDeleting(true)
        try {
            const res = await fetch('/api/my-data/delete', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to initiate deletion')
            // Capture the actual scheduled deletion date returned by the API
            if (data.deletionScheduledFor) {
                setScheduledFor(formatDate(data.deletionScheduledFor))
            }
            setStep('done')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'An error occurred. Please try again.')
            setIsDeleting(false)
        }
    }

    function handleClose() {
        if (step !== 'done') {
            setOpen(false)
            setStep('warning')
            setConfirmText('')
        }
    }

    return (
        <div className="space-y-5">
            <div>
                <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-500" />
                    Delete My Account
                </h3>
                <p className="text-sm text-slate-500">
                    Permanently delete your account and all associated data.
                    Once confirmed, you cannot log in and all your data will be erased after a 7-day grace period.
                </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> This action is irreversible:
                </p>
                <ul className="list-disc pl-5 text-red-700 space-y-0.5 mt-1">
                    <li>Your account will be deactivated immediately</li>
                    <li>All upcoming meetings will be cancelled</li>
                    <li>All your data will be permanently deleted after 7 days</li>
                    <li>You will be signed out automatically</li>
                </ul>
            </div>

            <Dialog open={open} onOpenChange={handleClose}>
                <DialogTrigger asChild>
                    <Button variant="destructive" onClick={() => setOpen(true)} className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Request Account Deletion
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Account
                        </DialogTitle>
                        <DialogDescription>
                            {step === 'warning' && 'Review what will happen before confirming.'}
                            {step === 'confirm' && 'Type DELETE to confirm you understand this is permanent.'}
                            {step === 'done' && 'Your deletion request has been submitted.'}
                        </DialogDescription>
                    </DialogHeader>

                    {step === 'warning' && (
                        <div className="space-y-4 pt-2">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-2">
                                <p className="font-medium">Account: <span className="font-normal">{userEmail}</span></p>
                                <ul className="list-disc pl-4 space-y-1 text-red-700">
                                    <li>Account deactivated immediately (cannot log in)</li>
                                    <li>All upcoming meetings cancelled — other party notified</li>
                                    <li>Data permanently deleted in 7 days</li>
                                    <li>CV, documents, and profile data erased</li>
                                    <li>This cannot be undone after the grace period</li>
                                </ul>
                            </div>
                            <p className="text-sm text-slate-600">
                                You will receive a confirmation email with a support contact in case this was a mistake.
                            </p>
                            <div className="flex gap-3 justify-end pt-2">
                                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button variant="destructive" onClick={() => setStep('confirm')}>
                                    I understand, continue
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="space-y-4 pt-2">
                            <p className="text-sm text-slate-600">
                                Type <strong className="text-red-600">DELETE</strong> in the box below to confirm.
                            </p>
                            <Input
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder="Type DELETE here"
                                className="font-mono border-red-300 focus:border-red-500"
                                autoComplete="off"
                            />
                            <div className="flex flex-wrap gap-2 justify-end pt-2">
                                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                                <Button variant="outline" onClick={() => setStep('warning')}>Back</Button>
                                <Button
                                    variant="destructive"
                                    disabled={confirmText !== 'DELETE' || isDeleting}
                                    onClick={handleDelete}
                                    className="flex items-center gap-2"
                                >
                                    {isDeleting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                                    ) : (
                                        <><Trash2 className="h-4 w-4" /> Delete My Account</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="space-y-4 pt-2">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 space-y-2">
                                <p className="font-semibold flex items-center gap-1.5">
                                    <CheckCircle className="h-4 w-4" /> Deletion request received
                                </p>
                                <p>
                                    Your account has been deactivated. All your data will be permanently
                                    deleted on{' '}
                                    <strong>{scheduledFor ?? 'within 7 days'}</strong>.
                                    A confirmation email has been sent to <strong>{userEmail}</strong>.
                                </p>
                                <p className="text-green-700">
                                    To cancel, email{' '}
                                    <a href={`mailto:${supportEmail}`} className="underline font-medium">
                                        {supportEmail}
                                    </a>{' '}
                                    before the deletion date.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => signOut({ callbackUrl: '/' })}
                            >
                                Sign Out
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
