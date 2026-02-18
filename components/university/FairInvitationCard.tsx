'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Calendar, MapPin, Users, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useState, useTransition } from "react"
import { respondToOutreach } from "@/app/university/fairs/actions"
import { toast } from "sonner"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

// Helper to format currency/dates/etc
const formatDateRange = (start: Date, end: Date) => {
    return `${format(new Date(start), "MMM d")} - ${format(new Date(end), "MMM d, yyyy")}`
}

export default function FairInvitationCard({ outreach }: { outreach: any }) {
    const { hostRequest, status } = outreach
    const isPending = status === 'SENT'

    // Response State
    const [actionPending, startAction] = useTransition()
    const [declineNote, setDeclineNote] = useState("")
    const [isDeclineOpen, setIsDeclineOpen] = useState(false)

    const handleResponse = (newStatus: 'INTERESTED' | 'NOT_INTERESTED', note?: string) => {
        startAction(async () => {
            const res = await respondToOutreach(outreach.id, newStatus, note)
            if (res.success) {
                toast.success(newStatus === 'INTERESTED' ? "Great! The host has been notified." : "Response recorded.")
                setIsDeclineOpen(false)
            } else {
                toast.error(res.error || "Failed to submit response")
            }
        })
    }

    return (
        <Card className={`border-l-4 ${status === 'INTERESTED' ? 'border-l-green-500' : status === 'NOT_INTERESTED' ? 'border-l-slate-300' : 'border-l-blue-500'}`}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant="outline" className="mb-2">
                            {hostRequest.institutionType}
                        </Badge>
                        <CardTitle className="text-xl">{hostRequest.institutionName}</CardTitle>
                    </div>
                    <StatusBadge status={status} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4" />
                        {hostRequest.city}, {hostRequest.state}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        {formatDateRange(hostRequest.preferredDateStart, hostRequest.preferredDateEnd)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 col-span-2">
                        <Users className="h-4 w-4" />
                        Expected Footfall: <span className="font-semibold">{hostRequest.expectedStudentCount}</span>
                    </div>
                </div>

                {hostRequest.additionalRequirements && (
                    <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 italic">
                        "{hostRequest.additionalRequirements}"
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 flex justify-end gap-3">
                {isPending ? (
                    <>
                        <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" disabled={actionPending}>Decline</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Decline Invitation?</DialogTitle>
                                    <DialogDescription>
                                        Let them know why you can't make it (optional).
                                    </DialogDescription>
                                </DialogHeader>
                                <Textarea
                                    placeholder="e.g., Scheduling conflict..."
                                    value={declineNote}
                                    onChange={(e) => setDeclineNote(e.target.value)}
                                />
                                <DialogFooter>
                                    <Button variant="ghost" onClick={() => setIsDeclineOpen(false)}>Cancel</Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleResponse('NOT_INTERESTED', declineNote)}
                                        disabled={actionPending}
                                    >
                                        {actionPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Decline
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button
                            onClick={() => handleResponse('INTERESTED')}
                            disabled={actionPending}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {actionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            I'm Interested
                        </Button>
                    </>
                ) : (
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                        {status === 'INTERESTED' ? (
                            <><CheckCircle className="h-4 w-4 text-green-600" /> You marked this as Interested on {format(new Date(outreach.respondedAt), 'MMM d')}</>
                        ) : (
                            <><XCircle className="h-4 w-4 text-slate-400" /> You declined this invitation.</>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'SENT') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">New Invite</Badge>
    if (status === 'INTERESTED') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Interested</Badge>
    if (status === 'NOT_INTERESTED') return <Badge variant="secondary">Declined</Badge>
    return null
}
