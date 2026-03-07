'use client'

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { createOutreach } from "@/app/actions/admin/outreach"
import { toast } from "sonner"
import { Loader2, Send, CheckCircle2, Building, Globe } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

type University = {
    id: string
    institutionName: string
    city: string | null
    country: string
}

type Outreach = {
    id: string
    universityId: string
    status: string // SENT, INTERESTED, NOT_INTERESTED
    university: {
        institutionName: string
    }
    sentAt: Date
}

export function OutreachManager({
    requestId,
    universities,
    existingOutreach
}: {
    requestId: string,
    universities: University[],
    existingOutreach: Outreach[]
}) {
    const [selectedUnis, setSelectedUnis] = useState<string[]>([])
    const [isPending, startTransition] = useTransition()

    // Filter out universities already contacted
    const contactedUniIds = new Set(existingOutreach.map(o => o.universityId))
    const availableUniversities = universities.filter(u => !contactedUniIds.has(u.id))

    const handleToggle = (uniId: string) => {
        setSelectedUnis(prev =>
            prev.includes(uniId) ? prev.filter(id => id !== uniId) : [...prev, uniId]
        )
    }

    const handleSelectAll = () => {
        if (selectedUnis.length === availableUniversities.length) {
            setSelectedUnis([])
        } else {
            setSelectedUnis(availableUniversities.map(u => u.id))
        }
    }

    const handleSendOutreach = () => {
        if (selectedUnis.length === 0) return

        startTransition(async () => {
            const result = await createOutreach(requestId, selectedUnis)
            if (result.success) {
                toast.success(`Outreach sent to ${result?.count} universities`)
                setSelectedUnis([])
            } else {
                toast.error(result.message || "Failed to send outreach")
            }
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        Send Outreach
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {availableUniversities.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No verified universities available to contact (or all already contacted).</p>
                    ) : (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-medium text-slate-700">Select Universities</p>
                                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-auto py-1 px-2 text-xs">
                                    {selectedUnis.length === availableUniversities.length ? "Deselect All" : "Select All"}
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] border rounded-md p-4">
                                <div className="space-y-3">
                                    {availableUniversities.map(uni => (
                                        <div key={uni.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`uni-${uni.id}`}
                                                checked={selectedUnis.includes(uni.id)}
                                                onChange={() => handleToggle(uni.id)}
                                            />
                                            <label
                                                htmlFor={`uni-${uni.id}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {uni.institutionName} <span className="text-slate-400 font-normal">({uni.city}, {uni.country})</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>

                            <Button
                                onClick={handleSendOutreach}
                                disabled={isPending || selectedUnis.length === 0}
                                className="w-full"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Opportunity to {selectedUnis.length} Universities
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-slate-500" />
                        Outreach History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {existingOutreach.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No outreach sent yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {existingOutreach.map(outreach => (
                                <div key={outreach.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="text-sm font-medium">{outreach.university.institutionName}</p>
                                            <p className="text-xs text-slate-500">Sent on {new Date(outreach.sentAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <StatusBadge status={outreach.status} />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        SENT: "bg-blue-50 text-blue-700 hover:bg-blue-50",
        INTERESTED: "bg-green-100 text-green-800 hover:bg-green-100",
        NOT_INTERESTED: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    }
    return <Badge className={`text-xs ${styles[status] || "bg-gray-100"}`} variant="secondary">{status.replace('_', ' ')}</Badge>
}
