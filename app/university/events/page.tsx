import { getUniversityEvents } from '@/app/events/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar, Users, MapPin } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function UniversityEventsPage() {
    const events = await getUniversityEvents() as any[]

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">My Events</h1>
                <Link href="/university/events/new">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Create Event
                    </Button>
                </Link>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500">
                    <p className="mb-4">You haven't created any events yet.</p>
                    <Link href="/university/events/new">
                        <Button variant="outline">Create your first event</Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map((event) => (
                        <Card key={event.id}>
                            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${event.status === 'UPCOMING' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {event.status}
                                        </span>
                                        <span className="text-xs text-gray-500 border px-2 py-0.5 rounded-full">{event.type}</span>
                                        {!event.isPublished && (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Draft</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(event.dateTime, 'PPP p')}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {event.location || 'Online'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 border-l pl-8">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold">{event._count.registrations}</div>
                                        <div className="text-xs text-gray-500">Registered</div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Link href={`/university/events/${event.id}`}>
                                            <Button variant="outline" size="sm" className="w-full">Manage</Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
