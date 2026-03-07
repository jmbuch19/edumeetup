'use client'

import { useState, useEffect, useRef } from 'react'
import { X, HelpCircle, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { sendContactAdminMessage } from '@/app/actions/contact-admin'

const SUBJECTS = [
    'Technical Issue',
    'Account Query',
    'Partnership Question',
    'Other',
]

interface ContactAdminPanelProps {
    open: boolean
    onClose: () => void
    senderName: string
    senderEmail: string
    senderOrg: string
    portalType: 'University' | 'Student'
}

export function ContactAdminPanel({
    open,
    onClose,
    senderName,
    senderEmail,
    senderOrg,
    portalType,
}: ContactAdminPanelProps) {
    const [subject, setSubject] = useState(SUBJECTS[0])
    const [message, setMessage] = useState('')
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')
    const panelRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    // Reset form when closed
    useEffect(() => {
        if (!open) {
            setStatus('idle')
            setMessage('')
            setSubject(SUBJECTS[0])
            setErrorMsg('')
        }
    }, [open])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!message.trim()) return
        setStatus('sending')
        const result = await sendContactAdminMessage({
            subject,
            message,
            senderName,
            senderEmail,
            senderOrg,
            portalType,
        })
        if (result?.error) {
            setErrorMsg(result.error)
            setStatus('error')
        } else {
            setStatus('success')
        }
    }

    if (!open) return null

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-in panel */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Help & Contact Admin"
                className="fixed bottom-0 left-0 z-[61] w-full max-w-sm h-auto"
                style={{
                    background: 'var(--navy)',
                    borderRadius: '16px 16px 0 0',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.4)',
                    animation: 'slideUp 0.22s cubic-bezier(.4,0,.2,1)',
                }}
            >
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to   { transform: translateY(0);    opacity: 1; }
                    }
                `}</style>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, var(--teal), var(--navy-mid))' }}>
                            <HelpCircle className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">Help & Contact Admin</p>
                            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                We respond within 24 hours
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        aria-label="Close"
                    >
                        <X className="h-4.5 w-4.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-6 pt-4">
                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
                            <CheckCircle2 className="h-10 w-10" style={{ color: 'var(--teal-light)' }} />
                            <p className="text-white font-semibold text-sm">Message sent!</p>
                            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                We'll respond within 24 hours to<br /><strong className="text-white/70">{senderEmail}</strong>
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-2 text-xs font-medium px-4 py-2 rounded-lg"
                                style={{ background: 'rgba(13,148,136,0.2)', color: 'var(--teal-light)' }}
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Sender info pill */}
                            <div className="rounded-xl px-3 py-2.5 text-[11px]"
                                style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>
                                Sending as <strong className="text-white/80">{senderName}</strong>
                                {' · '}{senderEmail}
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-[11px] font-medium mb-1.5"
                                    style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    Subject
                                </label>
                                <select
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none transition-colors"
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'white',
                                    }}
                                >
                                    {SUBJECTS.map(s => (
                                        <option key={s} value={s} style={{ background: '#0f172a' }}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Message */}
                            <div>
                                <label className="block text-[11px] font-medium mb-1.5"
                                    style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    Message
                                </label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows={4}
                                    required
                                    minLength={10}
                                    placeholder="Describe your issue or question..."
                                    className="w-full text-sm rounded-xl px-3 py-2.5 outline-none resize-none transition-colors placeholder:opacity-30"
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: 'white',
                                    }}
                                />
                            </div>

                            {status === 'error' && (
                                <p className="text-xs" style={{ color: '#f87171' }}>{errorMsg || 'Failed to send. Please try again.'}</p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'sending' || !message.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                    background: message.trim() ? 'var(--teal)' : 'rgba(13,148,136,0.3)',
                                    color: 'white',
                                    cursor: message.trim() ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {status === 'sending' ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                                ) : (
                                    <><Send className="h-4 w-4" /> Send Message</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    )
}
