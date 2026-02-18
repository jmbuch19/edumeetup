
import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = 'force-dynamic'

export default async function DebugPage() {
    const user = await requireUser()

    if (user.role !== 'ADMIN') {
        redirect('/')
    }

    const logs = await prisma.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    })

    return (
        <div className="container mx-auto py-10 px-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>System Debug Logs (Last 50)</span>
                        <Badge variant="outline">{logs.length} Entries</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead className="w-[100px]">Level</TableHead>
                                <TableHead className="w-[150px]">Type</TableHead>
                                <TableHead>Message</TableHead>
                                <TableHead className="w-[200px]">Metadata</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-mono text-xs">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            log.level === 'ERROR' ? 'destructive' :
                                                log.level === 'WARN' ? 'secondary' : 'outline'
                                        }>
                                            {log.level}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{log.type}</TableCell>
                                    <TableCell className="max-w-[400px] break-words">
                                        {log.message}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs max-w-[200px] truncate" title={JSON.stringify(log.metadata, null, 2)}>
                                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No logs found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
