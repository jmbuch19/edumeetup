
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
                                    <TableCell className="font-medium">
                                        {uni.institutionName}
                                        {uni.website && (
                                            <a href={uni.website} target="_blank" rel="noreferrer" className="ml-2 inline-block text-muted-foreground hover:text-primary">
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        )}
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
