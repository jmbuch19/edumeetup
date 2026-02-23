import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MapPin, Globe, Mail, CheckCircle, Calendar, FileText, Image, Download } from 'lucide-react'
import { notFound } from 'next/navigation'
import { expressInterest } from '@/app/actions'
import { UniversityLogo } from '@/components/university/university-logo'

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
    // Await params before using
    const { id } = await params
    const session = await auth()
    const user = session?.user
    const isLoggedIn = !!user

    const university = await prisma.university.findUnique({
        where: { id },
        include: {
            programs: true,
            documents: {
                orderBy: { uploadedAt: 'desc' },
                select: { id: true, displayName: true, category: true, fileName: true, mimeType: true, sizeBytes: true, uploadedAt: true }
            }
        }
    })

    if (!university) {
        notFound()
    }

    async function handleExpressInterest() {
        'use server'
        await expressInterest(id)
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <UniversityLogo
                                src={university.logo}
                                alt={university.institutionName}
                                size="xl"
                                isVerified={university.verificationStatus === 'VERIFIED'}
                            />
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                    {university.institutionName}
                                </h1>
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

                            {isLoggedIn ? (
                                <div className="flex gap-2">
                                    {university.meetingLink && (
                                        <a href={university.meetingLink} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" className="gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Book Meeting
                                            </Button>
                                        </a>
                                    )}
                                    <form action={handleExpressInterest}>
                                        <Button size="lg" className="gap-2">
                                            <Mail className="h-4 w-4" />
                                            Express Interest
                                        </Button>
                                    </form>
                                </div>
                            ) : (
                                <Link href="/login">
                                    <Button size="lg" variant="secondary" className="gap-2">
                                        Login to Connect
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900">Available Programs</h2>

                    {university.programs.length === 0 ? (
                        <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                            No programs listed yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {university.programs.map((program) => (
                                <div key={program.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">{program.programName}</h3>
                                    <div className="space-y-2 text-sm text-gray-600">
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
                                        <div className="flex justify-between pt-2">
                                            <span className="font-medium">Intakes</span>
                                            <span>{program.intakes}</span>
                                        </div>
                                        {isLoggedIn && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <form action={async () => {
                                                    'use server'
                                                    await expressInterest(university.id, undefined, program.id)
                                                }}>
                                                    <Button size="sm" variant="outline" className="w-full">
                                                        Express Interest in Program
                                                    </Button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Downloads section — visible to all (login required to see files) */}
            {university.documents.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Downloads
                    </h2>
                    <p className="text-sm text-muted-foreground mb-5">
                        Brochures, program guides, and leaflets shared by {university.institutionName}.
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
                                        <Button variant="outline" size="sm">Login to Download</Button>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

