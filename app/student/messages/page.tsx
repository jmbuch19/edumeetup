import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MessageClient } from './message-client'

export const metadata = {
    title: 'Messages | EdUmeetup',
    description: 'Get help from the EdUmeetup support team',
}

export default async function StudentMessagesPage() {
    const session = await auth()
    if (!session?.user) redirect('/login')

    const tickets = await prisma.supportTicket.findMany({
        where: { userId: session.user.id, type: 'STUDENT' },
        orderBy: { createdAt: 'desc' },
    })

    return <MessageClient tickets={tickets} />
}
