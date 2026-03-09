'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, ExternalLink, GraduationCap, Globe, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
    role: 'user' | 'assistant'
    content: string
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
    const bottomRef = useRef<HTMLDivElement>(null)

    // Restore hide state from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setHidden(sessionStorage.getItem(HIDE_KEY) === '1')
        }
    }, [])

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

        // Add an empty assistant message that we'll fill as the stream arrives
        setMessages(prev => [...prev, { role: 'assistant', content: '' }])

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: updated.map(m => ({ role: m.role, content: m.content })),
                    studentId,
                }),
            })

            if (!res.ok || !res.body) {
                setMessages(prev => {
                    const copy = [...prev]
                    copy[copy.length - 1] = { role: 'assistant', content: '⚠️ Server error. Please try again.' }
                    return copy
                })
                return
            }

            // Read the AI SDK data stream — each line is: 0:"chunk" for text tokens
            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let accumulated = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                // AI SDK stream format: lines like `0:"hello "` or `0:" world"`
                for (const line of chunk.split('\n')) {
                    if (line.startsWith('0:')) {
                        try {
                            // Value after "0:" is a JSON-encoded string
                            const token = JSON.parse(line.slice(2))
                            accumulated += token
                            // Update the last (assistant) message in real-time
                            setMessages(prev => {
                                const copy = [...prev]
                                copy[copy.length - 1] = { role: 'assistant', content: accumulated }
                                return copy
                            })
                        } catch { /* skip malformed chunks */ }
                    }
                }
            }

            // Final safety: if nothing came through, show fallback
            if (!accumulated.trim()) {
                setMessages(prev => {
                    const copy = [...prev]
                    copy[copy.length - 1] = { role: 'assistant', content: "I'm sorry, I couldn't find an answer right now. Please try rephrasing your question." }
                    return copy
                })
            }
        } catch {
            setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = { role: 'assistant', content: '⚠️ Connection issue. Please try again in a moment.' }
                return copy
            })
        } finally {
            setLoading(false)
        }
    }

    const SUGGESTED = [
        'Show CS programs in Canada',
        'Upcoming campus fairs?',
        'Scholarships available?',
        'Book a meeting with a university',
    ]

    // Entire widget dismissed for this session
    if (hidden) return null

    return (
        <>
            {/* Floating Trigger Button */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95"
                    aria-label="Open Admissions Concierge"
                >
                    <GraduationCap className="h-5 w-5" />
                    <span className="text-sm font-medium">Ask the Concierge</span>
                </button>
            )}

            {/* Chat Panel */}
            {open && (
                <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[560px] max-h-[calc(100vh-80px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-white" />
                            <div>
                                <p className="text-white font-semibold text-sm">Admissions Concierge</p>
                                <p className="text-blue-200 text-xs">Powered by EdUmeetup AI</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
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

                        {/* Suggestions shown only after first welcome message */}
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
