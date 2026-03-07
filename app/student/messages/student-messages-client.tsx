'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Send, Clock, CheckCircle, Loader2, ChevronDown, Building2, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { sendSupportMessage } from './actions'

// ─── Types ───────────────────────────────────────────────────────
interface Ticket {
    id: string
    category: string
    message: string
    status: string
    createdAt: Date
}

interface Quota {
    daily: number
    annual: number
    dailyLimit: number
    annualLimit: number
}

interface ConversationSummary {
    id: string
    universityId: string
    updatedAt: Date
    unreadCount: number
    university: { id: string; institutionName: string; logo: string | null }
    messages: Array<{ content: string; senderRole: string; createdAt: Date }>
}

// ─── Support tab sub-components ─────────────────────────────────
const CATEGORIES = [
    'General Question',
    'Profile / Account Issue',
    'Meeting Problem',
    'University Match Request',
    'Document Help',
    'Fair Registration',
    'Technical Issue',
    'Other',
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    NEW: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
    RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
    CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-500' },
}

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} size="sm"
            className="gap-2 text-white"
            style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {pending ? 'Sending…' : 'Send Message'}
        </Button>
    )
}

function SupportTab({ tickets, quota }: { tickets: Ticket[]; quota: Quota }) {
    const [state, formAction] = useFormState(sendSupportMessage as any, {} as { success?: boolean; message?: string; error?: string })
    const [charCount, setCharCount] = useState(0)
    const canSend = quota.daily < quota.dailyLimit && quota.annual < quota.annualLimit
    const [showForm, setShowForm] = useState(tickets.length === 0 && canSend)

    useEffect(() => {
        if (state?.success) {
            toast.success(state.message)
            setShowForm(false)
            setCharCount(0)
            const ta = document.getElementById('msg-textarea') as HTMLTextAreaElement
            if (ta) ta.value = ''
        } else if (state?.error) {
            toast.error(state.error)
        }
    }, [state])

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reach out to the EdUmeetup support team anytime. Typically replies within 24 hours.</p>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                        style={{ background: 'var(--surface)', color: quota.annual >= quota.annualLimit ? '#dc2626' : quota.daily >= quota.dailyLimit ? '#d97706' : 'var(--text-muted)' }}>
                        📩 {quota.annual}/{quota.annualLimit} yr · {quota.daily}/{quota.dailyLimit} today
                    </span>
                    {!showForm && canSend && (
                        <Button size="sm" onClick={() => setShowForm(true)} className="gap-2 text-white text-xs"
                            style={{ background: 'var(--teal)' }}>
                            <MessageSquare className="h-3.5 w-3.5" />
                            New Message
                        </Button>
                    )}
                </div>
            </div>

            {!canSend && (
                <div className="rounded-xl border px-4 py-3 text-sm"
                    style={{ background: '#FEF3C7', borderColor: '#FDE68A', color: '#92400E' }}>
                    {quota.annual >= quota.annualLimit
                        ? `Annual limit of ${quota.annualLimit} support messages reached.`
                        : `Daily limit of ${quota.dailyLimit} support messages reached. Try again tomorrow.`}
                </div>
            )}

            {showForm && canSend && (
                <div className="rounded-2xl border bg-white shadow-sm p-5" style={{ borderColor: 'var(--border-dash)' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: 'var(--teal)' }}>E</div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>EdUmeetup Support</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Typically replies within 24 hours</p>
                        </div>
                    </div>
                    <form action={formAction} className="flex flex-col gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--navy)' }}>What is this about? *</label>
                            <div className="relative">
                                <select name="category" required
                                    className="w-full h-10 rounded-lg border px-3 text-sm appearance-none pr-8 focus:outline-none focus:ring-2"
                                    style={{ borderColor: 'var(--border-dash)', color: 'var(--navy)' }}>
                                    <option value="">Select a topic…</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-3 h-4 w-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--navy)' }}>Your message *</label>
                            <textarea id="msg-textarea" name="message" required rows={5} maxLength={2000}
                                placeholder="Describe your issue or question in detail…"
                                onChange={e => setCharCount(e.target.value.length)}
                                className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                                style={{ borderColor: 'var(--border-dash)', color: 'var(--navy)' }} />
                            <p className="text-right text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{charCount}/2000</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            {tickets.length > 0 && (
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="text-xs underline" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                            )}
                            <div className="ml-auto"><SubmitButton /></div>
                        </div>
                    </form>
                </div>
            )}

            {tickets.length > 0 && (
                <div className="flex flex-col gap-3">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Previous Messages</p>
                    {tickets.map(ticket => {
                        const status = STATUS_LABELS[ticket.status] ?? STATUS_LABELS.NEW
                        return (
                            <div key={ticket.id} className="rounded-2xl border bg-white shadow-sm p-4 flex flex-col gap-2"
                                style={{ borderColor: 'var(--border-dash)' }}>
                                <div className="flex items-start justify-between gap-3">
                                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--navy)' }}>{ticket.category}</span>
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>{status.label}</span>
                                </div>
                                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{ticket.message}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Clock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {ticket.status === 'RESOLVED' && <CheckCircle className="h-3 w-3 ml-auto" style={{ color: 'var(--teal)' }} />}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {tickets.length === 0 && !showForm && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                        <MessageSquare className="h-7 w-7" style={{ color: 'var(--teal)' }} />
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--navy)' }}>No messages yet</p>
                    <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>Need help? Send us a message and our team will respond within 24 hours.</p>
                    <Button size="sm" onClick={() => setShowForm(true)} className="mt-2 text-white gap-2" style={{ background: 'var(--teal)' }}>
                        <MessageSquare className="h-4 w-4" />
                        Start a Conversation
                    </Button>
                </div>
            )}
        </div>
    )
}

// ─── Universities tab sub-component ─────────────────────────────
function UniversitiesTab({ conversations }: { conversations: ConversationSummary[] }) {
    const router = useRouter()

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                    <Building2 className="h-7 w-7" style={{ color: 'var(--teal)' }} />
                </div>
                <p className="font-semibold" style={{ color: 'var(--navy)' }}>No conversations yet</p>
                <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                    Express interest in a university to start a private conversation with them.
                </p>
                <Button size="sm" onClick={() => router.push('/universities')} className="mt-2 text-white gap-2" style={{ background: 'var(--teal)' }}>
                    Browse Universities
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {conversations.map(conv => {
                const lastMsg = conv.messages[0]
                return (
                    <button key={conv.id}
                        onClick={() => router.push(`/student/messages/${conv.id}`)}
                        className="w-full text-left rounded-2xl border bg-white shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                        style={{ borderColor: conv.unreadCount > 0 ? 'var(--teal)' : 'var(--border-dash)' }}>

                        {/* Logo / Avatar */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: 'var(--surface)' }}>
                            {conv.university.logo
                                ? <img src={conv.university.logo} alt="" className="w-full h-full object-contain p-1" />
                                : <Building2 className="h-6 w-6" style={{ color: 'var(--teal)' }} />
                            }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--navy)' }}>
                                    {conv.university.institutionName}
                                </p>
                                {conv.unreadCount > 0 && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                                        style={{ background: 'var(--teal)' }}>
                                        {conv.unreadCount} new
                                    </span>
                                )}
                            </div>
                            {lastMsg && (
                                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {lastMsg.senderRole === 'STUDENT' ? 'You: ' : ''}{lastMsg.content}
                                </p>
                            )}
                        </div>

                        {/* Timestamp */}
                        <p className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {new Date(conv.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                    </button>
                )
            })}
        </div>
    )
}

