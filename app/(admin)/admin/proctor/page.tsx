import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAllProctorRequests } from './actions'
import { ProctorAdminUI } from './ProctorAdminUI'

export default async function AdminProctorPage() {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') redirect('/login')

    const requests = await getAllProctorRequests()

    return (
        <div className="max-w-4xl mx-auto py-4 md:py-8 px-4">
            <ProctorAdminUI initial={requests as any} />
        </div>
    )
}
