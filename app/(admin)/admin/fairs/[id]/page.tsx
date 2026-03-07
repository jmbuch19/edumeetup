import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getFairDetail, getRegistrations } from '../actions'
import { getFairInvitations } from '@/app/actions/university/fair-invitation-actions'
import { FairDetailClient } from './fair-detail-client'
import { UniversityResponseTracker } from '@/components/admin/UniversityResponseTracker'
import type { FairQuestionRow, RegistrationRow } from '../actions'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function AdminFairDetailPage(props: Props) {
    const params = await props.params;
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const [fair, registrations, invitations] = await Promise.all([
        getFairDetail(params.id),
        getRegistrations(params.id),
        getFairInvitations(params.id),
    ])
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
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4 space-y-6">
            <FairDetailClient fair={fair} questions={questions} registrations={registrations} />
            <UniversityResponseTracker fairId={params.id} invitations={invitations} />
        </div>
    )
}
