import { getUniversityConversations } from './actions'
import { UniversityMessagesClient } from './university-messages-client'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Messages | University Portal' }

export default async function UniversityMessagesPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    let conversations: Awaited<ReturnType<typeof getUniversityConversations>> = []
    try {
        conversations = await getUniversityConversations()
    } catch {
        // silently fall back to empty list
    }

    return <UniversityMessagesClient conversations={conversations} />
}
