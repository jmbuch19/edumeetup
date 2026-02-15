import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"

export default async function TicketListPage() {
    const sessionEmail = cookies().get('edumeetup_session')?.value
    if (!sessionEmail) redirect('/login?next=/support/tickets')

    const user = await prisma.user.findUnique({
        where: { email: sessionEmail }
    })

    if (!user) redirect('/login')

    const tickets = await prisma.supportTicket.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="container mx-auto py-12 px-4 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">My Tickets</h1>
                <Link href="/support">
                    <Badge variant="outline" className="text-lg py-2 px-4 hover:bg-gray-100 cursor-pointer">
                        + New Ticket
                    </Badge>
                </Link>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg mb-4">You haven't submitted any support tickets.</p>
                    <Link href="/support" className="text-blue-600 hover:underline">
                        Create your first ticket &rarr;
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">Ticket ID</th>
                                <th className="p-4 font-medium text-gray-500">Category</th>
                                <th className="p-4 font-medium text-gray-500">Status</th>
                                <th className="p-4 font-medium text-gray-500">Priority</th>
                                <th className="p-4 font-medium text-gray-500">Date</th>
                                <th className="p-4 font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-mono text-sm">#{ticket.id.slice(-6)}</td>
                                    <td className="p-4">{ticket.category}</td>
                                    <td className="p-4">
                                        <Badge variant={
                                            ticket.status === 'RESOLVED' ? 'default' :
                                                ticket.status === 'IN_PROGRESS' ? 'secondary' :
                                                    'outline'
                                        }>
                                            {ticket.status.replace('_', ' ')}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${ticket.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                                                ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            {ticket.priority}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(ticket.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <Link href={`/support/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
