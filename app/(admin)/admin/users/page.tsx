
import { prisma } from "@/lib/prisma"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            student: {
                select: {
                    fullName: true,
                    profileComplete: true,
                    phone: true,
                    city: true,
                    fieldOfInterest: true,
                    preferredDegree: true,
                    cvUrl: true,
                }
            },
            university: { select: { institutionName: true } }
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                <div className="text-sm text-muted-foreground">
                    Total Users: {users.length}
                </div>
            </div>

            <div className="border rounded-lg bg-white shadow-sm overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Name / Institution</TableHead>
                            <TableHead>Profile</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const isStudent = user.role === 'STUDENT'
                                const profileComplete = user.student?.profileComplete ?? null
                                const needsAction = isStudent && !profileComplete

                                return (
                                    <TableRow
                                        key={user.id}
                                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                                    >
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
                                            {user.student?.fullName || user.university?.institutionName || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {isStudent ? (
                                                profileComplete ? (
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
                                            <Badge variant={user.isActive ? 'outline' : 'destructive'} className={user.isActive ? 'text-green-600 border-green-200 bg-green-50' : ''}>
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
