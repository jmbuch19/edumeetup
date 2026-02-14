import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { GraduationCap, MapPin, Search } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function UniversitiesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Await searchParams before accessing properties
    const params = await searchParams
    const countryFilter = typeof params.country === 'string' ? params.country : undefined
    const searchFilter = typeof params.query === 'string' ? params.query : undefined

    const universities = await prisma.universityProfile.findMany({
        where: {
            verificationStatus: 'VERIFIED',
            country: countryFilter ? { contains: countryFilter } : undefined, // Case sensitive usually in Prisma unless mode insensitive
            institutionName: searchFilter ? { contains: searchFilter } : undefined,
        },
        include: { programs: true }
    })

    // Get unique countries for filter dropdown
    const allUniversities = await prisma.universityProfile.findMany({
        select: { country: true },
        where: { verificationStatus: 'VERIFIED' },
        distinct: ['country']
    })

    async function searchAction(formData: FormData) {
        'use server'
        const query = formData.get('query')
        const country = formData.get('country')
        let url = '/universities?'
        if (query) url += `query=${query}&`
        if (country) url += `country=${country}`
        redirect(url)
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Universities</h1>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <form action={searchAction} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input name="query" placeholder="Search by name..." className="pl-10" defaultValue={searchFilter} />
                        </div>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                        <select name="country" defaultValue={countryFilter} className="flex h-10 w-full rounded-md border border-gray-300 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                            <option value="">All Countries</option>
                            {allUniversities.map(u => (
                                <option key={u.country} value={u.country}>{u.country}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button type="submit">Filter Results</Button>
                    </div>
                </form>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {universities.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-gray-500">No universities found matching your criteria.</p>
                    </div>
                ) : (
                    universities.map((uni) => (
                        <div key={uni.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                            <div className="h-32 bg-gray-100 flex items-center justify-center border-b border-gray-100 relative">
                                {uni.logo ? (
                                    <img src={uni.logo} alt={uni.institutionName} className="max-h-20 max-w-[80%] object-contain" />
                                ) : (
                                    <GraduationCap className="h-12 w-12 text-gray-400" />
                                )}
                                {uni.verificationStatus === 'VERIFIED' && (
                                    <span className="absolute top-2 right-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">Verified</span>
                                )}
                            </div>
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{uni.institutionName}</h3>
                                <div className="flex items-center text-gray-500 mb-4 text-sm">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {uni.city}, {uni.country}
                                </div>
                                <div className="space-y-2 mb-6 flex-1">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium text-gray-900">{uni.programs.length}</span> Programs Available
                                    </div>
                                </div>
                                <Link href={`/universities/${uni.id}`} className="mt-auto">
                                    <Button variant="outline" className="w-full">View Details</Button>
                                </Link>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
