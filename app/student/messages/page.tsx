import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { StudentMessagesClient } from './student-messages-client'
import { getStudentConversations } from './direct-actions'
import { getSupportQuota } from './actions'

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

    const [tickets, conversations, supportQuota] = await Promise.all([
        prisma.supportTicket.findMany({
            where: { userId: session.user.id, type: 'STUDENT' },
            orderBy: { createdAt: 'desc' },
        }),
        getStudentConversations().catch(() => []),
        getSupportQuota().catch(() => ({ daily: 0, annual: 0, dailyLimit: 10, annualLimit: 200 })),
    ])

    return (
        <StudentMessagesClient
            tickets={tickets}
            conversations={conversations}
            defaultTab={tab}
            supportQuota={supportQuota}
        />
    )
}
