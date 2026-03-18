'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Copy, Mail, CheckCircle2, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'

interface AlumniInviteModalProps {
    universityName: string
    universityId: string
    trigger?: React.ReactNode
}

export function AlumniInviteModal({ universityName, universityId, trigger }: AlumniInviteModalProps) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)
    const [emails, setEmails] = useState('')
    const [isSending, setIsSending] = useState(false)

    // Using window.location.origin to build absolute URL for copying
    const inviteLink = typeof window !== 'undefined' 
        ? `${window.location.origin}/alumni-register?uid=${universityId}`
        : `/alumni-register?uid=${universityId}`

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteLink)
        setCopied(true)
        toast.success('Invite link copied to clipboard')
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSendInvites = async () => {
        if (!emails.trim()) {
            toast.error('Please enter at least one email address')
            return
        }
        
        setIsSending(true)
        // Simulate sending emails (would ideally be a server action calling Resend/SendGrid)
        await new Promise(res => setTimeout(res, 1000))
        setIsSending(false)
        setOpen(false)
        setEmails('')
        toast.success(`Invitations sent to alumni!`)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100">
                        <Mail className="h-4 w-4" /> Invite Alumni
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                        <GraduationCap className="h-6 w-6 text-amber-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">Grow Your Alumni Bridge</DialogTitle>
                    <DialogDescription className="text-center">
                        Invite {universityName} alumni to join EdUmeetup and represent your institution to prospective students.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Share your custom invite link</Label>
                        <p className="text-xs text-slate-500 mb-2">
                            Alumni using this link will automatically have {universityName} pre-selected during their registration.
                        </p>
                        <div className="flex items-center space-x-2">
                            <Input value={inviteLink} readOnly className="bg-slate-50 font-mono text-xs" />
                            <Button 
                                type="button" 
                                size="icon" 
                                variant={copied ? "default" : "secondary"}
                                onClick={handleCopy}
                                className={copied ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            >
                                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-slate-500 font-medium">Or Send Direct Invite</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Send email invitations</Label>
                        <Textarea 
                            placeholder="alumni1@example.com, alumni2@example.com..."
                            value={emails}
                            onChange={(e) => setEmails(e.target.value)}
                            className="min-h-[80px] text-sm"
                        />
                        <Button 
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                            disabled={!emails.trim() || isSending}
                            onClick={handleSendInvites}
                        >
                            {isSending ? 'Sending Invites...' : 'Send Invitations'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
