'use client'

import { useRouter } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationSummary {
    id: string
    studentId: string
    updatedAt: Date
    unreadCount: number
    student: {
        id: string
        fullName: string | null
        user: { name: string | null; image: string | null }
    }
    messages: Array<{ content: string; senderRole: string; createdAt: Date }>
}

function StudentAvatar({ name, image }: { name: string | null; image: string | null }) {
    if (image) {
        return <img src={image} alt="" className="w-full h-full object-cover rounded-xl" />
    }
    const initials = (name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    return (
        <span className="text-sm font-bold text-white">{initials}</span>
    )
}

interface Props {
    conversations: ConversationSummary[]
}

export function UniversityMessagesClient({ conversations }: Props) {
    const router = useRouter()
    const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

    return (
        <div className="flex flex-col gap-5 py-5 px-4 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--navy)' }}>
                        Student Conversations
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Private 1:1 messages with interested students.
                    </p>
                </div>
                {totalUnread > 0 && (
                    <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                        style={{ background: 'var(--teal)' }}>
                        {totalUnread} unread
                    </span>
                )}
            </div>

            {/* Conversation list */}
            {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: 'var(--surface)' }}>
                        <MessageSquare className="h-7 w-7" style={{ color: 'var(--teal)' }} />
                    </div>
                    <p className="font-semibold" style={{ color: 'var(--navy)' }}>No conversations yet</p>
                    <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
                        When students express interest and initiate a conversation, they'll appear here.
                    </p>
                    <Button size="sm"
                        onClick={() => router.push('/university/dashboard?tab=interests')}
                        className="mt-2 text-white gap-2"
                        style={{ background: 'var(--teal)' }}>
                        View Interested Students
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {conversations.map(conv => {
                        const lastMsg = conv.messages[0]
                        const displayName = conv.student.fullName || conv.student.user.name || 'Student'
                        return (
                            <button
                                key={conv.id}
                                onClick={() => router.push(`/university/messages/${conv.id}`)}
                                className="w-full text-left rounded-2xl border bg-white shadow-sm p-4 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                                style={{ borderColor: conv.unreadCount > 0 ? 'var(--teal)' : 'var(--border-dash)' }}>

                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                    style={{ background: conv.student.user.image ? 'transparent' : 'var(--teal)' }}>
                                    <StudentAvatar name={displayName} image={conv.student.user.image} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--navy)' }}>
                                            {displayName}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white flex-shrink-0"
                                                style={{ background: 'var(--teal)' }}>
                                                {conv.unreadCount} new
                                            </span>
                                        )}
                                    </div>
                                    {lastMsg ? (
                                        <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            {lastMsg.senderRole === 'UNIVERSITY' ? 'You: ' : ''}{lastMsg.content}
                                        </p>
                                    ) : (
                                        <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                            No messages yet — start the conversation
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
            )}
        </div>
    )
}
