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
import {
    buildFilterWhere, computeProfileComplete,
    StudentFilter, FILTER_PRESETS
} from "@/lib/admin/student-filters"

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
    searchParams
}: {
    searchParams: Record<string, string>
}) {
    const filter = (searchParams.filter as StudentFilter) ?? 'ALL'

    // Only apply student-specific where if filter targets students
    const isStudentFilter = filter !== 'ALL' && FILTER_PRESETS.find(p => p.id === filter)
    const where = isStudentFilter ? buildFilterWhere(filter) : {}

    const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
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
                    budgetRange: true,
                    currentStatus: true,
                    ageGroup: true,
                    gender: true,
                    cvUrl: true,
                    englishTestType: true,
                    greScore: true,
                    gmatScore: true,
                }
            },
            university: { select: { institutionName: true } }
        }
    })

    // IDs of student records in the current filtered view (for notify panel)
    const filteredStudentIds = users
        .filter(u => u.role === 'STUDENT' && u.student)
        .map(u => u.student!.id)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Smart filter bar — only for student-mode pages */}
            <Suspense>
                <StudentFilterBar
                    totalCount={users.filter(u => u.role === 'STUDENT').length || users.length}
                    filteredStudentIds={filteredStudentIds}
                    activeFilter={filter}
                />
            </Suspense>

            <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Name / Institution</TableHead>
                            <TableHead>Profile %</TableHead>
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
                                    No users match this filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const s = user.student
                                const completeness = s ? computeProfileComplete(s) : null

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
                                            {completeness ? (
                                                <div className="flex items-center gap-2">
                                                    {completeness.isComplete ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                                            <CheckCircle2 className="h-4 w-4" /> {completeness.score}%
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                                                            <AlertCircle className="h-4 w-4" /> {completeness.score}%
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {s ? (
                                                s.cvUrl
                                                    ? <span className="text-xs text-green-600 font-medium">✅ Yes</span>
                                                    : <span className="text-xs text-muted-foreground">—</span>
                                            ) : <span className="text-muted-foreground text-sm">—</span>}
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
