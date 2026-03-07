import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StudentMessagesClient } from './student-messages-client'
import { getStudentConversations } from './direct-actions'

export const metadata = {
    title: 'Messages | EdUmeetup',
    description: 'Your messages – universities and support',
}

export default async function StudentMessagesPage(
    props: {
        searchParams: Promise<{ tab?: string }>
    }
) {
    const searchParams = await props.searchParams;
    const session = await auth()
    if (!session?.user) redirect('/login')

    const tab = searchParams.tab ?? 'universities'

    // Support tickets (existing)
    const tickets = await prisma.supportTicket.findMany({
        where: { userId: session.user.id, type: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
    })

    // University conversations
    const conversations = await getStudentConversations().catch(() => [])

    return (
        <StudentMessagesClient
            tickets={tickets}
            conversations={conversations}
            defaultTab={tab}
        />
    )
}
