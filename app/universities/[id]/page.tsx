import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MapPin, Globe, Mail, CheckCircle, Calendar, FileText, Image, Download, Phone, User } from 'lucide-react'
import { notFound } from 'next/navigation'
import { expressInterest } from '@/app/actions'
import { UniversityLogo } from '@/components/university/university-logo'
import { GateOverlay } from '@/components/university/gate-overlay'

const CATEGORY_LABELS: Record<string, string> = {
    BROCHURE: 'University Brochure',
    PROGRAM_INFO: 'Program Information',
    LEAFLET: 'Leaflet / Flyer',
    OTHER: 'Document',
}
const CATEGORY_COLORS: Record<string, string> = {
    BROCHURE: 'bg-blue-100 text-blue-700',
    PROGRAM_INFO: 'bg-emerald-100 text-emerald-700',
    LEAFLET: 'bg-amber-100 text-amber-700',
    OTHER: 'bg-gray-100 text-gray-700',
}
function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export default async function UniversityDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const session = await auth()
    const user = session?.user
    const isLoggedIn = !!user

    // 404 if unverified or private
    const university = await prisma.university.findUnique({
        where: { id, verificationStatus: 'VERIFIED', isPublic: true },
        include: {
            programs: true,
            documents: {
                orderBy: { uploadedAt: 'desc' },
                select: { id: true, displayName: true, category: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true }
            }
        }
    })

    if (!university) notFound()

    async function handleExpressInterest() {
        'use server'
        await expressInterest(id)
    }

    const hasRepContact = university.repName || university.repEmail || university.contactPhone

    return (
        <div className="container mx-auto px-4 py-8 space-y-6">

            {/* ── Header card ───────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                    {/* Logo + name + location */}
                    <div className="flex items-center gap-6">
                        <UniversityLogo
                            src={university.logo}
                            alt={university.institutionName}
                            size="xl"
                            isVerified={university.verificationStatus === 'VERIFIED'}
                        />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{university.institutionName}</h1>
                            <div className="flex flex-col sm:flex-row gap-4 text-gray-600 text-sm">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {university.city}, {university.country}
                                </div>
                                {university.website && (
                                    <div className="flex items-center gap-1">
                                        <Globe className="h-4 w-4" />
                                        <a href={university.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                            Website
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* CTA buttons — Book Meeting gated, Express Interest gated */}
                    <div className="flex flex-wrap gap-2">
                        {/* Book Meeting */}
                        {university.meetingLink && (
                            <GateOverlay locked={!isLoggedIn} label="Sign in to book a meeting">
                                <a href={university.meetingLink} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="gap-2">
                                        <Calendar className="h-4 w-4" />
                                        Book Meeting
                                    </Button>
                                </a>
                            </GateOverlay>
                        )}

                        {/* Express Interest */}
                        {isLoggedIn ? (
                            <form action={handleExpressInterest}>
                                <Button size="lg" className="gap-2">
                                    <Mail className="h-4 w-4" />
                                    Express Interest
                                </Button>
                            </form>
                        ) : (
                            <Link href="/login">
                                <Button size="lg" variant="secondary" className="gap-2">
                                    <Mail className="h-4 w-4" />
                                    Connect with Us
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* About */}
                {university.about && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <p className="text-gray-700 leading-relaxed">{university.about}</p>
                    </div>
                )}
            </div>

            {/* ── Rep contact — blurred for guests ──────────────────────── */}
            {hasRepContact && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Admissions Contact
                    </h2>
                    <GateOverlay locked={!isLoggedIn} label="Sign in to view contact details">
                        <div className="space-y-3">
                            {university.repName && (
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-900">{university.repName}</p>
                                        {university.repDesignation && (
                                            <p className="text-gray-500 text-xs">{university.repDesignation}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {university.repEmail && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                    <a href={`mailto:${university.repEmail}`} className="text-primary hover:underline">
                                        {university.repEmail}
                                    </a>
                                </div>
                            )}
                            {university.contactPhone && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                                    <a href={`tel:${university.contactPhone}`} className="text-gray-700 hover:underline">
                                        {university.contactPhone}
                                    </a>
                                </div>
                            )}
                        </div>
                    </GateOverlay>
                </div>
            )}

            {/* ── Programmes ────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Programmes</h2>

                {university.programs.length === 0 ? (
                    <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                        No programmes listed yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {university.programs.map((program) => (
                            <div key={program.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-2 text-sm text-gray-600">
                                <h3 className="text-lg font-bold text-gray-900">{program.programName}</h3>

                                {/* Always visible */}
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-medium">Degree Level</span>
                                    <span>{program.degreeLevel}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-medium">Field of Study</span>
                                    <span>{program.fieldCategory}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-medium">Tuition Fee</span>
                                    <span>{program.currency} {program.tuitionFee?.toLocaleString() ?? 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="font-medium">Intakes</span>
                                    <span>{program.intakes}</span>
                                </div>
                                {program.isStem && (
                                    <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg w-fit text-xs font-medium">
                                        <CheckCircle className="h-3.5 w-3.5" />
                                        STEM Designated
                                    </div>
                                )}

                                {/* Express Interest per-programme — logged-in only */}
                                {isLoggedIn && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <form action={async () => {
                                            'use server'
                                            await expressInterest(university.id, undefined, program.id)
                                        }}>
                                            <Button size="sm" variant="outline" className="w-full">
                                                Express Interest in Programme
                                            </Button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Documents — names visible, download gated ─────────────── */}
            {university.documents.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Downloads
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">
                        Brochures, programme guides, and leaflets from {university.institutionName}.
                    </p>
                    <div className="divide-y divide-gray-100">
                        {university.documents.map(doc => (
                            <div key={doc.id} className="flex items-center gap-4 py-3">
                                {doc.mimeType.startsWith('image/')
                                    ? <Image className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                    : <FileText className="h-5 w-5 text-red-400 flex-shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{doc.displayName}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.OTHER}`}>
                                            {CATEGORY_LABELS[doc.category] ?? doc.category}
                                        </span>
                                        <span>{formatBytes(doc.sizeBytes)}</span>
                                    </div>
                                </div>
                                {isLoggedIn ? (
                                    <a
                                        href={`/api/uni-docs/${doc.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0"
                                    >
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            <Download className="h-3.5 w-3.5" />
                                            Open
                                        </Button>
                                    </a>
                                ) : (
                                    <Link href="/login" className="flex-shrink-0">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30">
                                            Sign in to Download
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Guest sign-up nudge banner ─────────────────────────────── */}
            {!isLoggedIn && (
                <div className="bg-gradient-to-r from-primary/5 to-indigo-50 border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Want to connect with {university.institutionName}?</p>
                        <p className="text-xs text-gray-500 mt-0.5">Create a free EdUmeetup profile — takes 30 seconds.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Link href="/student/register">
                            <Button size="sm" className="gap-1.5">
                                <Mail className="h-3.5 w-3.5" />
                                Student Sign Up
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="sm" variant="outline">Sign In</Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
