import { prisma } from "@/lib/prisma"
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react"
import {
    buildFilterWhere, FILTER_PRESETS,
    StudentFilter
} from "@/lib/admin/student-filters"
import { NudgePanel } from "./nudge-panel"

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage(
    props: {
        searchParams: Promise<Record<string, string>>
    }
) {
    const searchParams = await props.searchParams;
    const filter = (searchParams?.filter as StudentFilter) || 'ALL'
    const where = buildFilterWhere(filter)

    const users = await prisma.user.findMany({
        where,
        include: {
            student: {
                select: {
                    id: true,
                    fullName: true,
                    profileComplete: true,
                    cvUrl: true,
                    fieldOfInterest: true,
                    city: true,
                }
            },
            university: { select: { institutionName: true } }
        },
        orderBy: { createdAt: 'desc' },
    }).catch((err: unknown) => {
        console.error('[AdminUsersPage] prisma.findMany failed:', err)
        return []
    })


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            </div>

            {/* Filter chips — server-rendered, no JS required */}
            <div className="flex gap-2 flex-wrap">
                {FILTER_PRESETS.map(preset => (
                    <a key={preset.id}
                        href={`/admin/users?filter=${preset.id}`}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${filter === preset.id
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-primary/40'
                            }`}>
                        {preset.label}
                        {preset.nudgeTemplate && <span className="ml-1 opacity-50">📣</span>}
                    </a>
                ))}
            </div>

            {/* Nudge panel — shown when active filter has a nudge template */}
            {FILTER_PRESETS.find(p => p.id === filter)?.nudgeTemplate && (
                <NudgePanel filter={filter} preset={FILTER_PRESETS.find(p => p.id === filter)!} />
            )}

            <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Name</TableHead>
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
                                    No users match this filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const s = user.student
                                // Use stored boolean for list — full 10-field check is on detail page
                                const complete = s?.profileComplete ?? null

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
                                            {s?.city && <span className="text-xs text-muted-foreground ml-1">· {s.city}</span>}
                                        </TableCell>
                                        <TableCell>
                                            {s ? (
                                                complete ? (
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
