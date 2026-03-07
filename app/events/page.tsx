import { getPublicEvents } from './actions'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function EventsPage() {
    const events = await getPublicEvents()

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Upcoming University Events</h1>

            {events.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <p>No upcoming events found. Check back later!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event: any) => (
                        <Card key={event.id} className="flex flex-col">
                            <CardHeader>
                                <div className="text-sm text-blue-600 font-medium mb-1">{event.type}</div>
                                <CardTitle className="text-xl">{event.title}</CardTitle>
                                <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                    <span className="font-semibold">{event.university.institutionName}</span>
                                    {event.university.country && <span>• {event.university.country}</span>}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-gray-600 line-clamp-3 mb-4">{event.description}</p>
                                <div className="space-y-2 text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(event.dateTime, 'PPP p')}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        {event.location || 'Online'}
                                    </div>
                                    {event.capacity && (
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Limited Space
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Link href={`/events/${event.id}`} className="w-full">
                                    <Button className="w-full">View Details & Register</Button>
                                </Link>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