// ─── Main exported component ─────────────────────────────────────
interface Props {
    tickets: Ticket[]
    conversations: ConversationSummary[]
    defaultTab: string
    supportQuota: Quota
}

export function StudentMessagesClient({ tickets, conversations, defaultTab, supportQuota }: Props) {
    const router = useRouter()
    const [tab, setTab] = useState(defaultTab === 'support' ? 'support' : 'universities')

    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

    const switchTab = (t: string) => {
        setTab(t)
        router.replace(`/student/messages?tab=${t}`, { scroll: false })
    }

    return (
        <div className="flex flex-col gap-5 py-5 px-4 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                    Messages
                </h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Chat with universities and get help from support.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
                {[
                    { id: 'universities', label: 'Universities', icon: <Building2 className="h-3.5 w-3.5" />, badge: totalUnread },
                    { id: 'support', label: 'Support', icon: <Inbox className="h-3.5 w-3.5" />, badge: 0 },
                ].map(t => (
                    <button key={t.id}
                        onClick={() => switchTab(t.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                        style={{
                            background: tab === t.id ? 'white' : 'transparent',
                            color: tab === t.id ? 'var(--navy)' : 'var(--text-muted)',
                            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        }}>
                        {t.icon}
                        {t.label}
                        {t.badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                                style={{ background: 'var(--teal)' }}>{t.badge}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab body */}
            {tab === 'universities'
                ? <UniversitiesTab conversations={conversations} />
                : <SupportTab tickets={tickets} quota={supportQuota} />
            }
        </div>
    )
}
