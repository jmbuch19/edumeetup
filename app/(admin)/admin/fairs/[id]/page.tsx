import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getFairDetail } from '../actions'
import { FairDetailClient } from './fair-detail-client'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export default async function AdminFairDetailPage({ params }: Props) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const fair = await getFairDetail(params.id)
    if (!fair) notFound()

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
            <FairDetailClient fair={fair} />
        </div>
    )
}
