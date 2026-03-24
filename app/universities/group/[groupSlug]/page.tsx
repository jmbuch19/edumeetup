import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { UniversityCard } from '@/components/university-card'
import Link from 'next/link'
import { MapPin, Building2, GraduationCap, ChevronRight, Globe } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ groupSlug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { groupSlug } = await props.params
    const parent = await prisma.university.findFirst({
        where: { groupSlug, isParent: true },
        select: { institutionName: true, country: true }
    })
    if (!parent) return {}
    return {
        title: `${parent.institutionName} — All Schools | EdUmeetup`,
        description: `Explore all faculties and schools under ${parent.institutionName} (${parent.country}) on EdUmeetup. Express interest, explore programs, and book meetings from one place.`,
    }
}

export default async function GroupPage(props: Props) {
    const { groupSlug } = await props.params
    const session = await auth()
    const userRole = session?.user?.role

    // Fetch parent + all verified schools under this group
    const parent = await prisma.university.findFirst({
        where: { groupSlug, isParent: true, verificationStatus: 'VERIFIED' },
        include: {
            schools: {
                where: { verificationStatus: 'VERIFIED', isPublic: true },
                include: { programList: {
                        select: { fieldCategory: true, programName: true, degreeLevel: true }
                    }
                },
                orderBy: { institutionName: 'asc' },
            },
            programList: {
                select: { fieldCategory: true, programName: true, degreeLevel: true }
            }
        },
    })

    if (!parent) notFound()

    const totalPrograms =
        parent.programList.length +
        parent.schools.reduce((acc: any, s: any) => acc + s.programList.length, 0)

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
                <Link href="/universities" className="hover:text-indigo-600 transition-colors">Universities</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-gray-900 font-medium">{parent.institutionName}</span>
            </nav>

            {/* Parent header */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-8 py-6 mb-8">
                <div className="flex items-start gap-5">
                    {parent.logo ? (
                        <img
                            src={parent.logo}
                            alt={parent.institutionName}
                            className="w-20 h-20 rounded-2xl object-contain border border-gray-100 bg-white p-1 shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-3xl shrink-0">
                            {parent.institutionName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight">{parent.institutionName}</h1>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4" />
                            {parent.city ? `${parent.city}, ` : ''}{parent.country}
                        </p>
                        {parent.website && (
                            <a
                                href={parent.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mt-1"
                            >
                                <Globe className="h-3.5 w-3.5" /> {parent.website.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                    </div>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-indigo-400" />
                        <strong className="text-gray-800">{parent.schools.length}</strong>
                        {parent.schools.length === 1 ? 'school' : 'schools'}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <GraduationCap className="h-4 w-4 text-indigo-400" />
                        <strong className="text-gray-800">{totalPrograms}</strong> programs
                    </span>
                </div>
            </div>

            {/* Schools grid */}
            {parent.schools.length > 0 ? (
                <>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Schools & Faculties
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {parent.schools.map((school: any) => (
                            <UniversityCard
                                key={school.id}
                                university={school as any}
                                userRole={userRole}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-medium text-gray-500">No schools listed yet</h3>
                    <p className="text-sm text-gray-400 mt-1">Schools under this institution will appear here once verified.</p>
                </div>
            )}

            {/* "Express interest in all schools" CTA — only for students */}
            {userRole === 'STUDENT' && parent.schools.length > 0 && (
                <div className="mt-8 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="font-semibold text-indigo-900 text-sm">
                            Interested in {parent.institutionName}?
                        </p>
                        <p className="text-xs text-indigo-700 mt-0.5">
                            Click into each school above to express interest, explore programs, or book a meeting.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
