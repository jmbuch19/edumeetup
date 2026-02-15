
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CheckCircle, ArrowLeft } from 'lucide-react'

export default function SupportSuccessPage({ searchParams }: { searchParams: { ticketId: string } }) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
                    <p className="text-gray-600 mb-4">
                        Your support request has been received.
                    </p>

                    {searchParams.ticketId && (
                        <div className="bg-gray-100 p-3 rounded-lg mb-6 border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-medium">Ticket ID</p>
                            <p className="font-mono text-lg font-bold text-primary tracking-wider">
                                #{searchParams.ticketId.slice(-6).toUpperCase()}
                            </p>
                        </div>
                    )}

                    <p className="text-sm text-gray-500 mb-6">
                        We have sent a confirmation email to your registered address.
                        Our team typically responds within 24 hours.
                    </p>

                    <div className="space-y-3">
                        <Link href="/support/tickets">
                            <Button className="w-full">
                                View My Tickets
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" className="w-full">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Return Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
