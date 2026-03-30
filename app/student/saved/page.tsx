import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { UniversityCard } from '@/components/university-card'
import { BookmarkIcon } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SavedUniversitiesPage() {
    const user = await requireUser()
    const email = user.email
    if (!email) return <div>User email required</div>

    const student = await prisma.student.findUnique({
        where: { userId: user.id }
    })

    if (!student) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
                <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
                    <span className="text-4xl block mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Incomplete</h2>
                    <p className="text-slate-500 text-sm">You must complete your student profile before accessing saved items.</p>
                </div>
            </div>
        )
    }

    const bookmarks = await prisma.bookmark.findMany({
        where: { studentId: student.id },
        include: {
            university: {
                include: {
                    programList: { select: { programName: true, degreeLevel: true, fieldCategory: true } }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <BookmarkIcon className="h-8 w-8 text-primary" />
                        Saved Universities
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Keep track of programs and institutions you are interested in.
                    </p>
                </div>
            </div>

            {bookmarks.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[40vh]">
                    <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mb-6">
                        <BookmarkIcon className="h-10 w-10 text-primary/40" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No saved universities yet</h3>
                    <p className="text-slate-500 mb-6 max-w-md">
                        Start exploring and bookmarking universities to build your potential shortlists here.
                    </p>
                    <Link href="/universities" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-6 py-2">
                        Discover Universities
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bookmarks.map((bookmark: any) => (
                        <div key={bookmark.id} className="h-full">
                            <UniversityCard university={bookmark.university as any} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
