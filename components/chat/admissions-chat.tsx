'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, ExternalLink, GraduationCap, Globe, EyeOff, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RegistrationGate } from './RegistrationGate'
import { CaptchaGate, isCaptchaVerified } from './CaptchaGate'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

/**
 * Extracts the last sentence of a bot reply that looks like a follow-up nudge
 * (contains a question mark, or starts with Want/Shall/Would/Can I).
 * Used to render a quick-reply chip below the message.
 */
function extractNudge(content: string): string | null {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 4); i--) {
        const line = lines[i]
        // Must be a question-like nudge, not a list item or heading
        if (
            line.endsWith('?') &&
            !line.startsWith('-') &&
            !line.startsWith('•') &&
            !line.startsWith('#') &&
            line.length > 20 &&
            line.length < 120
        ) {
            return line
        }
    }
    return null
}

interface AdmissionsChatProps {
    studentId?: string
}

const HIDE_KEY = 'edumeetup:concierge:hidden'

export function AdmissionsChat({ studentId }: AdmissionsChatProps) {
    // open = chat panel visible; hidden = entire widget dismissed for session
    const [open, setOpen] = useState(false)
    const [hidden, setHidden] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "👋 Hi! I'm your EdUmeetup Admissions Concierge.\n\nI can help you:\n• 🎓 Find universities that match your profile\n• 📅 Discover upcoming Campus Fairs\n• 📝 Understand admission requirements\n\nWhat would you like to explore today?",
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [gate, setGate] = useState<{
        reason: 'anon_limit' | 'anon_cooldown' | 'registered_limit'
        visitNumber?: number
        cooldownEndsAt?: number
    } | null>(null)
    // captchaOk: true if human verified this session, or user is registered
    const [captchaOk, setCaptchaOk] = useState(false)
    const [expanded, setExpanded] = useState(false)
    // Drag state — null = default bottom-right anchored position
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
    const dragging = useRef(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const panelRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    // Restore hide + captcha state from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHidden(sessionStorage.getItem(HIDE_KEY) === '1')
            setCaptchaOk(!!studentId || isCaptchaVerified())
        }
    }, [studentId])

    // Drag handlers
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return // don't drag on buttons
        const panel = panelRef.current
        if (!panel) return
        dragging.current = true
        const rect = panel.getBoundingClientRect()
        dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        panel.setPointerCapture(e.pointerId)
    }, [])

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!dragging.current || !panelRef.current) return
        const panel = panelRef.current
        const w = panel.offsetWidth
        const h = panel.offsetHeight
        const x = Math.min(Math.max(e.clientX - dragOffset.current.x, 0), window.innerWidth - w)
        const y = Math.min(Math.max(e.clientY - dragOffset.current.y, 0), window.innerHeight - h)
        setPos({ x, y })
    }, [])

    const onPointerUp = useCallback(() => { dragging.current = false }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    function hideForSession() {
        sessionStorage.setItem(HIDE_KEY, '1')
        setHidden(true)
        setOpen(false)
    }

    async function sendMessage(e?: React.FormEvent) {
        e?.preventDefault()
        if (!input.trim() || loading) return

        const userMessage: Message = { role: 'user', content: input.trim() }
        const updated = [...messages, userMessage]
        setMessages(updated)
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updated.map(m => ({ role: m.role, content: m.content })),
                    studentId,
                }),
            })

            const contentType = res.headers.get('content-type') || ''
            const traceId = res.headers.get('X-Trace-Id') ?? 'unknown'

            // ── JSON response: quota gate or deploy error ─────────────────
            if (contentType.includes('application/json')) {
                const data = await res.json()
                if (data.quota && !data.quota.allowed) {
                    setGate({
                        reason: data.quota.reason as 'anon_limit' | 'anon_cooldown' | 'registered_limit',
                        visitNumber: data.quota.visitNumber,
                        cooldownEndsAt: data.quota.cooldownEndsAt,
                    })
                    setLoading(false)
                    return
                }
                // Fallback JSON reply (shouldn't happen in normal flow)
                if (data.reply) {
                    setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
                }
                setLoading(false)
                return
            }

            // ── Stream response: read tokens as they arrive ───────────────
            if (!res.body) {
                setMessages(prev => [...prev, { role: 'assistant', content: '⏳ No response received. Please try again.' }])
                setLoading(false)
                return
            }

            // Add an empty assistant bubble that we'll fill token-by-token
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
            setLoading(false) // spinner off — text is appearing live

            const reader = res.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })

                // Skip tool call chunks — never show raw JSON to user
                if (
                    chunk.includes('"$schema"') ||
                    chunk.includes('"type":"tool"') ||
                    chunk.trim().startsWith('{"name":')
                ) continue

                setMessages(prev => {
                    const msgs = [...prev]
                    const last = msgs[msgs.length - 1]
                    if (last?.role === 'assistant') {
                        msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
                    }
                    return msgs
                })
            }

            // Check if the stream produced any content
            const lastMsg = (() => { let m: Message | undefined; setMessages(prev => { m = prev[prev.length - 1]; return prev }); return m })()
            if (!lastMsg?.content) {
                console.warn('[bot] empty stream received', { traceId })
            }

        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Connection issue. Please check your internet and try again.',
            }])
            setLoading(false)
        }
    }


    const SUGGESTED = [
        'I want to study abroad — where do I start?',
        'Show me universities in Canada',
        'Upcoming campus fairs?',
        'Can I go with low percentage?',
    ]

    // Entire widget dismissed for this session
    if (hidden) return null

    return (
        <>
            {/* Floating Trigger Button — raised above WhatsApp icon */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-24 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Open Admissions Concierge"
                >
                    <GraduationCap className="h-5 w-5" />
                    <span className="text-sm font-medium">Ask the Concierge</span>
                </button>
            )}

            {/* Chat Panel */}
            {open && (
                <div
                    ref={panelRef}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={pos
                        ? { position: 'fixed', left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
                        : { position: 'fixed', bottom: 24, right: 24 }
                    }
                    className={`z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden relative transition-[width,height] duration-200
                        ${expanded
                            ? 'w-[min(680px,calc(100vw-48px))] h-[min(75vh,720px)]'
                            : 'w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-80px)]'
                        }`}
                >
                    {/* CAPTCHA gate — shown once per session for anonymous users */}
                    {!captchaOk && (
                        <CaptchaGate onVerified={() => setCaptchaOk(true)} />
                    )}
                    {/* Registration Gate overlay */}
                    {captchaOk && gate && (
                        <RegistrationGate
                            reason={gate.reason}
                            visitNumber={gate.visitNumber}
                            cooldownEndsAt={gate.cooldownEndsAt}
                            onDismiss={() => setGate(null)}
                        />
                    )}
                    {/* Header — drag handle */}
                    <div
                        className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                        onPointerDown={onPointerDown}
                    >
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-white" />
                            <div>
                                <p className="text-white font-semibold text-sm">Admissions Concierge</p>
                                <p className="text-blue-200 text-xs">Powered by EdUmeetup AI</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Expand / Collapse */}
                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="text-blue-200 hover:text-white transition-colors p-1 rounded"
                                aria-label={expanded ? 'Collapse chat' : 'Expand chat'}
                                title={expanded ? 'Collapse' : 'Expand'}
                            >
                                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </button>
                            {/* Hide for session button */}
                            <button
                                onClick={hideForSession}
                                className="text-blue-200 hover:text-white transition-colors p-1 rounded"
                                aria-label="Hide chat for this session"
                                title="Hide for this session"
                            >
                                <EyeOff className="h-4 w-4" />
                            </button>
                            {/* Minimise button */}
                            <button
                                onClick={() => setOpen(false)}
                                className="text-blue-200 hover:text-white transition-colors p-1 rounded"
                                aria-label="Minimise chat"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                                        }`}
                                >
                                    {renderMessageContent(msg.content)}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                </div>
                            </div>
                        )}

                        {/* Suggestions shown on welcome message */}
                        {messages.length === 1 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {SUGGESTED.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setInput(s); }}
                                        className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-100 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Dynamic follow-up nudge chip — shown after the latest bot reply */}
                        {(() => {
                            const lastMsg = messages[messages.length - 1]
                            if (lastMsg?.role !== 'assistant' || loading || messages.length < 3) return null
                            const nudge = extractNudge(lastMsg.content)
                            if (!nudge) return null
                            return (
                                <div className="flex justify-start pt-1">
                                    <button
                                        onClick={() => setInput(nudge)}
                                        className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-3 py-1.5 hover:bg-indigo-100 transition-colors text-left max-w-[85%]"
                                    >
                                        💬 {nudge}
                                    </button>
                                </div>
                            )
                        })()}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="px-3 py-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask about universities, fairs, requirements..."
                            className="flex-1 text-sm rounded-xl border-gray-200 focus-visible:ring-blue-500"
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-3"
                            disabled={!input.trim() || loading}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>

                    {/* Hide hint shown at bottom */}
                    <p className="text-center text-[10px] text-gray-400 pb-1">
                        Tap <EyeOff className="inline h-3 w-3" /> to hide this chat for your session
                    </p>
                </div>
            )}
        </>
    )
}

/** Render message content — detect external links and internal verified badges */
function renderMessageContent(content: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = content.split(urlRegex)

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            const isInternal = part.includes('edumeetup.com') || part.startsWith('/')
            return (
                <a
                    key={i}
                    href={part}
                    target={isInternal ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                    className="underline inline-flex items-center gap-1 text-blue-500 hover:text-blue-700"
                    onClick={e => e.stopPropagation()}
                >
                    {isInternal ? part : (
                        <>
                            <Globe className="h-3 w-3" />
                            <span>{part.replace('https://', '').slice(0, 40)}...</span>
                            <ExternalLink className="h-3 w-3" />
                        </>
                    )}
                </a>
            )
        }
        return <span key={i}>{part}</span>
    })
}
