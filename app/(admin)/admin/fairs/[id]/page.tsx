import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFairDetail } from '../actions'
import { FairDetailClient } from './fair-detail-client'
import type { FairQuestionRow } from '../actions'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export default async function AdminFairDetailPage({ params }: Props) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const fair = await getFairDetail(params.id)
    if (!fair) notFound()

    // Fetch all questions for this fair (unanswered first)
    const rawQs = await prisma.fairQuestion.findMany({
        where: { fairEventId: params.id },
        orderBy: [{ answeredAt: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, question: true, askerRole: true, answer: true, answeredAt: true, createdAt: true },
    })
    const questions: FairQuestionRow[] = rawQs.map(q => ({
        id: q.id,
        question: q.question,
        askerRole: q.askerRole,
        answer: q.answer,
        answeredAt: q.answeredAt?.toISOString() ?? null,
        createdAt: q.createdAt.toISOString(),
    }))

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
            <FairDetailClient fair={fair} questions={questions} />
        </div>
    )
}
