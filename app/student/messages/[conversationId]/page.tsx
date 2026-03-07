import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getConversationThread, getStudentQuota, markConversationRead } from '../direct-actions'
import { StudentThreadClient } from './student-thread-client'

interface Props {
    params: { conversationId: string }
}

export default async function StudentConversationPage({ params }: Props) {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const [thread, quota] = await Promise.all([
        getConversationThread(params.conversationId),
        getStudentQuota(),
    ])

    if (!thread) redirect('/student/messages')

    // Mark unread messages as read (fire-and-forget on server)
    await markConversationRead(params.conversationId)

    return (
        <StudentThreadClient
            conversation={thread as any}
            quota={quota}
            userId={session.user.id}
        />
    )
}
