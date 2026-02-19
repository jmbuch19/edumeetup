'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { createSponsoredContent, deleteSponsoredContent, getSponsoredContent } from "./actions"
import { Loader2, Trash2, ExternalLink, ImageIcon } from "lucide-react"

type SponsoredContent = {
    id: string
    title: string
    partnerName: string
    imageUrl: string
    targetUrl: string
    placement: string
    isActive: boolean
    createdAt: Date
    impressions: number
    clicks: number
}

export function SponsoredContentManager() {
    const [items, setItems] = useState<SponsoredContent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadItems()
    }, [])

    async function loadItems() {
        const data = await getSponsoredContent()
        setItems(data)
        setIsLoading(false)
    }

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        const res = await createSponsoredContent(formData)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Sponsored content created")
            loadItems()
            // Reset form by reloading page or clearing inputs (simple way for now)
            const form = document.getElementById("sponsored-form") as HTMLFormElement
            form?.reset()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure?")) return
        const res = await deleteSponsoredContent(id)
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
                <h3 className="text-lg font-medium mb-4">Add New Sponsored Content</h3>
                <form id="sponsored-form" action={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Campaign Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Summer Code Camp" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="partnerName">Partner Name</Label>
                            <Input id="partnerName" name="partnerName" placeholder="e.g. Google" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="targetUrl">Target URL (Link)</Label>
                            <Input id="targetUrl" name="targetUrl" placeholder="https://..." required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">Desktop Image URL</Label>
                            <Input id="imageUrl" name="imageUrl" placeholder="https://..." required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobileImageUrl">Mobile Image URL (Optional)</Label>
                            <Input id="mobileImageUrl" name="mobileImageUrl" placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sponsorType">Sponsor Type</Label>
                            <Select name="sponsorType" defaultValue="UNIVERSITY">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="UNIVERSITY">University</SelectItem>
                                    <SelectItem value="PROGRAM">Program</SelectItem>
                                    <SelectItem value="PARTNER">Partner</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="placement">Placement</Label>
                            <Select name="placement" defaultValue="SIDEBAR">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select placement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SIDEBAR">Sidebar Widget</SelectItem>
                                    <SelectItem value="FEED">Feed / Dashboard</SelectItem>
                                    <SelectItem value="BANNER">Top Banner (Hero)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority (1-10)</Label>
                            <Select name="priority" defaultValue="5">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                                        <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" defaultValue="DRAFT">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="EXPIRED">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input type="datetime-local" id="startDate" name="startDate" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input type="datetime-local" id="endDate" name="endDate" required />
                        </div>
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Campaign
                    </Button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Active Campaigns</h3>
                {isLoading ? (
                    <div>Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-muted-foreground">No active campaigns.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {items.map((item) => (
                            <Card key={item.id}>
                                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="h-20 w-32 relative bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                        {/* Simple image preview */}
                                        <img src={item.imageUrl} alt={item.title} className="object-cover w-full h-full"
                                            onError={(e) => (e.currentTarget.src = "/placeholder.png")} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">{item.title}</h4>
                                        <div className="text-sm text-muted-foreground flex gap-4">
                                            <span>Partner: {item.partnerName}</span>
                                            <span>Placement: {item.placement}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <a href={item.targetUrl} target="_blank" rel="noreferrer" className="flex items-center hover:underline">
                                                {item.targetUrl} <ExternalLink className="h-3 w-3 ml-1" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        <div>{item.impressions} Views</div>
                                        <div>{item.clicks} Clicks</div>
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
