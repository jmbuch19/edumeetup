import { getSession } from "@/lib/auth"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { prisma } from '@/lib/prisma'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
    const user = await getSession()
    if (!user) redirect('/login?next=/support/tickets')

    if (!user) redirect('/login')

    const ticket = await prisma.supportTicket.findUnique({
        where: { id: params.id }
    })

    if (!ticket) {
        return (
            <div className="container mx-auto py-20 text-center">
                <h1 className="text-2xl font-bold mb-4">Ticket Not Found</h1>
                <Link href="/support/tickets">
                    <Button>Back to Tickets</Button>
                </Link>
            </div>
        )
    }

    // Security Check: Ensure user owns the ticket
    if (ticket.userId !== user.id) {
        return (
            <div className="container mx-auto py-20 text-center text-red-600">
                <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
                <p>You do not have permission to view this ticket.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl">
            <Link href="/support/tickets" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Tickets
            </Link>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold">Ticket #{ticket.id.slice(-6)}</h1>
                            <Badge variant={
                                ticket.status === 'RESOLVED' ? 'default' :
                                    ticket.status === 'IN_PROGRESS' ? 'secondary' :
                                        'outline'
                            }>
                                {ticket.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Created on {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border">
                        <div>
                            <span className="text-xs uppercase font-semibold text-gray-500">Category</span>
                            <p className="font-medium">{ticket.category}</p>
                        </div>
                        <div>
                            <span className="text-xs uppercase font-semibold text-gray-500">Priority</span>
                            <p className={`font-medium ${ticket.priority === 'HIGH' ? 'text-red-600' :
                                ticket.priority === 'MEDIUM' ? 'text-yellow-600' :
                                    'text-green-600'
                                }`}>
                                {ticket.priority}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">Message</h3>
                        <div className="bg-gray-50 p-6 rounded-lg border text-gray-800 whitespace-pre-wrap">
                            {ticket.message}
                        </div>
                    </div>

                    <div className="pt-8 border-t">
                        <h3 className="text-lg font-semibold mb-4">Updates & Replies</h3>
                        <p className="text-gray-500 italic">
                            No updates yet. Support team will respond via email to <strong>{user.email}</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
