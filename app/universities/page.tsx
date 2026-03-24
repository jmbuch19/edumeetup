import { searchUniversities, getGroupedUniversities } from '@/app/actions/university'
import { auth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { COUNTRIES } from '@/lib/utils'
import { FIELD_CATEGORIES } from '@/lib/constants'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { UniversityBrowseClient } from '@/components/universities/browse-client'
import type { University } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function UniversitiesPage(
    props: {
        searchParams: Promise<{ [key: string]: string | string[] | undefined }>
    }
) {
    const searchParams = await props.searchParams
    const query = (searchParams.q as string) || ''
    const country = (searchParams.country as string) || ''
    const field = (searchParams.field as string) || ''
    const page = Number(searchParams.page) || 1

    // Fetch flat results + grouped data in parallel
    const [{ universities, totalPages }, { parents, standalones }] = await Promise.all([
        searchUniversities({ query, country, field, page }),
        getGroupedUniversities(),
    ])

    const session = await auth()
    const userRole = session?.user?.role

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
                            {country && <input type="hidden" name="country" value={country} />}
                            {field && <input type="hidden" name="field" value={field} />}
                            <Button type="submit" className="hidden" />
                        </form>
                    </div>

                    {/* Filters */}
                    <form className="flex gap-2 flex-col md:flex-row items-center">
                        <input type="hidden" name="q" value={query} />

                        <div className="w-[180px]">
                            <select
                                name="country"
                                defaultValue={country}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">All Countries</option>
                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="w-[180px]">
                            <select
                                name="field"
                                defaultValue={field}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">All Fields</option>
                                {FIELD_CATEGORIES.map(f => (
                                    <option key={f} value={f}>{f}</option>
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

            {/* Browse client: handles toggle + both views */}
            <UniversityBrowseClient
            parents={parents as any}
            standalones={standalones as any}
            flatUniversities={universities as any}
                userRole={userRole}
                totalPages={totalPages}
                currentPage={page}
                flatQuery={query}
                flatCountry={country}
                flatField={field}
                searchParams={Object.fromEntries(
                    Object.entries(searchParams).map(([k, v]) => [k, String(v ?? '')])
                )}
            />
        </div>
    )
}

