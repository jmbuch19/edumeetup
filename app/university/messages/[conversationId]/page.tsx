import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getUniversityConversationThread, getUniversityQuota, markConversationReadByUniversity } from '../actions'
import { UniversityThreadClient } from './university-thread-client'

interface Props {
    params: Promise<{ conversationId: string }>
}

export default async function UniversityThreadPage(props: Props) {
    const params = await props.params;
    const session = await auth()
    if (!session?.user) redirect('/login')

    const conversation = await getUniversityConversationThread(params.conversationId).catch(() => null)
    if (!conversation) notFound()

    // Mark student messages as read on page load
    await markConversationReadByUniversity(params.conversationId).catch(() => { })

    // Derive universityId from conversation
    const quota = await getUniversityQuota(conversation.universityId).catch(() => ({
        daily: 0, annual: 0, dailyLimit: 10, annualLimit: 300,
    }))

    return (
        <UniversityThreadClient
            conversation={conversation as any}
            quota={quota}
        />
    )
}
