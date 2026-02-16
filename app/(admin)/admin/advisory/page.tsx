import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowRight, Clock, MapPin, GraduationCap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminAdvisoryPage() {
    const requests = await prisma.advisoryRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            student: true
        }
    })

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Advisory Requests</h1>
                    <p className="text-muted-foreground">Manage student guidance sessions and assignments.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed text-muted-foreground">
                        No pending advisory requests.
                    </div>
                ) : (
                    requests.map(req => (
                        <Card key={req.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-base font-medium truncate">
                                    {req.student.fullName}
                                </CardTitle>
                                <Badge variant={
                                    req.status === 'NEW' ? 'default' :
                                        req.status === 'COMPLETED' ? 'secondary' : 'outline'
                                }>
                                    {req.status}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center text-muted-foreground">
                                        <MapPin className="mr-2 h-4 w-4" />
                                        Target: {req.targetCountry}
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <GraduationCap className="mr-2 h-4 w-4" />
                                        {req.targetDegree} in {req.fieldOfInterest}
                                    </div>
                                    <div className="flex items-center text-muted-foreground">
                                        <Clock className="mr-2 h-4 w-4" />
                                        Requested: {new Date(req.createdAt).toLocaleDateString()}
                                    </div>

                                    <div className="pt-4">
                                        <Link href={`/admin/advisory/${req.id}`}>
                                            <Button className="w-full" variant="secondary">
                                                Manage Request <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
