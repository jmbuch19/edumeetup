import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

export default async function HostRequestsPage() {
    const requests = await prisma.hostRequest.findMany({
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Host Campus Fair Requests</h1>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Reference</TableHead>
                            <TableHead>Institution</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Event Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                    No requests found. Share the link to get started!
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-mono font-medium text-slate-700">{req.referenceNumber}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{req.institutionName}</div>
                                        <div className="text-xs text-slate-500 capitalize">{req.institutionType.toLowerCase()}</div>
                                    </TableCell>
                                    <TableCell className="text-slate-600">{req.city}, {req.state}</TableCell>
                                    <TableCell className="text-slate-600">{format(req.preferredDateStart, 'MMM d, yyyy')}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={req.status} />
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">{format(req.createdAt, 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/admin/host-requests/${req.id}`}>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-primary">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        SUBMITTED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200",
        APPROVED: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200",
        OUTREACH_SENT: "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200",
        COMPLETED: "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200",
        CANCELLED: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200",
    }
    return <Badge className={`font-normal ${styles[status] || "bg-gray-100 text-gray-800"}`} variant="outline">{status.replace('_', ' ')}</Badge>
}
