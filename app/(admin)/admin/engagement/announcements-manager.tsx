'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { createAnnouncement, deleteAnnouncement, getAnnouncements } from "./actions"
import { Loader2, Trash2, Megaphone, AlertCircle } from "lucide-react"

type Announcement = {
    id: string
    title: string
    content: string
    targetAudience: string
    priority: string
    isActive: boolean
    createdAt: Date
}

export function AnnouncementsManager() {
    const [items, setItems] = useState<Announcement[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadItems()
    }, [])

    async function loadItems() {
        const data = await getAnnouncements()
        setItems(data)
        setIsLoading(false)
    }

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        const res = await createAnnouncement(formData)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Announcement posted")
            loadItems()
            const form = document.getElementById("annout-form") as HTMLFormElement
            form?.reset()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete this announcement?")) return
        const res = await deleteAnnouncement(id)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Deleted successfully")
            loadItems()
        }
    }

    return (
        <div className="space-y-6">
            <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <h3 className="text-lg font-medium mb-4">Post New Announcement</h3>
                <form id="annout-form" action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" name="title" placeholder="e.g. Scheduled Maintenance" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" name="content" placeholder="Details about the announcement..." required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="targetAudience">Target Audience</Label>
                            <Select name="targetAudience" defaultValue="ALL">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select audience" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Users</SelectItem>
                                    <SelectItem value="STUDENT">Students Only</SelectItem>
                                    <SelectItem value="UNIVERSITY">Universities Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="announcementType">Type</Label>
                            <Select name="announcementType" defaultValue="GENERAL">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GENERAL">General</SelectItem>
                                    <SelectItem value="NEW_UNIVERSITY">New University</SelectItem>
                                    <SelectItem value="CHECK_IN">Check-in</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select name="priority" defaultValue="NORMAL">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                    <SelectItem value="HIGH">High (Urgent)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post Announcement
                    </Button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">History</h3>
                {isLoading ? (
                    <div>Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-muted-foreground">No announcements found.</div>
                ) : (
                    <div className="space-y-4">
                        {items.map((item) => (
                            <Card key={item.id}>
                                <CardContent className="p-4 flex gap-4 items-start">
                                    <div className={`p-2 rounded-full ${item.priority === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {item.priority === 'HIGH' ? <AlertCircle className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold">{item.title}</h4>
                                            <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm mt-1 whitespace-pre-wrap">{item.content}</p>
                                        <div className="mt-2 flex gap-2 text-xs">
                                            <span className="bg-slate-100 px-2 py-1 rounded">To: {item.targetAudience}</span>
                                            {item.priority === 'HIGH' && <span className="bg-red-100 text-red-800 px-2 py-1 rounded">High Priority</span>}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
