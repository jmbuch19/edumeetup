"use client"

import { useState } from "react"
import { Bug, CheckCircle2, Loader2, MessageSquareWarning } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { submitBugReport } from "@/app/actions/report"
import { toast } from "sonner"
import { usePathname } from "next/navigation"

export function BugReporter() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const pathname = usePathname()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        formData.append("path", pathname)

        const result = await submitBugReport(formData)

        setLoading(false)

        if (result?.success) {
            setSuccess(true)
            toast.success("Report submitted successfully")
            setTimeout(() => {
                setOpen(false)
                setSuccess(false)
            }, 2000)
        } else {
            toast.error("Failed to submit report")
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-primary shadow-lg text-white hover:bg-primary/90 md:bottom-8 md:right-8"
                    title="Report a Bug"
                >
                    <Bug className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Report an Issue</DialogTitle>
                    <DialogDescription>
                        Found a bug or have feedback? Let us know.
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                        <div className="bg-green-100 p-3 rounded-full">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <p className="font-medium">Thank you for your report!</p>
                    </div>
                ) : (
                    <form onSubmit={onSubmit} className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Issue Type</Label>
                            <Select name="type" required defaultValue="BUG">
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BUG">Bug Report</SelectItem>
                                    <SelectItem value="UI_ISSUE">UI/Design Issue</SelectItem>
                                    <SelectItem value="FEEDBACK">Feedback / Feature Request</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="message">Description</Label>
                            <Textarea
                                id="message"
                                name="message"
                                placeholder="Describe what happened..."
                                className="min-h-[100px]"
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="screenshotUrl">Screenshot URL (Optional)</Label>
                            <Input
                                id="screenshotUrl"
                                name="screenshotUrl"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Submit Report"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
