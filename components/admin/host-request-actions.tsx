'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { approveHostRequest, rejectHostRequest } from "@/app/actions/admin/host-fair"
import { toast } from "sonner"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
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

    const handleReject = () => {
        const reason = window.prompt("Reason for rejection? (Optional, included in email to institution)")
        if (reason === null) return; // cancelled
        startTransition(async () => {
            const result = await rejectHostRequest(requestId, reason)
            if (result.success) {
                toast.success("Request Rejected")
            } else {
                toast.error(result.message || "Failed to reject")
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

            <Button
                onClick={handleReject}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={isPending}
            >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                Reject Request
            </Button>
        </div>
    )
}
