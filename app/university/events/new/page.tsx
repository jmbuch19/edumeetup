'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea' // We created this
import { Switch } from '@/components/ui/switch'     // We created this
import { Label } from '@/components/ui/label'
import { createEvent } from '@/app/events/actions'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function CreateEventPage() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)
        const res = await createEvent(formData) // Ignoring type error for now since it returns explicit object
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        } else {
            router.push('/university/events')
        }
    }

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Create New Event</h1>

            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Event Title</Label>
                            <Input id="title" name="title" required placeholder="e.g. Fall Open Day 2025" />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" required rows={5} placeholder="Describe the event..." />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="type">Event Type</Label>
                                <select
                                    id="type"
                                    name="type"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    required
                                >
                                    <option value="VIRTUAL">Virtual (Online)</option>
                                    <option value="PHYSICAL">Physical (In-person)</option>
                                    <option value="HYBRID">Hybrid</option>
                                </select>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="dateTime">Date & Time</Label>
                                <Input id="dateTime" name="dateTime" type="datetime-local" required />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location">Location / URL</Label>
                            <Input id="location" name="location" placeholder="e.g. Zoom Link or 'Main Hall, Campus A'" required />
                            <p className="text-xs text-muted-foreground">For virtual events, put the meeting link or 'Link provided after registration'.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="capacity">Capacity (Optional)</Label>
                            <Input id="capacity" name="capacity" type="number" placeholder="Leave blank for unlimited" />
                        </div>

                        <div className="flex items-center space-x-2 border p-4 rounded-lg bg-gray-50">
                            <Label htmlFor="isPublished" className="flex-1 cursor-pointer">
                                <span className="font-medium block">Publish Immediately</span>
                                <span className="text-xs text-muted-foreground font-normal">If disabled, the event will be saved as a draft.</span>
                            </Label>
                            <Switch id="isPublished" name="isPublished" />
                        </div>

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Creating...' : 'Create Event'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}
