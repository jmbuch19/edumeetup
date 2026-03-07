'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GraduationCap, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { sendUniversityDirectMessage } from '../actions'

interface Message {
    id: string
    content: string
    senderRole: string
    createdAt: Date
    readAt: Date | null
}

interface Conversation {
    id: string
    universityId: string
    student: {
        id: string
        fullName: string
        fieldOfInterest: string[]
        preferredCountries: string[]
        user: { name: string | null; image: string | null; email: string }
    }
    messages: Message[]
}

interface Quota {
    daily: number
    annual: number
    dailyLimit: number
    annualLimit: number
}

interface Props {
    conversation: Conversation
    quota: Quota
}

function StudentAvatar({ name, image }: { name: string | null; image: string | null }) {
    if (image) {
        return <img src={image} alt="" className="w-full h-full object-cover" />
    }
    const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return <span className="text-sm font-bold text-white">{initials}</span>
}

export function UniversityThreadClient({ conversation, quota }: Props) {
    const router = useRouter()
    const [content, setContent] = useState('')
    const [isPending, startTransition] = useTransition()
    const bottomRef = useRef<HTMLDivElement>(null)

    const canSend = quota.daily < quota.dailyLimit && quota.annual < quota.annualLimit
    const displayName = conversation.student.fullName || conversation.student.user.name || 'Student'

    const handleSend = () => {
        if (!content.trim() || !canSend) return
        const msg = content.trim()
        setContent('')
        startTransition(async () => {
            const result = await sendUniversityDirectMessage(conversation.id, msg)
            if (result?.error) {
                toast.error(result.error)
                setContent(msg)
            }
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-130px)]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10 bg-white"
                style={{ borderColor: 'var(--border-dash)' }}>
                <button onClick={() => router.push('/university/messages')}
                    className="p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="h-4 w-4" style={{ color: 'var(--navy)' }} />
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: conversation.student.user.image ? 'transparent' : 'var(--teal)' }}>
                    <StudentAvatar name={displayName} image={conversation.student.user.image} />
                </div>

                {/* Name + info */}
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--navy)' }}>
                        {displayName}
                    </p>
                    {conversation.student.fieldOfInterest.length > 0 && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            Interested in: {conversation.student.fieldOfInterest.slice(0, 2).join(', ')}
                        </p>
                    )}
                </div>

                {/* Quota pill */}
                <div className="ml-auto flex-shrink-0">
                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                        style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}>
                        📩 {quota.annual}/{quota.annualLimit} yr · {quota.daily}/{quota.dailyLimit} today
                    </span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
                {conversation.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                            <Send className="h-6 w-6" style={{ color: 'var(--teal)' }} />
                        </div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Start the conversation</p>
                        <p className="text-xs max-w-xs" style={{ color: 'var(--text-muted)' }}>
                            Send your first message to {displayName}.
                        </p>
                    </div>
                ) : (
                    conversation.messages.map((msg) => {
                        const isMe = msg.senderRole === 'UNIVERSITY'
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm"
                                    style={{
                                        background: isMe ? 'var(--teal)' : 'white',
                                        color: isMe ? 'white' : 'var(--navy)',
                                        borderBottomRightRadius: isMe ? 4 : undefined,
                                        borderBottomLeftRadius: !isMe ? 4 : undefined,
                                        border: !isMe ? '1px solid var(--border-dash)' : 'none',
                                    }}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-100' : ''}`}
                                        style={!isMe ? { color: 'var(--text-muted)' } : {}}>
                                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && msg.readAt && ' · ✓'}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <div className="border-t px-4 py-3 bg-white sticky bottom-0" style={{ borderColor: 'var(--border-dash)' }}>
                {!canSend ? (
                    <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                        Daily or annual message limit reached. You can send more messages tomorrow.
                    </p>
                ) : (
                    <div className="flex items-end gap-2">
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={2}
                            maxLength={300}
                            placeholder="Type a message… (Ctrl+Enter to send)"
                            className="flex-1 rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                            style={{ borderColor: 'var(--border-dash)', color: 'var(--navy)' }}
                        />
                        <Button
                            onClick={handleSend}
                            disabled={isPending || !content.trim()}
                            size="sm"
                            className="text-white h-10 px-4 mb-0.5 flex-shrink-0"
                            style={{ background: 'var(--teal)' }}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </div>
                )}
                <p className="text-[10px] text-right mt-1" style={{ color: 'var(--text-muted)' }}>
                    {content.length}/300 characters
                </p>
            </div>
        </div>
    )
}
