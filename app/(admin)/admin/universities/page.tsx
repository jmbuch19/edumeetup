
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
import { Button } from "@/components/ui/button"
import { Eye, ExternalLink } from "lucide-react"
import Link from "next/link"

export default async function AdminUniversitiesPage() {
    const universities = await prisma.university.findMany({
        orderBy: { verificationStatus: 'asc' }, // Pending first
        include: {
            programs: true,
            user: true
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Universities</h1>
                <div className="text-sm text-muted-foreground">
                    Total: {universities.length}
                </div>
            </div>

            <div className="border rounded-lg bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Institution</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Programs</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {universities.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No universities found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            universities.map((uni) => (
                                <TableRow key={uni.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {uni.logo ? (
                                                <img
                                                    src={uni.logo}
                                                    alt={`${uni.institutionName} logo`}
                                                    className="w-10 h-10 rounded-lg object-contain border border-gray-100 bg-white p-0.5 flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex-shrink-0 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                                    {uni.institutionName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 min-w-0">
                                                <span className="font-medium text-gray-900 truncate">
                                                    {uni.institutionName}
                                                </span>
                                                {uni.website && (
                                                    <a href={uni.website} target="_blank" rel="noreferrer" className="ml-1 inline-block text-muted-foreground hover:text-primary flex-shrink-0">
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{uni.city}, {uni.country}</TableCell>
                                    <TableCell>{uni.programs.length}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            uni.verificationStatus === 'VERIFIED' ? 'default' :
                                                uni.verificationStatus === 'REJECTED' ? 'destructive' : 'secondary'
                                        } className={uni.verificationStatus === 'VERIFIED' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                            {uni.verificationStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {uni.contactEmail || uni.user.email}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/universities/${uni.id}`}>
                                            <Button size="icon" variant="ghost">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
