import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import AlumniRegisterForm from '@/components/alumni/AlumniRegisterForm'

interface Props {
    searchParams: Promise<{ token?: string }>
}

async function validateToken(token: string) {
    const invite = await prisma.alumniInvitation.findUnique({
        where: { token },
        select: {
            id: true, status: true, expiresAt: true, email: true,
            university: { select: { institutionName: true } }
        }
    })
    if (!invite || invite.status !== 'PENDING') return null
    if (invite.expiresAt < new Date()) return null
    return invite
}

export default async function AlumniRegisterFormPage({ searchParams }: Props) {
    const session = await auth()
    const params = await searchParams
    const token = params?.token

    // Must be signed in — send to login with callback
    if (!session?.user?.id) {
        const callbackUrl = encodeURIComponent(token ? `/alumni-register/form?token=${token}` : '/alumni-register/form')
        redirect(`/login?callbackUrl=${callbackUrl}`)
    }

    // Already an alumni — send to dashboard
    if (session.user.role === 'ALUMNI') {
        redirect('/alumni/dashboard')
    }

    // Validate invite token if provided (unused in form UI but passed to action)
    let _inviteValid = false
    if (token) {
        const invite = await validateToken(token)
        _inviteValid = invite !== null
    }

    return (
        <Suspense>
            <AlumniRegisterForm inviteToken={token} />
        </Suspense>
    )
}

export const metadata = {
    title: 'Alumni Registration | EdUmeetup',
    description: 'Complete your IAES Alumni Bridge profile and start inspiring future students.',
}
