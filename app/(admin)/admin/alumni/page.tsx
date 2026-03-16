import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { adminGetAllAlumni, adminGetPendingAlumni, adminGetAlumniStats } from '@/app/actions/alumni'
import AdminAlumniClient from './AdminAlumniClient'

export default async function AdminAlumniPage() {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'ADMIN') redirect('/login')

    const [pending, all, stats] = await Promise.all([
        adminGetPendingAlumni(),
        adminGetAllAlumni(),
        adminGetAlumniStats(),
    ])

    return (
        <Suspense>
            <AdminAlumniClient pending={pending} all={all} stats={stats} />
        </Suspense>
    )
}

export const metadata = { title: 'Alumni Management | Admin — EdUmeetup' }
