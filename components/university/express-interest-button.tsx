'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { expressInterest } from '@/app/actions'

interface Props {
    universityId: string
    programId?: string
    alreadyExpressed?: boolean
}

export default function ExpressInterestButton({ universityId, programId, alreadyExpressed = false }: Props) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(alreadyExpressed)

    async function handleClick() {
        if (done || loading) return
        setLoading(true)
        try {
            const result = await expressInterest(universityId, undefined, programId)
            if (result?.error) {
                toast.error(result.error)
            } else {
                setDone(true)
                toast.success('Interest sent! The university will be in touch.')
            }
        } catch {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (done) {
        return (
            <Button variant="outline" className="gap-2 text-green-700 border-green-200 bg-green-50 cursor-default" disabled>
                <CheckCircle2 className="h-4 w-4" />
                Interest Sent
            </Button>
        )
    }

    return (
        <Button onClick={handleClick} disabled={loading} className="gap-2">
            {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                : <><Mail className="h-4 w-4" /> Express Interest</>
            }
        </Button>
    )
}
