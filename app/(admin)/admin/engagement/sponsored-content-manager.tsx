'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { createSponsoredContent, deleteSponsoredContent, getSponsoredContent } from "./actions"
import { Loader2, Trash2, ExternalLink } from "lucide-react"
import { normalizeUrl } from "@/lib/url-utils"

type SponsoredContent = {
    id: string
    title: string
    partnerName: string
    imageUrl: string
    targetUrl: string
    placement: string
    isActive: boolean
    status: string
    createdAt: Date
    impressions: number
    clicks: number
}

const DEFAULT_FORM = {
    title: "",
    partnerName: "",
    imageUrl: "",
    mobileImageUrl: "",
    targetUrl: "",
    sponsorType: "UNIVERSITY",
    placement: "BANNER",
    priority: "5",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
}

export function SponsoredContentManager() {
    const [items, setItems] = useState<SponsoredContent[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [form, setForm] = useState(DEFAULT_FORM)

    useEffect(() => {
        loadItems()
    }, [])

    async function loadItems() {
        setIsLoading(true)
        const data = await getSponsoredContent()
        setItems(data as SponsoredContent[])
        setIsLoading(false)
    }

    function setField(field: keyof typeof DEFAULT_FORM, value: string) {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!form.title || !form.imageUrl || !form.targetUrl) {
            toast.error("Title, Image URL, and Target URL are required")
            return
        }

        setIsSubmitting(true)

        // Build FormData manually so Select values are included
        const formData = new FormData()
        formData.set("title", form.title)
        formData.set("partnerName", form.partnerName)
        formData.set("imageUrl", form.imageUrl)
        formData.set("mobileImageUrl", form.mobileImageUrl)
        formData.set("targetUrl", form.targetUrl)
        formData.set("sponsorType", form.sponsorType)
        formData.set("placement", form.placement)
        formData.set("priority", form.priority)
        formData.set("status", form.status)
        formData.set("startDate", form.startDate)
        formData.set("endDate", form.endDate)

        const res = await createSponsoredContent(formData)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Sponsored content created successfully!")
            setForm(DEFAULT_FORM)
            loadItems()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this campaign?")) return
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
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Campaign Title</Label>
                            <Input id="title" placeholder="e.g. Summer Code Camp" required
                                value={form.title} onChange={e => setField("title", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="partnerName">Partner Name</Label>
                            <Input id="partnerName" placeholder="e.g. Google" required
                                value={form.partnerName} onChange={e => setField("partnerName", e.target.value)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="targetUrl">Target URL (Link)</Label>
                            <Input id="targetUrl" placeholder="https://..." required
                                value={form.targetUrl} onChange={e => setField("targetUrl", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imageUrl">Desktop Image URL</Label>
                            <Input id="imageUrl" placeholder="https://..." required
                                value={form.imageUrl} onChange={e => setField("imageUrl", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobileImageUrl">Mobile Image URL <span className="text-muted-foreground text-xs">(Optional)</span></Label>
                            <Input id="mobileImageUrl" placeholder="https://..."
                                value={form.mobileImageUrl} onChange={e => setField("mobileImageUrl", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Sponsor Type</Label>
                            <Select value={form.sponsorType} onValueChange={v => setField("sponsorType", v)}>
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
                            <Label>Placement</Label>
                            <Select value={form.placement} onValueChange={v => setField("placement", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select placement" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SIDEBAR">Sidebar Widget</SelectItem>
                                    <SelectItem value="FEED">Feed / Dashboard</SelectItem>
                                    <SelectItem value="BANNER">⭐ Top Banner (Hero Page)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority (1-10)</Label>
                            <Select value={form.priority} onValueChange={v => setField("priority", v)}>
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
                            <Label>Status</Label>
                            <Select value={form.status} onValueChange={v => setField("status", v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft (hidden)</SelectItem>
                                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                    <SelectItem value="ACTIVE">✅ Active (live)</SelectItem>
                                    <SelectItem value="EXPIRED">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date <span className="text-muted-foreground text-xs">(leave blank = now)</span></Label>
                            <Input type="datetime-local" id="startDate"
                                value={form.startDate} onChange={e => setField("startDate", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date <span className="text-muted-foreground text-xs">(leave blank = runs forever)</span></Label>
                            <Input type="datetime-local" id="endDate"
                                value={form.endDate} onChange={e => setField("endDate", e.target.value)} />
                        </div>
                    </div>

                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <strong>⚡ To appear on the Hero page:</strong> Placement must be <strong>Top Banner</strong>, Status must be <strong>Active</strong>, and End Date must be set in the future (or left blank). Start Date defaults to now if left blank.
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Campaign
                    </Button>
                </form>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">All Campaigns</h3>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : items.length === 0 ? (
                    <div className="text-muted-foreground">No campaigns yet.</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {items.map((item) => (
                            <Card key={item.id}>
                                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div className="h-20 w-32 relative bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                        <img src={item.imageUrl} alt={item.title} className="object-cover w-full h-full"
                                            onError={(e) => (e.currentTarget.src = "/placeholder.png")} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold">{item.title}</h4>
                                        <div className="text-sm text-muted-foreground flex gap-4 flex-wrap">
                                            <span>Partner: {item.partnerName}</span>
                                            <span>Placement: {item.placement}</span>
                                            <span className={`font-medium ${item.status === 'ACTIVE' ? 'text-green-600' : 'text-slate-500'}`}>
                                                Status: {item.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <a href={normalizeUrl(item.targetUrl)} target="_blank" rel="noreferrer" className="flex items-center hover:underline">
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
