/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getLiveUniversitySuggestion } from '@/app/actions';
import { toast } from 'sonner';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    // Use local state for input to guarantee responsiveness
    const [localInput, setLocalInput] = useState('');

    const { messages, append, isLoading } = useChat({
        api: '/api/chat',
        initialMessages: [
            {
                id: 'welcome',
                role: 'assistant',
                content: "Welcome to EdUmeetup Beta! I'm here to help you navigate our verified university network. Found a bug? Let me know!"
            }
        ],
        onError: (e) => {
            console.error("Chat error:", e);
        }
    });
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    // Proactive Engagement
    useEffect(() => {
        const checkLive = async () => {
            const suggestion = await getLiveUniversitySuggestion()
            if (suggestion && suggestion.hasLive) {
                // 1. Show Toast
                toast.info(`${suggestion.universityName} is live!`, {
                    description: "A representative is available for a chat right now.",
                    action: {
                        label: "Chat Now",
                        onClick: () => {
                            setIsOpen(true)
                            append({
                                role: 'user',
                                content: `I see ${suggestion.universityName} is live. Can I speak to ${suggestion.repName}?`
                            })
                        }
                    }
                })

                // 2. Add badge to icon (handled in render)
                setLiveUni(suggestion.universityName)
            }
        }

        // Short delay to not block hydration
        const timer = setTimeout(checkLive, 2000)
        return () => clearTimeout(timer)
    }, [])

    const [liveUni, setLiveUni] = useState<string | null>(null)

    const handleLocalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!localInput.trim() || isLoading) return;

        const content = localInput;
        setLocalInput(''); // Clear immediately for better UX

        await append({
            role: 'user',
            content,
        });
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
            {/* Chat Window */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[350px] sm:w-[400px] h-[500px] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Header */}
                    <div className="bg-primary p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <Bot className="h-5 w-5" />
                            <h3 className="font-semibold">EduMeetup Support</h3>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:bg-primary/80 h-8 w-8 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-10 p-4">
                                <p>👋 Hi there! I&apos;m your AI assistant.</p>
                                <p>Ask me how to find universities, schedule meetings, or register!</p>
                            </div>
                        )}

                        {messages.map((m: any) => (
                            <div
                                key={m.id}
                                className={cn(
                                    "flex items-start gap-2 max-w-[85%]",
                                    m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                    m.role === 'user' ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary"
                                )}>
                                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm shadow-sm",
                                    m.role === 'user'
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                                )}>
                                    {/* Basic markdown rendering if needed, for now just text */}
                                    {m.content.split('\n').map((line: string, i: number) => (
                                        <p key={i} className={i > 0 ? "mt-1" : ""}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="mr-auto flex items-start gap-2 max-w-[85%]">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 animate-pulse">
                                    <Bot className="h-4 w-4" />
                                </div>
                                <div className="bg-white border border-gray-100 p-3 rounded-2xl rounded-tl-none text-sm shadow-sm text-gray-500 italic">
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <form onSubmit={handleLocalSubmit} className="flex gap-2">
                            <input
                                className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                value={localInput}
                                onChange={(e) => setLocalInput(e.target.value)}
                                placeholder="Type your question..."
                                disabled={isLoading}
                                autoFocus
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !localInput.trim()} className="rounded-full h-9 w-9 shrink-0">
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                size="lg"
                className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 transition-all hover:scale-105"
            >
                {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
                {liveUni && !isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                )}
            </Button>
        </div>
    );
}
