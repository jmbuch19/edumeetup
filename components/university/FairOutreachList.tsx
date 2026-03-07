'use client'

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Loader2, ThumbsUp, ThumbsDown, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { toast } from "sonner"
import { respondToOutreach, RespondOption } from "@/app/actions/university/fairs"

type OutreachRequest = {
    id: string
    status: string
    sentAt: Date
    hostRequest: {
        referenceNumber: string
        institutionName: string
        institutionType: string
        city: string
        state: string
        preferredDateStart: Date
        preferredDateEnd: Date
        expectedStudentCount: string
        fieldsOfStudy: any
        additionalRequirements: string | null
    }
}

export function FairOutreachList({ requests }: { requests: OutreachRequest[] }) {
    if (requests.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                <h3 className="text-lg font-medium text-slate-900">No Campus Fair Invites Yet</h3>
                <p className="text-slate-500 mt-1">When Indian institutions request a fair and we match them with you, the invites will appear here.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {requests.map((req) => (
                <OutreachCard key={req.id} outreach={req} />
            ))}
        </div>
    )
}

function OutreachCard({ outreach }: { outreach: OutreachRequest }) {
    const [isPending, startTransition] = useTransition()
    const [note, setNote] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [actionType, setActionType] = useState<RespondOption | null>(null)

    const handleAction = (type: RespondOption) => {
        setActionType(type)
        setIsDialogOpen(true)
    }

    const confirmAction = () => {
        if (!actionType) return

        startTransition(async () => {
            const result = await respondToOutreach(outreach.id, actionType, note)
            if (result.success) {
                toast.success(actionType === "INTERESTED" ? "Interest confirmed! We'll allow you to coordinate." : "Response recorded.")
                setIsDialogOpen(false)
            } else {
                toast.error(result.message || "Something went wrong")
            }
        })
    }

    const isResponded = outreach.status !== "SENT"

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="bg-white">{outreach.hostRequest.referenceNumber}</Badge>
                            <span className="text-xs text-slate-500">Sent on {format(new Date(outreach.sentAt), "MMM d, yyyy")}</span>
                        </div>
                        <CardTitle className="text-xl">{outreach.hostRequest.institutionName}</CardTitle>
                        <CardDescription>{outreach.hostRequest.city}, {outreach.hostRequest.state} • {outreach.hostRequest.institutionType}</CardDescription>
                    </div>
                    <div>
                        <StatusBadge status={outreach.status} />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Event Details</h4>
                        <p className="font-medium">
                            {format(new Date(outreach.hostRequest.preferredDateStart), "MMM d")} - {format(new Date(outreach.hostRequest.preferredDateEnd), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-slate-600">Expected Students: {outreach.hostRequest.expectedStudentCount}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Fields of Study</h4>
                        <div className="flex flex-wrap gap-1">
                            {Array.isArray(outreach.hostRequest.fieldsOfStudy) && outreach.hostRequest.fieldsOfStudy.map((field: string) => (
                                <Badge key={field} variant="secondary" className="text-xs">{field}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    {outreach.hostRequest.additionalRequirements && (
                        <div className="bg-amber-50 p-3 rounded-md border border-amber-100 text-sm text-amber-900">
                            <h4 className="font-medium mb-1">Special Requirements:</h4>
                            {outreach.hostRequest.additionalRequirements}
                        </div>
                    )}
                </div>
            </CardContent>

            {!isResponded && (
                <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => handleAction("NOT_INTERESTED")} disabled={isPending}>
                        <ThumbsDown className="mr-2 h-4 w-4" />
                        Not Interested
                    </Button>
                    <Button onClick={() => handleAction("INTERESTED")} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                        <ThumbsUp className="mr-2 h-4 w-4" />
                        I'm Interested
                    </Button>
                </CardFooter>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "INTERESTED" ? "Confirm Interest" : "Decline Invitation"}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === "INTERESTED"
                                ? "Great! You can add a note about your availability or specific programs you'd like to showcase."
                                : "Please let us know why you're unable to attend (optional)."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Textarea
                            placeholder={actionType === "INTERESTED" ? "e.g., We can send 2 representatives..." : "e.g., Schedule conflict..."}
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button
                            onClick={confirmAction}
                            disabled={isPending}
                            variant={actionType === "INTERESTED" ? "default" : "destructive"}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Response
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

function StatusBadge({ status }: { status: string }) {
    if (status === "SENT") return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Action Required</Badge>
    if (status === "INTERESTED") return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Interested</Badge>
    if (status === "NOT_INTERESTED") return <Badge variant="secondary" className="bg-gray-100 text-gray-600"><XCircle className="w-3 h-3 mr-1" /> Declined</Badge>
    return <Badge>{status}</Badge>
}
