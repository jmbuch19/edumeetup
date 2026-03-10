'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Bell, Mail, Users, Clock, AlertTriangle, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
    nudgeSegment, emailSegment,
    getRecentSegmentActivity,
    type SegmentStudent, type RecentActivity,
} from './segment-actions'
import { AttachmentPicker } from '@/components/admin/attachment-picker'

interface Props {
    freshStudents: SegmentStudent[]
    dormantStudents: SegmentStudent[]
}

type Panel = 'nudge' | 'email' | null
type Segment = 'fresh' | 'dormant'

function formatDate(d: Date | string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatRelative(d: Date | string | null) {
    if (!d) return 'Never logged in'
    const diffDays = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays} days ago`
}
function formatTimeAgo(d: Date | string) {
    const ms = Date.now() - new Date(d).getTime()
    const mins = Math.floor(ms / 60_000)
    if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`
    const days = Math.floor(hrs / 24)
    return `${days} day${days !== 1 ? 's' : ''} ago`
}

function StudentTable({ students, type }: { students: SegmentStudent[]; type: Segment }) {
    if (students.length === 0) {
        return (
            <div className="flex flex-col items-center py-12 text-center gap-2">
                <Users className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No students in this segment right now.</p>
            </div>
        )
    }
    return (
        <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="text-left px-4 py-2 font-medium">Name</th>
                        <th className="text-left px-4 py-2 font-medium">Email</th>
                        <th className="text-left px-4 py-2 font-medium">
                            {type === 'fresh' ? 'Joined' : 'Last Seen'}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {students.map(s => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2 font-medium">{s.name ?? '—'}</td>
                            <td className="px-4 py-2 text-muted-foreground">{s.email}</td>
                            <td className="px-4 py-2 text-muted-foreground">
                                {type === 'fresh'
                                    ? formatDate(s.joinedAt)
                                    : formatRelative(s.lastSeenAt)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ── Duplicate-guard warning dialog ────────────────────────────────────────────

function DuplicateWarningDialog({
    open,
    activity,
    actionType,
    segmentLabel,
    onProceed,
    onCancel,
}: {
    open: boolean
    activity: RecentActivity | null
    actionType: 'nudge' | 'email'
    segmentLabel: string
    onProceed: () => void
    onCancel: () => void
}) {
    if (!activity) return null
    const typeLabel = actionType === 'nudge' ? 'in-app nudge' : 'bulk email'
    const windowLabel = actionType === 'nudge' ? '24 hours' : '7 days'

    return (
        <Dialog open={open} onOpenChange={open => !open && onCancel()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <ShieldAlert className="h-5 w-5" />
                        Already Sent Recently
                    </DialogTitle>
                    <DialogDescription>
                        A {typeLabel} was already sent to this group within the last {windowLabel}.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Sent by</span>
                        <span className="font-medium">
                            {activity.adminName ?? activity.adminEmail ?? 'Admin'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">When</span>
                        <span className="font-medium">{formatTimeAgo(activity.sentAt)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Segment</span>
                        <span className="font-medium">{segmentLabel}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Students reached</span>
                        <span className="font-medium">{activity.count}</span>
                    </div>
                    {activity.subject && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subject</span>
                            <span className="font-medium truncate max-w-[60%] text-right">{activity.subject}</span>
                        </div>
                    )}
                </div>

                <p className="text-sm text-muted-foreground">
                    Sending again may result in students receiving duplicate messages.
                    Are you sure you want to proceed?
                </p>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button variant="destructive" onClick={onProceed}>
                        Send Anyway
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ── Segment panel ─────────────────────────────────────────────────────────────

function SegmentPanel({
    segment, students, icon: Icon, title, description, badgeVariant,
}: {
    segment: Segment
    students: SegmentStudent[]
    icon: React.ElementType
    title: string
    description: string
    badgeVariant: 'default' | 'destructive' | 'secondary' | 'outline'
}) {
    const [activePanel, setActivePanel] = useState<Panel>(null)
    const [nudgeTitle, setNudgeTitle] = useState('')
    const [nudgeMsg, setNudgeMsg] = useState('')
    const [emailSubject, setEmailSubject] = useState('')
    const [emailBody, setEmailBody] = useState('')
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
    const [isPending, startTransition] = useTransition()

    // Duplicate-guard state
    const [checkingActivity, setCheckingActivity] = useState(false)
    const [duplicateWarning, setDuplicateWarning] = useState<{
        activity: RecentActivity
        intendedPanel: Panel
    } | null>(null)

    // Open a panel — runs the duplicate check first
    const openPanel = (panel: 'nudge' | 'email') => {
        setCheckingActivity(true)
        getRecentSegmentActivity(segment, panel)
            .then(activity => {
                if (activity) {
                    // Show warning — don't open the compose dialog yet
                    setDuplicateWarning({ activity, intendedPanel: panel })
                } else {
                    // Safe to proceed
                    setActivePanel(panel)
                }
            })
            .catch(() => {
                // If check fails, proceed without warning
                setActivePanel(panel)
            })
            .finally(() => setCheckingActivity(false))
    }

    const handleNudge = () => {
        startTransition(async () => {
            const result = await nudgeSegment(segment, nudgeTitle, nudgeMsg)
            if (result.error) { toast.error(result.error); return }
            toast.success(`Nudge sent to ${result.sent} student${result.sent !== 1 ? 's' : ''}`)
            setActivePanel(null); setNudgeTitle(''); setNudgeMsg('')
        })
    }

    const handleEmail = () => {
        startTransition(async () => {
            const fd = new FormData()
            fd.append('segment', segment)
            fd.append('subject', emailSubject)
            fd.append('body', emailBody)
            if (attachmentFile) fd.append('attachment', attachmentFile)

            const result = await emailSegment(fd)
            if (result.error) { toast.error(result.error); return }
            toast.success(
                `Email sent to ${result.sent} student${result.sent !== 1 ? 's' : ''}` +
                (result.failed > 0 ? ` (${result.failed} failed)` : '')
            )
            setActivePanel(null); setEmailSubject(''); setEmailBody(''); setAttachmentFile(null)
        })
    }

    const segmentLabel = segment === 'fresh' ? 'New Students (last 30 days)' : 'Dormant Students (60+ days)'

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="font-semibold flex items-center gap-2">
                            {title}
                            <Badge variant={badgeVariant}>{students.length}</Badge>
                        </h3>
                        <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm" variant="outline"
                        disabled={students.length === 0 || checkingActivity}
                        onClick={() => openPanel('nudge')}
                    >
                        <Bell className="h-4 w-4 mr-1" />
                        {checkingActivity ? 'Checking…' : 'Nudge'}
                    </Button>
                    <Button
                        size="sm" variant="outline"
                        disabled={students.length === 0 || checkingActivity}
                        onClick={() => openPanel('email')}
                    >
                        <Mail className="h-4 w-4 mr-1" />
                        {checkingActivity ? 'Checking…' : 'Email All'}
                    </Button>
                </div>
            </div>

            <StudentTable students={students} type={segment} />

            {/* Duplicate-guard warning dialog */}
            <DuplicateWarningDialog
                open={!!duplicateWarning}
                activity={duplicateWarning?.activity ?? null}
                actionType={(duplicateWarning?.intendedPanel ?? 'email') as 'nudge' | 'email'}
                segmentLabel={segmentLabel}
                onProceed={() => {
                    const panel = duplicateWarning?.intendedPanel ?? null
                    setDuplicateWarning(null)
                    setActivePanel(panel)
                }}
                onCancel={() => setDuplicateWarning(null)}
            />

            {/* Nudge compose dialog */}
            <Dialog open={activePanel === 'nudge'} onOpenChange={open => !open && setActivePanel(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Send In-App Nudge</DialogTitle>
                        <DialogDescription>
                            Creates a notification for <strong>{students.length}</strong> {title.toLowerCase()} students. No email is sent.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label htmlFor="nudge-title">Title</Label>
                            <Input id="nudge-title" value={nudgeTitle} onChange={e => setNudgeTitle(e.target.value)} placeholder="Welcome to EdUmeetup! 👋" maxLength={80} />
                        </div>
                        <div>
                            <Label htmlFor="nudge-msg">Message</Label>
                            <Textarea id="nudge-msg" value={nudgeMsg} onChange={e => setNudgeMsg(e.target.value)} placeholder="Explore universities and find your perfect match." rows={3} maxLength={300} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivePanel(null)} disabled={isPending}>Cancel</Button>
                        <Button onClick={handleNudge} disabled={isPending || !nudgeTitle.trim() || !nudgeMsg.trim()}>
                            {isPending ? 'Sending…' : `Send to ${students.length} Students`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Email compose dialog */}
            <Dialog open={activePanel === 'email'} onOpenChange={open => !open && setActivePanel(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            Send Bulk Email
                        </DialogTitle>
                        <DialogDescription>
                            Real email to <strong>{students.length}</strong> {title.toLowerCase()} students. Cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div>
                            <Label htmlFor="email-subject">Subject</Label>
                            <Input id="email-subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Discover your future university" maxLength={100} />
                        </div>
                        <div>
                            <Label htmlFor="email-body">Body</Label>
                            <Textarea id="email-body" value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Hi there! We noticed you recently joined EdUmeetup..." rows={4} maxLength={1500} />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Attachment <span className="text-muted-foreground font-normal">(optional)</span></Label>
                            <AttachmentPicker onChange={setAttachmentFile} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActivePanel(null)} disabled={isPending}>Cancel</Button>
                        <Button variant="destructive" onClick={handleEmail} disabled={isPending || !emailSubject.trim() || !emailBody.trim()}>
                            {isPending ? 'Sending…' : `Email ${students.length} Students`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export function StudentSegments({ freshStudents, dormantStudents }: Props) {
    return (
        <div className="space-y-8">
            <SegmentPanel segment="fresh" students={freshStudents} icon={Users} title="New Students"
                description="Joined in the last 30 days" badgeVariant="default" />
            <div className="border-t pt-8">
                <SegmentPanel segment="dormant" students={dormantStudents} icon={Clock} title="Dormant Students"
                    description="Joined >60 days ago, not seen in 60+ days" badgeVariant="secondary" />
            </div>
        </div>
    )
}
