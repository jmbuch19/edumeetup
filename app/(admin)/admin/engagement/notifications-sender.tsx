'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { sendNotification } from "./notification-actions"
import { Loader2, Send, Link } from "lucide-react"

export function NotificationsSender() {
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true)
        const res = await sendNotification(formData)

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success("Notification sent successfully!")
            const form = document.getElementById("notif-form") as HTMLFormElement
            form?.reset()
        }
        setIsSubmitting(false)
    }

    return (
        <div className="space-y-6">
            <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                <p className="text-sm text-muted-foreground mb-4">
                    Send a targeted in-app notification + email to a specific user. Role is auto-detected from the database.
                </p>
                <form id="notif-form" action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipientEmail">Recipient Email</Label>
                        <Input
                            id="recipientEmail"
                            name="recipientEmail"
                            type="email"
                            placeholder="user@example.com"
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Works for any registered student or university. Role is auto-detected.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Notification Title</Label>
                            <Input id="title" name="title" placeholder="e.g. Profile Update Required" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notifType">Type</Label>
                            <Select name="notifType" defaultValue="INFO">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INFO">ℹ️ Info</SelectItem>
                                    <SelectItem value="WARNING">⚠️ Warning</SelectItem>
                                    <SelectItem value="ACTION_REQUIRED">🔴 Action Required</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" placeholder="Enter your message here..." required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="actionUrl" className="flex items-center gap-1">
                            <Link className="h-3 w-3" /> Action URL
                            <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <Input
                            id="actionUrl"
                            name="actionUrl"
                            type="text"
                            placeholder="/student/profile or /university/settings"
                        />
                        <p className="text-xs text-muted-foreground">
                            Internal paths only (must start with <code>/</code>). Clicking the notification will navigate here.
                        </p>
                    </div>

                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send Notification
                    </Button>
                </form>
            </div>
        </div>
    )
}
