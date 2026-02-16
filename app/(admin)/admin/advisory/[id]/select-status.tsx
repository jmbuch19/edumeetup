'use client'

import React, { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { updateAdvisoryStatus } from '@/app/actions/admin-advisory-actions'
import { AdvisoryStatus } from '@prisma/client'
import { Loader2 } from 'lucide-react'

interface SelectStatusProps {
    requestId: string
    currentStatus: AdvisoryStatus
}

export function SelectStatus({ requestId, currentStatus }: SelectStatusProps) {
    const [status, setStatus] = useState<AdvisoryStatus>(currentStatus)
    const [loading, setLoading] = useState(false)

    const handleValueChange = async (value: string) => {
        const newStatus = value as AdvisoryStatus
        setStatus(newStatus)
        setLoading(true)
        try {
            const res = await updateAdvisoryStatus(requestId, newStatus)
            if (!res.success) {
                // revert on error
                setStatus(currentStatus)
                alert("Failed to update status")
            }
        } catch (error) {
            console.error(error)
            setStatus(currentStatus)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <Label>Current Status</Label>
            <Select
                disabled={loading}
                value={status}
                onValueChange={handleValueChange}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="NEW">New Request</SelectItem>
                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow Up Required</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
