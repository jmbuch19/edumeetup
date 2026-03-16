import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMyAlumniDashboard } from '@/app/actions/alumni'
import AlumniDashboardClient from './AlumniDashboardClient'

export default async function AlumniDashboardPage() {
    const session = await auth()
    if (!session?.user?.id) redirect('/login')
    if (session.user.role !== 'ALUMNI') redirect('/student/dashboard')

    const alumni = await getMyAlumniDashboard()
    if (!alumni) redirect('/alumni-register')

    return <AlumniDashboardClient alumni={alumni} />
}

export const metadata = {
    title: 'Alumni Dashboard | EdUmeetup',
}
