'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Loader2, GraduationCap, Minimize2, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface StudentAdvisorProps {
    studentName: string | null
}

const SUGGESTED = [
    'Which country suits my profile best?',
    'How do I improve my SOP?',
    'What scholarships can I apply for?',
    'How does the visa process work?',
]

export function StudentAdvisor({ studentName }: StudentAdvisorProps) {
    const firstName = studentName?.split(' ')[0] || 'there'

    const [open, setOpen] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: `Hi ${firstName}! 👋 I'm your personal Study Abroad Advisor.\n\nI have your EdUmeetup profile and can help you with anything — university options, visa steps, SOPs, scholarships, test prep, or comparing countries.\n\nWhat's on your mind?`,
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [dailyLimitHit, setDailyLimitHit] = useState(false)

    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = useCallback(async (e?: React.FormEvent) => {
        e?.preventDefault()
        const text = input.trim()
        if (!text || loading || dailyLimitHit) return

        const userMsg: Message = { role: 'user', content: text }
        const updated = [...messages, userMsg]
        setMessages(updated)
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/student-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updated.map(m => ({ role: m.role, content: m.content })),
                }),
            })

            // Daily limit hit
            if (res.status === 429) {
                const data = await res.json()
                setDailyLimitHit(true)
                setMessages(prev => [...prev, { role: 'assistant', content: data.message || "You've reached your daily limit of 20 messages. See you tomorrow! 😊" }])
                setLoading(false)
                return
            }

            if (!res.ok || !res.body) {
                setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' }])
                setLoading(false)
                return
            }

            // Streaming response
            setMessages(prev => [...prev, { role: 'assistant', content: '' }])
            setLoading(false)

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            const chunkBuf = { current: '' }
            const rafId = { current: 0 }

            const flush = () => {
                const chunk = chunkBuf.current
                chunkBuf.current = ''
                rafId.current = 0
                if (!chunk) return
                setMessages(prev => {
                    const msgs = [...prev]
                    const last = msgs[msgs.length - 1]
                    if (last?.role === 'assistant') {
                        msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
                    }
                    return msgs
                })
            }

            while (true) {
                const { done, value } = await reader.read()
                if (done) {
                    if (rafId.current) cancelAnimationFrame(rafId.current)
                    flush()
                    break
                }
                chunkBuf.current += decoder.decode(value, { stream: true })
                if (!rafId.current) {
                    rafId.current = requestAnimationFrame(flush)
                }
            }

        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection issue. Please check your internet and try again.' }])
            setLoading(false)
        }
    }, [input, loading, messages, dailyLimitHit])

    return (
        <>
            {/* Trigger button — bottom-left, teal, above any nav */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 left-6 z-50 flex items-center gap-2 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
                    aria-label="Open your personal Study Abroad Advisor"
                >
                    <GraduationCap className="h-5 w-5" />
                    <span className="text-sm font-semibold">My Advisor</span>
                </button>
            )}

            {/* Chat panel */}
            {open && (
                <div
                    className={`fixed bottom-6 left-6 z-50 flex flex-col rounded-2xl shadow-2xl border border-teal-100 overflow-hidden transition-[width,height] duration-200 ${expanded
                            ? 'w-[min(680px,calc(100vw-48px))] h-[min(75vh,720px)]'
                            : 'w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-80px)]'
                        }`}
                    style={{ background: '#f0fdfa' }}
                >
                    {/* Header */}
                    <div
                        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 rounded-full p-1.5">
                                <GraduationCap className="h-4 w-4 text-white" />
                            </div>
                            <div>
                                <p className="text-white font-semibold text-sm">My Study Advisor</p>
                                <p className="text-teal-200 text-xs">Powered by Claude · EdUmeetup</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setExpanded(e => !e)}
                                className="text-teal-200 hover:text-white transition-colors p-1 rounded"
                                aria-label={expanded ? 'Collapse' : 'Expand'}
                            >
                                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-teal-200 hover:text-white transition-colors p-1 rounded"
                                aria-label="Close advisor"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: '#f0fdfa' }}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                                            ? 'text-white rounded-br-sm'
                                            : 'bg-white text-gray-800 shadow-sm border border-teal-100 rounded-bl-sm'
                                        }`}
                                    style={msg.role === 'user' ? { background: '#0d9488' } : {}}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-teal-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                </div>
                            </div>
                        )}

                        {/* Quick suggestions on first message */}
                        {messages.length === 1 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {SUGGESTED.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setInput(s)}
                                        className="text-xs border rounded-full px-3 py-1 transition-colors"
                                        style={{ background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={sendMessage}
                        className="px-3 py-3 flex gap-2 flex-shrink-0 border-t border-teal-100 bg-white"
                    >
                        <Input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={dailyLimitHit ? 'Daily limit reached — see you tomorrow!' : 'Ask anything about studying abroad…'}
                            className="flex-1 text-sm rounded-xl border-teal-200 focus-visible:ring-teal-500"
                            disabled={loading || dailyLimitHit}
                        />
                        <Button
                            type="submit"
                            size="sm"
                            className="rounded-xl px-3 text-white"
                            style={{ background: '#0d9488' }}
                            disabled={!input.trim() || loading || dailyLimitHit}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>

                    <p className="text-center text-[10px] text-teal-400 pb-1.5 bg-white">
                        20 messages/day · Personal to your profile
                    </p>
                </div>
            )}
        </>
    )
}
