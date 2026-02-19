import { getEventDetails } from '../actions'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, MapPin, Users, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import EventRegistrationButton from '../EventRegistrationButton'
import { notFound } from 'next/navigation'

export default async function EventDetailsPage(props: any) {
    const params = props.params
    const event = await getEventDetails(params.id)
    if (!event) notFound()

    const session = await auth()

    // Check if user is registered
    let isRegistered = false
    if (session && session.user && (session.user as any).role === 'STUDENT') {
        const student = await prisma.student.findUnique({ where: { userId: session.user.id } })
        if (student) {
            const registration = await prisma.eventRegistration.findUnique({
                where: {
                    eventId_studentId: {
                        eventId: event.id,
                        studentId: student.id
                    }
                }
            })
            if (registration) isRegistered = true
        }
    }

    // Check if user is the owner university (to show "Edit" potentially? Or just view?)
    // For now, simple view.

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-6">
                <Link href="/events" className="text-sm text-blue-600 hover:underline">← Back to Events</Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="bg-blue-50 p-8 border-b border-blue-100/50">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-3">
                                {event.type}
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{event.title}</h1>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">{event.university.institutionName}</span>
                                {event.university.country && <span>({event.university.country})</span>}
                            </div>
                        </div>

                        {session?.user ? (
                            (session.user as any).role === 'STUDENT' ? (
                                <EventRegistrationButton eventId={event.id} isRegistered={isRegistered} />
                            ) : (
                                <div className="text-sm bg-gray-100 px-3 py-2 rounded">
                                    Logged in as {(session.user as any).role}
                                </div>
                            )
                        ) : (
                            <Link href={`/login?callbackUrl=/events/${event.id}`}>
                                <Button size="lg">Log in to Register</Button>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b">
                    <div className="p-6 flex items-start gap-4">
                        <Calendar className="h-6 w-6 text-blue-500 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Date & Time</h3>
                            <p className="text-gray-600">{format(event.dateTime, 'PPP')}</p>
                            <p className="text-gray-600">{format(event.dateTime, 'p')}</p>
                        </div>
                    </div>
                    <div className="p-6 flex items-start gap-4">
                        <MapPin className="h-6 w-6 text-red-500 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Location</h3>
                            <p className="text-gray-600 break-words">{event.location || 'Online'}</p>
                        </div>
                    </div>
                    <div className="p-6 flex items-start gap-4">
                        <Users className="h-6 w-6 text-green-500 mt-1" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Capacity</h3>
                            <p className="text-gray-600">
                                {event.capacity ? `${event.capacity} Spots` : 'Unlimited'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <h2 className="text-2xl font-bold mb-4">About this Event</h2>
                    <div className="prose max-w-none text-gray-600 whitespace-pre-line">
                        {event.description}
                    </div>
                </div>
            </div>
        </div>
    )
}
