import { GraduationCap, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UniversityProfile, Program } from '@prisma/client'

// Use a type that matches what the search action returns
type UniversityWithPrograms = UniversityProfile & {
    programs: { fieldCategory?: unknown, field?: unknown }[] // Allow for flexible program shape during dev
}

interface UniversityCardProps {
    university: UniversityWithPrograms
    matchData?: any // For future use
}

export function UniversityCard({ university, matchData }: UniversityCardProps) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100 relative">
                {/* Logo Placeholder - would use Image in real app if university.logo exists */}
                <GraduationCap className="h-12 w-12 text-gray-400" />

                {university.verificationStatus === 'VERIFIED' && (
                    <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Verified</span>
                )}
            </div>
            <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1" title={university.institutionName}>
                    {university.institutionName}
                </h3>
                <div className="flex items-center text-gray-500 mb-4 text-sm">
                    <MapPin className="h-4 w-4 mr-1 shrink-0" />
                    <span className="line-clamp-1">{university.city}, {university.country}</span>
                </div>
                <div className="space-y-2 mb-6 flex-1">
                    <div className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{university.programs?.length || 0}</span> Programs Available
                    </div>
                </div>
                <Link href={`/universities/${university.id}`} className="mt-auto">
                    <Button variant="outline" className="w-full">View Details</Button>
                </Link>
            </div>
        </div>
    )
}
