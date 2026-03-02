import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import Link from "next/link"
import {
    ArrowLeft, User, MapPin, GraduationCap, FileText,
    CheckCircle2, AlertCircle, XCircle, Phone, Mail,
    Calendar, Globe, BookOpen
} from "lucide-react"

export const dynamic = 'force-dynamic'

function Field({ label, value, required = false }: { label: string; value?: string | number | boolean | null; required?: boolean }) {
    const isEmpty = value === null || value === undefined || value === ''
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
            {isEmpty ? (
                <span className={`text-sm flex items-center gap-1 ${required ? 'text-red-500 font-medium' : 'text-muted-foreground italic'}`}>
                    {required && <XCircle className="h-3.5 w-3.5" />}
                    {required ? 'Missing (required)' : 'Not provided'}
                </span>
            ) : (
                <span className="text-sm font-medium text-foreground">
                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </span>
            )}
        </div>
    )
}

function CompletionBadge({ complete }: { complete: boolean }) {
    return complete ? (
        <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" /> Profile Complete
        </Badge>
    ) : (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 w-fit">
            <AlertCircle className="h-3.5 w-3.5" /> Profile Incomplete
        </Badge>
    )
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
    const user = await prisma.user.findUnique({
        where: { id: params.id },
        include: {
            student: {
                include: {
                    advisoryRequests: { orderBy: { createdAt: 'desc' }, take: 3 },
                    bookmarks: { take: 5, include: { university: { select: { institutionName: true } } } },
                    interests: { take: 5, include: { university: { select: { institutionName: true } } } },
                    meetings: { orderBy: { createdAt: 'desc' }, take: 3 },
                }
            },
            university: { select: { institutionName: true, verificationStatus: true } },
        }
    })

    if (!user) notFound()

    const s = user.student

    // Compute missing required fields for students
    const requiredFields = [
        { key: 'fullName', label: 'Full Name', value: s?.fullName },
        { key: 'phone', label: 'Phone', value: s?.phone },
        { key: 'city', label: 'City', value: s?.city },
        { key: 'country', label: 'Country', value: s?.country },
        { key: 'fieldOfInterest', label: 'Field of Interest', value: s?.fieldOfInterest },
        { key: 'preferredDegree', label: 'Preferred Degree', value: s?.preferredDegree },
        { key: 'preferredCountries', label: 'Target Countries', value: s?.preferredCountries },
        { key: 'currentStatus', label: 'Current Status', value: s?.currentStatus },
    ]
    const missingCount = requiredFields.filter(f => !f.value).length

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Back */}
            <Link href="/admin/users" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="h-4 w-4" /> Back to Users
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{s?.fullName || user.email}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : user.role === 'UNIVERSITY' ? 'secondary' : 'outline'}>
                        {user.role}
                    </Badge>
                    <Badge variant={user.isActive ? 'outline' : 'destructive'} className={user.isActive ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                        {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                    {s && <CompletionBadge complete={s.profileComplete} />}
                </div>
            </div>

            {/* Action Alert — only for students with missing fields */}
            {s && missingCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Profile needs attention</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            {missingCount} key field{missingCount > 1 ? 's are' : ' is'} missing.
                            Student should complete their profile to get matched with universities.
                        </p>
                        <ul className="text-xs text-amber-700 mt-2 list-disc pl-4 space-y-0.5">
                            {requiredFields.filter(f => !f.value).map(f => (
                                <li key={f.key}>{f.label}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Account Info */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="h-4 w-4" /> Account Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
                    <Field label="User ID" value={user.id} />
                    <Field label="Role" value={user.role} />
                    <Field label="Active" value={user.isActive} />
                    <Field label="Email Verified" value={user.emailVerified ? format(new Date(user.emailVerified), 'MMM d, yyyy') : null} />
                    <Field label="Joined" value={format(new Date(user.createdAt), 'MMM d, yyyy, HH:mm')} />
                </CardContent>
            </Card>

            {/* Student Profile */}
            {s && (
                <>
                    {/* Personal */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <MapPin className="h-4 w-4" /> Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            <Field label="Full Name" value={s.fullName} required />
                            <Field label="Gender" value={s.gender} />
                            <Field label="Age Group" value={s.ageGroup} />
                            <Field label="Phone" value={s.phone} required />
                            <Field label="WhatsApp" value={s.whatsappNumber} />
                            <Field label="City" value={s.city} required />
                            <Field label="Pincode" value={s.pincode} />
                            <Field label="Country" value={s.country} required />
                            <Field label="Current Status" value={s.currentStatus} required />
                        </CardContent>
                    </Card>

                    {/* Academic */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <GraduationCap className="h-4 w-4" /> Academic Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            <Field label="Field of Interest" value={s.fieldOfInterest} required />
                            <Field label="Preferred Degree" value={s.preferredDegree} required />
                            <Field label="Target Countries" value={s.preferredCountries} required />
                            <Field label="Budget Range" value={s.budgetRange} />
                            <Field label="Preferred Intake" value={s.preferredIntake} />
                            <Field label="English Test" value={s.englishTestType} />
                            <Field label="English Score" value={s.englishScore} />
                            <Field label="GRE Score" value={s.greScore} />
                            <Field label="GMAT Score" value={s.gmatScore} />
                        </CardContent>
                    </Card>

                    {/* CV */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <FileText className="h-4 w-4" /> CV / Resume
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            {s.cvUrl ? (
                                <>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CV File</span>
                                        <a href={s.cvUrl} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-primary hover:underline font-medium truncate">
                                            {s.cvFileName || 'Download CV'}
                                        </a>
                                    </div>
                                    <Field label="Uploaded" value={s.cvUploadedAt ? format(new Date(s.cvUploadedAt), 'MMM d, yyyy') : null} />
                                    <Field label="Size" value={s.cvSizeBytes ? `${(s.cvSizeBytes / 1024).toFixed(0)} KB` : null} />
                                </>
                            ) : (
                                <div className="col-span-3 text-sm text-muted-foreground italic flex items-center gap-1">
                                    <XCircle className="h-4 w-4 text-red-400" /> No CV uploaded yet
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* IP / Location */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Globe className="h-4 w-4" /> Location Intelligence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            <Field label="IP City" value={s.ipCity} />
                            <Field label="IP Region" value={s.ipRegion} />
                            <Field label="IP Country" value={s.ipCountry} />
                            <Field label="ISP" value={s.ipIsp} />
                            <Field label="City Mismatch" value={s.cityMismatch ? '⚠️ Yes' : 'No'} />
                            <Field label="Pincode Mismatch" value={s.pincodeMismatch ? '⚠️ Yes' : 'No'} />
                        </CardContent>
                    </Card>

                    {/* Activity Summary */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <BookOpen className="h-4 w-4" /> Activity Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Bookmarks</span>
                                <span className="text-2xl font-bold">{s.bookmarks.length}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Interests</span>
                                <span className="text-2xl font-bold">{s.interests.length}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Meetings</span>
                                <span className="text-2xl font-bold">{s.meetings.length}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Advisory Requests</span>
                                <span className="text-2xl font-bold">{s.advisoryRequests.length}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bookmarked Universities */}
                    {s.bookmarks.length > 0 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Bookmarked Universities</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {s.bookmarks.map(b => (
                                        <Badge key={b.id} variant="secondary">{b.university.institutionName}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* University user details */}
            {user.university && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">University Account</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-5">
                        <Field label="Institution" value={user.university.institutionName} />
                        <Field label="Verification Status" value={user.university.verificationStatus} />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
