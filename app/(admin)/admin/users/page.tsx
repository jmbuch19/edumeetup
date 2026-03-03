import { prisma } from "@/lib/prisma"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react"
import { Suspense } from "react"
import { StudentFilterBar } from "./student-filter-bar"

export const dynamic = 'force-dynamic'

type Filters = {
    role?: string
    profile?: string
    cv?: string
    interests?: string
    advisory?: string
    status?: string
    english?: string
    gre?: string
    gmat?: string
}

async function getUsers(f: Filters) {
    // ── Role filter ────────────────────────────────────────────────────────────
    const roleWhere = f.role && f.role !== 'ALL'
        ? { role: f.role as any }
        : {}

    // ── Activity filter ────────────────────────────────────────────────────────
    const statusWhere = f.status === 'ACTIVE' ? { isActive: true }
        : f.status === 'INACTIVE' ? { isActive: false }
            : {}

    const users = await prisma.user.findMany({
        where: { ...roleWhere, ...statusWhere },
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                include: {
                    _count: { select: { interests: true, advisoryRequests: true } }
                },
                select: {
                    id: true,
                    fullName: true,
                    profileComplete: true,
                    phone: true,
                    city: true,
                    country: true,
                    fieldOfInterest: true,
                    preferredDegree: true,
                    preferredCountries: true,
                    currentStatus: true,
                    cvUrl: true,
                    englishTestType: true,
                    greScore: true,
                    gmatScore: true,
                    _count: true,
                }
            },
            university: { select: { institutionName: true } }
        }
    })

    // ── Client-side sub-filters (computed fields) ─────────────────────────────
    return users.filter(user => {
        const s = user.student

        // Profile completeness — compute dynamically
        if (f.profile && f.profile !== 'ALL') {
            if (!s) return false
            const complete = !!(s.fullName && s.phone && s.city && s.country &&
                s.fieldOfInterest && s.preferredDegree && s.preferredCountries && s.currentStatus)
            if (f.profile === 'COMPLETE' && !complete) return false
            if (f.profile === 'INCOMPLETE' && complete) return false
        }

        // CV
        if (f.cv && f.cv !== 'ALL') {
            if (!s) return f.cv === 'MISSING'
            if (f.cv === 'UPLOADED' && !s.cvUrl) return false
            if (f.cv === 'MISSING' && !!s.cvUrl) return false
        }

        // Interests
        if (f.interests && f.interests !== 'ALL') {
            const count = s?._count?.interests ?? 0
            if (f.interests === 'HAS' && count === 0) return false
            if (f.interests === 'NONE' && count > 0) return false
        }

        // Advisory requests
        if (f.advisory && f.advisory !== 'ALL') {
            const count = s?._count?.advisoryRequests ?? 0
            if (f.advisory === 'HAS' && count === 0) return false
            if (f.advisory === 'NONE' && count > 0) return false
        }

        // English test
        if (f.english && f.english !== 'ALL') {
            if (f.english === 'TAKEN' && !s?.englishTestType) return false
            if (f.english === 'NOT_TAKEN' && !!s?.englishTestType) return false
        }

        // GRE
        if (f.gre && f.gre !== 'ALL') {
            if (f.gre === 'TAKEN' && !s?.greScore) return false
            if (f.gre === 'NOT_TAKEN' && !!s?.greScore) return false
        }

        // GMAT
        if (f.gmat && f.gmat !== 'ALL') {
            if (f.gmat === 'TAKEN' && !s?.gmatScore) return false
            if (f.gmat === 'NOT_TAKEN' && !!s?.gmatScore) return false
        }

        return true
    })
}

export default async function AdminUsersPage({
    searchParams
}: {
    searchParams: Record<string, string>
}) {
    const filters: Filters = {
        role: searchParams.role,
        profile: searchParams.profile,
        cv: searchParams.cv,
        interests: searchParams.interests,
        advisory: searchParams.advisory,
        status: searchParams.status,
        english: searchParams.english,
        gre: searchParams.gre,
        gmat: searchParams.gmat,
    }

    const users = await getUsers(filters)

    // IDs of student records for the notify panel
    const filteredStudentIds = users
        .filter(u => u.role === 'STUDENT')
        .map(u => u.student?.id)
        .filter(Boolean) as string[]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Filter bar */}
            <Suspense>
                <StudentFilterBar
                    totalCount={users.length}
                    filteredStudentIds={filteredStudentIds}
                    currentFilters={Object.fromEntries(
                        Object.entries(filters).filter(([, v]) => !!v)
                    ) as Record<string, string>}
                />
            </Suspense>

            <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Name / Institution</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead>CV</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No users match the current filters.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const isStudent = user.role === 'STUDENT'
                                const s = user.student
                                const isActuallyComplete = isStudent && s
                                    ? !!(s.fullName && s.phone && s.city && s.country &&
                                        s.fieldOfInterest && s.preferredDegree && s.preferredCountries && s.currentStatus)
                                    : null

                                return (
                                    <TableRow key={user.id} className="hover:bg-muted/40 cursor-pointer transition-colors">
                                        <TableCell className="font-medium">
                                            <Link href={`/admin/users/${user.id}`} className="hover:underline text-primary">
                                                {user.email}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                user.role === 'ADMIN' ? 'default' :
                                                    user.role === 'UNIVERSITY' ? 'secondary' : 'outline'
                                            }>
                                                {user.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {s?.fullName || user.university?.institutionName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {isStudent && isActuallyComplete !== null ? (
                                                isActuallyComplete ? (
                                                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                                        <CheckCircle2 className="h-4 w-4" /> Complete
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                                                        <AlertCircle className="h-4 w-4" /> Incomplete
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isStudent ? (
                                                s?.cvUrl ? (
                                                    <span className="text-xs text-green-600 font-medium">✅ Uploaded</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={user.isActive ? 'outline' : 'destructive'}
                                                className={user.isActive ? 'text-green-600 border-green-200 bg-green-50' : ''}
                                            >
                                                {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(user.createdAt), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/admin/users/${user.id}`} className="text-muted-foreground hover:text-foreground">
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
