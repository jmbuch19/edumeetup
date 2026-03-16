import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface Props {
    searchParams: Promise<{ token?: string }>
}

/**
 * /alumni-register — Smart router
 *
 * Unauthenticated → /alumni-register/hero  (warm landing page first)
 * Role === ALUMNI  → /alumni/dashboard     (already registered)
 * Authenticated    → /alumni-register/form (proceed to 5-step form)
 *
 * ?token is forwarded on all redirects so invite links still work.
 */
export default async function AlumniRegisterRouter({ searchParams }: Props) {
    const session = await auth()
    const params = await searchParams
    const tokenQuery = params?.token ? `?token=${params.token}` : ''

    if (!session?.user?.id) {
        // Not logged in → show the warm hero landing page first
        redirect(`/alumni-register/hero${tokenQuery}`)
    }

    if (session.user.role === 'ALUMNI') {
        // Already registered as alumni
        redirect('/alumni/dashboard')
    }

    // Logged in but not yet an alumni → go to the 5-step form
    redirect(`/alumni-register/form${tokenQuery}`)
}
