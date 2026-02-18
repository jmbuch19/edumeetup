'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { approveHostRequest } from "@/app/actions/admin/host-fair"
import { toast } from "sonner"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function HostRequestActions({ requestId, status }: { requestId: string, status: string }) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleApprove = () => {
        startTransition(async () => {
            const result = await approveHostRequest(requestId)
            if (result.success) {
                toast.success("Request Approved Successfully")
                // router.refresh() // handled by revalidatePath in action
            } else {
                toast.error(result.message || "Failed to approve")
            }
        })
    }

    if (status !== 'SUBMITTED') {
        return null // Only show actions for pending requests
    }

    return (
        <div className="flex gap-4">
            <Button
                onClick={handleApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Approve Request
            </Button>

            {/* Future: Add 'Reject' or 'Request Changes' buttons */}
        </div>
    )
}
