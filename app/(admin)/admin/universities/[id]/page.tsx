import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { verifyUniversity } from '@/app/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import {
    ArrowLeft, Building2, Globe, Mail, Phone,
    MapPin, GraduationCap, ShieldCheck, ShieldX,
    CheckCircle2, Clock, ExternalLink,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props { params: { id: string } }

export default async function AdminUniversityDetailPage({ params }: Props) {
    const session = await auth()
    if (!session || session.user?.role !== 'ADMIN') redirect('/login')

    const uni = await prisma.university.findUnique({
        where: { id: params.id },
        include: {
            user: { select: { email: true, createdAt: true, isActive: true } },
            programs: { orderBy: { createdAt: 'desc' } },
        },
    })

    if (!uni) notFound()

    // Inline void wrappers required by form action type (verifyUniversity returns {error}|undefined)
    async function approveAction(fd: FormData) {
        'use server'
        await verifyUniversity(fd)
    }
    async function rejectAction(fd: FormData) {
        'use server'
        await verifyUniversity(fd)
    }

    const statusColor = {
        VERIFIED: 'bg-green-100 text-green-800 border-green-200',
        PENDING:  'bg-amber-100 text-amber-800 border-amber-200',
        REJECTED: 'bg-red-100 text-red-800 border-red-200',
    }[uni.verificationStatus] ?? 'bg-gray-100 text-gray-700'

    return (
        <div className="max-w-3xl mx-auto space-y-6 py-4 md:py-8 px-4">
            {/* Back */}
            <Link
                href="/admin/universities"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Universities
            </Link>

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                    {uni.logo ? (
                        <img
                            src={uni.logo}
                            alt={`${uni.institutionName} logo`}
                            className="w-16 h-16 rounded-xl object-contain border border-gray-100 bg-white p-1 flex-shrink-0"
                        />
                    ) : (
                        <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold text-2xl">
                            {uni.institutionName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{uni.institutionName}</h1>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {uni.city ? `${uni.city}, ` : ''}{uni.country}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${statusColor}`}>
                    {uni.verificationStatus}
                </span>
            </div>

            {/* Approve / Reject actions — only show when PENDING */}
            {uni.verificationStatus === 'PENDING' && (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 font-medium flex-1">
                        This university is awaiting admin verification.
                    </p>
                    <form action={rejectAction} className="flex gap-2">
                        <input type="hidden" name="universityId" value={uni.id} />
                        <input type="hidden" name="action" value="reject" />
                        <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
                        >
                            <ShieldX className="h-4 w-4" /> Reject
                        </Button>
                    </form>
                    <form action={approveAction}>
                        <input type="hidden" name="universityId" value={uni.id} />
                        <input type="hidden" name="action" value="approve" />
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        >
                            <ShieldCheck className="h-4 w-4" /> Approve
                        </Button>
                    </form>
                </div>
            )}

            {/* Re-verify controls for REJECTED */}
            {uni.verificationStatus === 'REJECTED' && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <ShieldX className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-800 font-medium flex-1">This university was rejected.</p>
                    <form action={approveAction}>
                        <input type="hidden" name="universityId" value={uni.id} />
                        <input type="hidden" name="action" value="approve" />
                        <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
                            <ShieldCheck className="h-4 w-4" /> Approve Anyway
                        </Button>
                    </form>
                </div>
            )}

            {/* VERIFIED — link to public profile */}
            {uni.verificationStatus === 'VERIFIED' && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800 font-medium flex-1">Verified — profile is live.</p>
                    <Link href={`/universities/${uni.id}`} target="_blank">
                        <Button variant="outline" size="sm" className="border-green-200 text-green-700 gap-1.5">
                            <ExternalLink className="h-4 w-4" /> View Public Profile
                        </Button>
                    </Link>
                    <form action={rejectAction}>
                        <input type="hidden" name="universityId" value={uni.id} />
                        <input type="hidden" name="action" value="reject" />
                        <Button type="submit" variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5">
                            <ShieldX className="h-4 w-4" /> Revoke
                        </Button>
                    </form>
                </div>
            )}

            {/* Institution details */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4" /> Institution Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-5 text-sm">
                    <Field label="Rep Name" value={uni.repName} />
                    <Field label="Rep Designation" value={uni.repDesignation} />
                    <Field label="Rep Email" value={uni.repEmail} />
                    <Field label="Contact Email" value={uni.contactEmail} />
                    <Field label="Contact Phone" value={uni.contactPhone} />
                    <Field label="Accreditation No." value={uni.accreditationNo} />
                    <Field label="Website" value={uni.website} link />
                    <Field label="Scholarships" value={uni.scholarshipsAvailable ? 'Yes' : 'No'} />
                    <Field label="Registered Email" value={uni.user.email} />
                    <Field label="Account Created" value={new Date(uni.user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
                    <Field label="Account Active" value={uni.user.isActive ? 'Yes' : 'No'} />
                </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ShieldCheck className="h-4 w-4" /> Self-Certification
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <CertRow label="Authorised representative" value={uni.certAuthority} />
                    <CertRow label="Confirmed legitimacy" value={uni.certLegitimacy} />
                    <CertRow label="Agreed to purpose of use" value={uni.certPurpose} />
                    <CertRow label="Accepts accountability" value={uni.certAccountability} />
                    {uni.certTimestamp && (
                        <p className="col-span-2 text-xs text-gray-400 mt-1">
                            Certified at {new Date(uni.certTimestamp).toLocaleString('en-IN')} · IP: {uni.certIp ?? '—'}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Programs */}
            {uni.programs.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <GraduationCap className="h-4 w-4" /> Programs ({uni.programs.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-gray-50">
                        {uni.programs.map((p) => (
                            <div key={p.id} className="py-3 flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium text-gray-900 text-sm">{p.programName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {p.degreeLevel} · {p.fieldCategory} · {p.durationMonths}mo
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className="text-xs">{p.currency} {p.tuitionFee?.toLocaleString()}/yr</Badge>
                                    <Badge variant={p.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                                        {p.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function Field({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
            {value ? (
                link ? (
                    <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate flex items-center gap-1">
                        <Globe className="h-3 w-3" />{value}
                    </a>
                ) : (
                    <span className="text-sm font-medium text-foreground">{value}</span>
                )
            ) : (
                <span className="text-sm text-muted-foreground italic">—</span>
            )}
        </div>
    )
}

function CertRow({ label, value }: { label: string; value: boolean | null }) {
    return (
        <div className="flex items-center gap-2">
            {value
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                : <ShieldX className="h-4 w-4 text-red-400 shrink-0" />
            }
            <span className="text-sm text-gray-700">{label}</span>
        </div>
    )
}
