import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import Link from "next/link"
import { ArrowLeft, Building2, User, Calendar, MapPin, Globe, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HostRequestActions } from "@/components/admin/host-request-actions"
import { OutreachManager } from "@/components/admin/outreach-manager"
import { getVerifiedUniversities } from "@/app/actions/admin/outreach"

export default async function HostRequestDetailPage({ params }: { params: { id: string } }) {
    const request = await prisma.hostRequest.findUnique({
        where: { id: params.id },
        include: {
            outreach: {
                include: {
                    university: { select: { institutionName: true } }
                }
            }
        }
    })

    if (!request) {
        notFound()
    }

    const universities = await getVerifiedUniversities()

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/admin/host-requests">
                            <Button variant="ghost" size="sm" className="-ml-3 text-slate-500 hover:text-slate-900">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to List
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{request.institutionName}</h1>
                        <StatusBadge status={request.status} />
                    </div>
                    <p className="text-slate-500 flex items-center gap-2">
                        <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded text-slate-600">{request.referenceNumber}</span>
                        <span>•</span>
                        <span>Submitted on {format(request.createdAt, "PPP")}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <HostRequestActions requestId={request.id} status={request.status} />
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content - 2 Columns */}
                <div className="md:col-span-2 space-y-6">

                    {/* Institution Details */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-primary" />
                                Institution Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Type</p>
                                    <p className="font-medium capitalize">{request.institutionType.toLowerCase()}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Website</p>
                                    <a href={request.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                                        {request.websiteUrl}
                                    </a>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">City</p>
                                    <p className="font-medium">{request.city}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">State</p>
                                    <p className="font-medium">{request.state}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Event Requirements */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5 text-primary" />
                                Event Requirements
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Preferred Dates</p>
                                    <p className="font-semibold text-slate-900">
                                        {format(request.preferredDateStart, "MMM d")} - {format(request.preferredDateEnd, "MMM d, yyyy")}
                                    </p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Expected Footfall</p>
                                    <p className="font-semibold text-slate-900">{request.expectedStudentCount} Students</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-2">Preferred Countries</p>
                                <div className="flex flex-wrap gap-2">
                                    {(request.preferredCountries as string[]).map((c) => (
                                        <Badge key={c} variant="secondary" className="font-normal">{c}</Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-2">Fields of Study</p>
                                <div className="flex flex-wrap gap-2">
                                    {(request.fieldsOfStudy as string[]).map((f) => (
                                        <Badge key={f} variant="outline" className="font-normal border-slate-300">{f}</Badge>
                                    ))}
                                </div>
                            </div>

                            {request.additionalRequirements && (
                                <div>
                                    <p className="text-sm font-medium text-slate-500 mb-2">Additional Notes</p>
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-sm text-slate-700">
                                        {request.additionalRequirements}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Outreach Manager (Only if verified/approved? Or always for admins?) */}
                    <OutreachManager
                        requestId={request.id}
                        universities={universities}
                        existingOutreach={request.outreach}
                    />
                </div>

                {/* Sidebar - 1 Column */}
                <div className="space-y-6">
                    {/* Contact Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <User className="h-5 w-5 text-primary" />
                                Point of Contact
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="font-bold text-slate-900">{request.contactName}</p>
                                <p className="text-sm text-slate-500">{request.contactDesignation}</p>
                            </div>
                            <Separator />
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <a href={`mailto:${request.contactEmail}`} className="text-slate-700 hover:text-primary truncate">
                                        {request.contactEmail}
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <a href={`tel:${request.contactPhone}`} className="text-slate-700 hover:text-primary">
                                        {request.contactPhone}
                                    </a>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        SUBMITTED: "bg-yellow-100 text-yellow-800 border-yellow-200",
        APPROVED: "bg-green-100 text-green-800 border-green-200",
        OUTREACH_SENT: "bg-blue-100 text-blue-800 border-blue-200",
        COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
        CANCELLED: "bg-red-100 text-red-800 border-red-200",
    }
    return <Badge className={`font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`} variant="outline">{status.replace('_', ' ')}</Badge>
}
