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
import { computeProfileComplete } from '@/lib/admin/student-filters'
import { Button } from '@/components/ui/button'
import { updateUserEmail, blockUser, unblockUser } from '../actions'


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


export default async function AdminUserDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
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
            university: { select: { institutionName: true, verificationStatus: true, logo: true, website: true } },

        }
    })

    if (!user) notFound()

    const s = user.student

    // Use canonical 10-field completeness check (matches DB sync logic)
    const completeness = s ? computeProfileComplete(s) : null
    const isActuallyComplete = completeness?.isComplete ?? false

    // Inline server actions — must have 'use server' so Next.js registers them as action references
    async function handleBlock(fd: FormData) {
        'use server'
        await blockUser(fd)
    }
    async function handleUnblock(fd: FormData) {
        'use server'
        await unblockUser(fd)
    }
    async function handleUpdateEmail(fd: FormData) {
        'use server'
        await updateUserEmail(fd)
    }

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
                    {/* Use isActuallyComplete (computed) not stored boolean */}
                    {completeness && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${completeness.isComplete
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                            {completeness.isComplete ? 'Profile Complete' : `${completeness.score}% Complete`}
                        </span>
                    )}
                </div>
            </div>

            {/* Admin action buttons — Block / Unblock */}
            <div className="flex flex-wrap gap-2">
                {user.isActive ? (
                    <form action={handleBlock}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50">
                            Block User
                        </Button>
                    </form>
                ) : (
                    <form action={handleUnblock}>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="outline"
                            className="border-green-200 text-green-600 hover:bg-green-50">
                            Unblock User
                        </Button>
                    </form>
                )}
            </div>

            {/* Missing fields warning */}
            {completeness && !completeness.isComplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 mb-2">
                        Profile needs attention — {completeness.score}% complete
                    </p>
                    <ul className="space-y-1">
                        {completeness.missingFields.map(f => (
                            <li key={f} className="text-sm text-amber-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                                {f}
                            </li>
                        ))}
                    </ul>
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

            {/* Correct Email Address */}
            <Card>
                <CardHeader><CardTitle className="text-sm">Correct Email Address</CardTitle></CardHeader>
                <CardContent>
                    <form action={handleUpdateEmail} className="flex gap-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="email" name="newEmail" defaultValue={user.email}
                            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            placeholder="corrected@email.com" />
                        <Button type="submit" variant="outline" size="sm">Update Email</Button>
                    </form>
                    <p className="text-xs text-slate-400 mt-2">
                        Email verification will be reset. Student will need to re-verify.
                    </p>
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
                            <Field label="SAT Score" value={s.satScore} />
                            <Field label="ACT Score" value={s.actScore} />
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
                                    {s.bookmarks.map((b: any) => (
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
                        <div className="col-span-2 flex items-center gap-3">
                            {user.university.logo ? (
                                user.university.website ? (
                                    <a href={user.university.website} target="_blank" rel="noopener noreferrer"
                                        title={`Visit ${user.university.institutionName} website ↗`}
                                        className="flex-shrink-0">
                                        <img
                                            src={user.university.logo}
                                            alt={`${user.university.institutionName} logo`}
                                            className="w-10 h-10 rounded-lg object-contain border border-gray-100 bg-white p-0.5 hover:ring-2 hover:ring-teal-400/60 transition-all"
                                        />
                                    </a>
                                ) : (
                                    <img
                                        src={user.university.logo}
                                        alt={`${user.university.institutionName} logo`}
                                        className="w-10 h-10 rounded-lg object-contain border border-gray-100 bg-white p-0.5 flex-shrink-0"
                                    />
                                )
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                    {user.university.institutionName.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {user.university.website ? (
                                <a href={user.university.website} target="_blank" rel="noopener noreferrer"
                                    className="font-medium text-gray-900 truncate hover:text-teal-600 hover:underline transition-colors">
                                    {user.university.institutionName} ↗
                                </a>
                            ) : (
                                <span className="font-medium text-gray-900 truncate">{user.university.institutionName}</span>
                            )}
                        </div>
                        <Field label="Verification Status" value={user.university.verificationStatus} />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
