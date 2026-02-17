'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { registerForEvent } from './actions'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react' // Or assume server component passes session status? 
// Actually server actions are cleaner. But for immediate feedback:

export default function EventRegistrationButton({ eventId, isRegistered }: { eventId: string, isRegistered: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    // Simplistic approach: if registered, show "Registered". Else "Register".

    if (isRegistered) {
        return <Button disabled variant="secondary">You are Registered</Button>
    }

    async function handleRegister() {
        if (!confirm('Confirm registration for this event?')) return

        setIsLoading(true)
        const res = await registerForEvent(eventId)
        setIsLoading(false)

        if (res.error) {
            alert(res.error) // Simple alert for MVP
        } else {
            router.refresh()
            alert('Successfully registered!')
        }
    }

    return (
        <Button onClick={handleRegister} disabled={isLoading} size="lg">
            {isLoading ? 'Registering...' : 'Register Now'}
        </Button>
    )
}
