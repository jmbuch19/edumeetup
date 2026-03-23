'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sendAlumniInvite } from '@/app/actions/alumni'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

type Invite = {
    id: string
    email: string
    status: string
    createdAt: Date
    expiresAt: Date
    acceptedAt?: Date | null
}

export function AlumniInvitePanel({ initialInvites }: { initialInvites: Invite[] }) {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successEmail, setSuccessEmail] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [invites, setInvites] = useState(initialInvites)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email) return

        setIsSubmitting(true)
        setError(null)
        setSuccessEmail(null)

        try {
            const formData = new FormData()
            formData.append('email', email)
            if (message) formData.append('message', message)

            const result = await sendAlumniInvite({ email, message })
            
            if (result.error) {
                setError(result.error)
            } else {
                setSuccessEmail(email)
                setEmail('')
                setMessage('')
                
                // Optimistically prepend the new invite
                if (result.inviteId) {
                    const newInvite: Invite = {
                        id: result.inviteId,
                        email,
                        status: 'PENDING',
                        createdAt: new Date(),
                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        acceptedAt: null,
                    }
                    setInvites([newInvite, ...invites])
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to send invite')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div id="invite" className="glass-card-gold rounded-2xl px-6 md:px-8 py-6 mb-12 shadow-md border border-[#F4E9CD]">
            <div className="mb-6">
                <h2 
                    className="text-[22px] font-black text-[#0B1340]"
                    style={{ fontFamily: 'var(--font-fraunces)' }}
                >
                    Invite Your Alumni
                </h2>
                <p 
                    className="text-[14px] text-[#888888] mt-1 max-w-2xl"
                    style={{ fontFamily: 'var(--font-jakarta)' }}
                >
                    Know an Indian graduate from your university? Invite them to join as a pro-bono Alumni Mentor on EdUmeetup. Takes 3 minutes.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-8 space-y-4 max-w-2xl">
                {successEmail && (
                    <div className="bg-green-50 text-green-800 rounded-xl p-4 flex items-start gap-3 animate-pop mb-4 border border-green-200">
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-[14px]" style={{ fontFamily: 'var(--font-jakarta)' }}>
                                Invite sent to {successEmail}!
                            </p>
                            <p className="text-green-700 text-sm mt-0.5">
                                They&apos;ll receive a co-branded invitation from EdUmeetup.
                            </p>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="bg-red-50 text-red-600 rounded-lg p-3 text-sm animate-pop">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <Input 
                        type="email" 
                        required 
                        placeholder="alumni@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-white"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Personal Message <span className="text-slate-400 font-normal">(Optional, max 300 chars)</span></label>
                    <Textarea 
                        placeholder="Hi [Name], I'd love for you to share your experience with prospective students..."
                        maxLength={300}
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="bg-white resize-none"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    />
                </div>

                <div className="pt-2">
                    <Button 
                        type="submit" 
                        variant="gold"
                        disabled={isSubmitting || !email}
                        className="px-6 border-none shadow-sm transition-all flex items-center gap-2"
                        style={{ fontFamily: 'var(--font-jakarta)' }}
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Invite &rarr;
                    </Button>
                </div>
            </form>

            {/* Invite History Table */}
            <div className="mt-10 border-t border-[#E8D19D] pt-8">
                <h3 className="text-lg font-bold text-[#0B1340] mb-4" style={{ fontFamily: 'var(--font-jakarta)' }}>Recent Invitations</h3>
                
                {invites.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-[#888888] text-[14px]" style={{ fontFamily: 'var(--font-jakarta)' }}>
                            No invites sent yet. Invite your first alumni above.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-sm" style={{ fontFamily: 'var(--font-jakarta)' }}>
                            <thead className="bg-[#fcfaf5] border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Email</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Status</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Sent</th>
                                    <th className="px-5 py-3 font-semibold text-slate-600">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invites.map((inv) => {
                                    const isExpired = new Date(inv.expiresAt) < new Date() && inv.status === 'PENDING';
                                    const displayStatus = isExpired ? 'EXPIRED' : inv.status;
                                    
                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-50/50">
                                            <td className="px-5 py-3.5 font-medium text-slate-900">{inv.email}</td>
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold leading-none ${
                                                    displayStatus === 'REGISTERED' ? 'bg-green-100 text-[#27500A]' : 
                                                    displayStatus === 'PENDING' ? 'bg-amber-100 text-[#633806]' : 
                                                    'bg-gray-100 text-[#888888]'
                                                }`}>
                                                    {displayStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">
                                                {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500">
                                                {inv.acceptedAt 
                                                    ? new Date(inv.acceptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                    : '-'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
