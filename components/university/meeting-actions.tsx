'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cancelMeeting, updateMeeting } from '@/app/actions/meeting'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface MeetingActionsProps {
    meeting: {
        id: string
        title: string
        joinUrl: string | null
        agenda: string | null
    }
}

export function MeetingActions({ meeting }: MeetingActionsProps) {
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this meeting? This action cannot be undone and will notify all participants.")) return

        const res = await cancelMeeting(meeting.id)
        if (res.success) {
            toast.success("Meeting canceled")
        } else {
            toast.error(res.error || "Failed to cancel")
        }
    }

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)

        const res = await updateMeeting(meeting.id, formData)
        setIsLoading(false)

        if (res.success) {
            toast.success("Meeting updated")
            setIsEditOpen(false)
        } else {
            toast.error(res.error || "Failed to update")
        }
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCancel} className="text-red-600 focus:text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Cancel Meeting
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Meeting</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input name="title" defaultValue={meeting.title} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Video Link (Zoom/Meet)</Label>
                            <Input name="joinUrl" defaultValue={meeting.joinUrl || ''} placeholder="https://..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Agenda / Topics</Label>
                            <Textarea name="agenda" defaultValue={meeting.agenda || ''} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
