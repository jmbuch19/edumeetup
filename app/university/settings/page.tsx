import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SettingsForm from './SettingsForm'

export default async function SettingsPage() {
    const session = await auth()
    if (!session || !session.user || (session.user as any).role !== 'UNIVERSITY') {
        redirect('/login')
    }

    const userId = session.user.id
    const settings = await prisma.university.findUnique({
        where: { userId }
    })

    if (!settings) {
        return <div>Profile not found. Please contact support.</div>
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">University Settings</h1>
            <SettingsForm settings={settings} />
        </div>
    )
}
