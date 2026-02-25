import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SettingsForm from './SettingsForm'
import ManageMyDataSection from '@/components/my-data/ManageMyDataSection'

export default async function SettingsPage() {
    const session = await auth()
    if (!session || !session.user || ((session.user as any).role !== 'UNIVERSITY' && (session.user as any).role !== 'UNIVERSITY_REP')) {
        redirect('/login')
    }

    const userId = session.user.id!

    const [settings, userData] = await Promise.all([
        prisma.university.findUnique({ where: { userId } }),
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, name: true, role: true, createdAt: true,
                consentMarketing: true, consentAnalytics: true, consentWithdrawnAt: true,
                deletionRequestedAt: true, deletionScheduledFor: true,
                consentHistory: {
                    orderBy: { changedAt: 'desc' },
                    select: { field: true, oldValue: true, newValue: true, changedAt: true }
                },
            }
        })
    ])

    if (!settings) {
        return <div>Profile not found. Please contact support.</div>
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
            <h1 className="text-3xl font-bold">University Settings</h1>
            <SettingsForm settings={settings} />
            {userData && (
                <ManageMyDataSection
                    user={{
                        ...userData,
                        role: userData.role as string,
                    }}
                    consentHistory={userData.consentHistory}
                    supportEmail={process.env.SUPPORT_EMAIL}
                    profileSettingsHref="/university/settings"
                />
            )}
        </div>
    )
}

