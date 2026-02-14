import { searchUniversities } from '@/app/actions/university'
import { UniversityCard } from '@/components/university-card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { COUNTRIES } from '@/lib/utils'
import { FieldCategory } from '@prisma/client'
import Link from 'next/link'
import { Search } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function UniversitiesPage({
    searchParams
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    // searchParams is synchronous in Next.js 14
    const query = (searchParams.q as string) || ''
    const country = (searchParams.country as string) || ''
    const field = (searchParams.field as string) || ''
    const page = Number(searchParams.page) || 1

    const { universities, totalPages, totalCount } = await searchUniversities({
        query,
        country,
        field,
        page
    })

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header & Search Section */}
            <div className="mb-8 space-y-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Explore Universities</h1>
                    <p className="text-muted-foreground">Discover top institutions matching your ambitions.</p>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">

                    {/* Search Input */}
                    <div className="flex-1">
                        <form className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                name="q"
                                defaultValue={query}
                                placeholder="Search by name..."
                                className="pl-10"
                            />
                            {/* Hidden inputs to preserve other filters when submitting text search */}
                            {country && <input type="hidden" name="country" value={country} />}
                            {field && <input type="hidden" name="field" value={field} />}
                            <Button type="submit" className="hidden" />
                        </form>
                    </div>

                    {/* Filters - Pure HTML Forms for simplicity & no-JS fallback */}
                    <form className="flex gap-2 flex-col md:flex-row items-center">
                        <input type="hidden" name="q" value={query} />

                        <div className="w-[180px]">
                            <select
                                name="country"
                                defaultValue={country}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">All Countries</option>
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="w-[180px]">
                            <select
                                name="field"
                                defaultValue={field}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">All Fields</option>
                                {Object.values(FieldCategory).map(f => (
                                    <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                        </div>

                        <Button type="submit" variant="secondary">Apply</Button>
                        {(query || country || field) && (
                            <Link href="/universities">
                                <Button variant="ghost">Clear</Button>
                            </Link>
                        )}
                    </form>
                </div>
            </div>

            {/* Results Grid */}
            {universities.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {universities.map(uni => (
                        <UniversityCard
                            key={uni.id}
                            university={uni}
                            // Pass undefined matchData implies "Public View"
                            matchData={undefined}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <h3 className="text-lg font-medium">No universities found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters.</p>
                </div>
            )}

            {/* Pagination Section */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    {page > 1 && (
                        <Link href={{ query: { ...searchParams, page: page - 1 } }}>
                            <Button variant="outline">Previous</Button>
                        </Link>
                    )}
                    <span className="py-2 px-4 text-sm font-medium">Page {page} of {totalPages}</span>
                    {page < totalPages && (
                        <Link href={{ query: { ...searchParams, page: page + 1 } }}>
                            <Button variant="outline">Next</Button>
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}
