'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { sendNotification } from "./notification-actions"
import { Loader2, Send } from "lucide-react"

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
                <form id="notif-form" action={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="targetType">Recipient Type</Label>
                        <Select name="targetType" defaultValue="STUDENT">
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="STUDENT">Student</SelectItem>
                                <SelectItem value="UNIVERSITY">University</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="recipientEmail">Recipient Email</Label>
                        <Input id="recipientEmail" name="recipientEmail" type="email" placeholder="user@example.com" required />
                        <p className="text-xs text-muted-foreground">The specific email of the user to notify.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title">Notification Title</Label>
                        <Input id="title" name="title" placeholder="e.g. Profile Update Required" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" placeholder="Enter your message here..." required />
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
