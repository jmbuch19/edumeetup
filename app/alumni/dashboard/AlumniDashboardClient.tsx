'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { respondToConnectRequest, updateAlumniProfile } from '@/app/actions/alumni'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GraduationCap, Mail, Video, Linkedin, Users, CheckCircle, XCircle, Clock, Edit3 } from 'lucide-react'

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
    STUDENT_CURRENTLY: { label: '📚 Studying (Current)',       class: 'bg-blue-100 text-blue-700' },
    OPT_CPT:           { label: '✈️ OPT/CPT',        class: 'bg-purple-100 text-purple-700' },
    H1B_PENDING:       { label: '⏳ H1B Pending',    class: 'bg-orange-100 text-orange-700' },
    H1B_APPROVED:      { label: '💼 Working (H1B)',  class: 'bg-green-100 text-green-700' },
    GREEN_CARD:        { label: '🗽 Green Card',     class: 'bg-teal-100 text-teal-700' },
    EMPLOYED_USA:      { label: '🇺🇸 Employed (USA)', class: 'bg-cyan-100 text-cyan-700' },
    PR_OTHER_COUNTRY:  { label: '🌍 PR (Other)',     class: 'bg-pink-100 text-pink-700' },
    FURTHER_STUDIES:   { label: '🎓 Further Studies', class: 'bg-indigo-100 text-indigo-700' },
    RETURNED_HOME:     { label: '🏠 Returned Home',  class: 'bg-stone-100 text-stone-700' },
    OTHER:             { label: '⭐ Alumni',           class: 'bg-amber-100 text-amber-700' },
}

const CONNECT_ICON = { EMAIL: Mail, MEETING: Video, LINKEDIN: Linkedin }

function ConnectRequestCard({ request, onRefresh }: {
    request: any
    onRefresh: () => void
}) {
    const [response, setResponse] = useState('')
    const [isPending, startTransition] = useTransition()
    const Icon = CONNECT_ICON[request.type as keyof typeof CONNECT_ICON] ?? Mail

    const handleRespond = (accept: boolean) => {
        startTransition(async () => {
            const res = await respondToConnectRequest({
                requestId: request.id,
                accept,
                responseMessage: response || undefined,
            })
            if ('error' in res) toast.error(res.error)
            else {
                toast.success(accept ? 'Request accepted! Student notified.' : 'Request declined.')
                onRefresh()
            }
        })
    }

    const isPending_ = request.status === 'PENDING'

    return (
        <Card className={`border ${isPending_ ? 'border-amber-100 bg-amber-50/30' : 'border-gray-100'}`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {(request.student?.user?.name ?? 'S')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold text-gray-900">{request.student?.user?.name ?? 'Student'}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                <Icon className="w-2.5 h-2.5" />
                                {request.type === 'EMAIL' ? 'Email' : request.type === 'MEETING' ? 'Video Call' : 'LinkedIn'}
                            </span>
                            {!isPending_ && (
                                <Badge variant={request.status === 'ACCEPTED' ? 'default' : 'secondary'} className="text-[10px]">
                                    {request.status}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{request.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                {isPending_ && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                        <Textarea
                            placeholder="Optional: add a message for the student (e.g. your email, Zoom link, or advice)"
                            rows={2}
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            maxLength={500}
                            className="resize-none text-xs"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" disabled={isPending} onClick={() => handleRespond(true)}
                                className="flex-1 h-7 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                <CheckCircle className="w-3 h-3 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleRespond(false)}
                                className="flex-1 h-7 text-xs border-red-200 text-red-600 hover:bg-red-50">
                                <XCircle className="w-3 h-3 mr-1" /> Decline
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function AlumniDashboardClient({ alumni }: { alumni: any }) {
    const [refreshKey, setRefreshKey] = useState(0)
    const [editOpen, setEditOpen] = useState(false)
    const [isPendingEdit, startEditTransition] = useTransition()
    
    // Edit Form State
    const [editForm, setEditForm] = useState({
        alumniStatus: alumni.alumniStatus || 'STUDENT_CURRENTLY',
        usDegreeLevel: alumni.usDegreeLevel || '',
        usCity: alumni.usCity || '',
        currentEmployer: alumni.currentEmployer || '',
        jobTitle: alumni.jobTitle || '',
        movedToCountry: alumni.movedToCountry || '',
        linkedinUrl: alumni.linkedinUrl || '',
        availabilityNote: alumni.availabilityNote || '',
        weeklyCapacity: alumni.weeklyCapacity?.toString() || '3',
        isAvailable: (alumni.weeklyCapacity || 0) > 0,
    })

    const handleEditSave = () => {
        startEditTransition(async () => {
            const formData = {
                alumniStatus: editForm.alumniStatus,
                usDegreeLevel: editForm.usDegreeLevel || undefined,
                usCity: editForm.usCity || undefined,
                currentEmployer: editForm.currentEmployer || undefined,
                jobTitle: editForm.jobTitle || undefined,
                movedToCountry: editForm.alumniStatus === 'PR_OTHER_COUNTRY' ? editForm.movedToCountry : null,
                linkedinUrl: editForm.linkedinUrl || undefined,
                availabilityNote: editForm.availabilityNote || undefined,
                weeklyCapacity: editForm.isAvailable ? parseInt(editForm.weeklyCapacity) || 3 : 0,
            }
            const res = await updateAlumniProfile(formData)
            if ('error' in res) {
                toast.error(res.error)
            } else {
                toast.success('Profile updated successfully!')
                setEditOpen(false)
                setRefreshKey(k => k + 1)
            }
        })
    }

    const pending = alumni.connectRequests?.filter((r: any) => r.status === 'PENDING') ?? []
    const past = alumni.connectRequests?.filter((r: any) => r.status !== 'PENDING') ?? []
    const status = STATUS_BADGE[alumni.alumniStatus] ?? { label: 'Alumni', class: 'bg-amber-100 text-amber-700' }

    // Calc days ago
    const lastUpdateDate = alumni.lastStatusUpdate ? new Date(alumni.lastStatusUpdate) : new Date(alumni.createdAt)
    const daysAgo = Math.floor((Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24))

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50/40 via-white to-orange-50/30">
            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* Hero */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-amber-100">
                        {(alumni.user?.name ?? 'A')[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-gray-900">{alumni.user?.name ?? 'Alumni'}</h1>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200">
                                <GraduationCap className="w-3 h-3" /> IAES Alumni
                            </span>
                        </div>
                        <p className="text-sm text-gray-500">{alumni.usProgram} · {alumni.usUniversityName}</p>
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${status.class}`}>
                            {status.label}
                        </span>
                    </div>
                    <div className="ml-auto text-right flex flex-col items-end gap-3">
                        {alumni.adminReviewStatus === 'PENDING_REVIEW' && (
                            <div className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-3 py-1">
                                <Clock className="w-3 h-3" /> Under Review
                            </div>
                        )}
                        {alumni.adminReviewStatus === 'APPROVED' && (
                            <div className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                                <CheckCircle className="w-3 h-3" /> Verified
                            </div>
                        )}
                        {alumni.adminReviewStatus === 'SUSPENDED' && (
                            <div className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 rounded-full px-3 py-1">
                                <XCircle className="w-3 h-3" /> Suspended — contact IAES
                            </div>
                        )}
                        
                        <div className="flex flex-col items-end gap-1">
                            <Button onClick={() => setEditOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm border-0 h-9">
                                <Edit3 className="w-4 h-4 mr-2" /> Update My Status
                            </Button>
                            <span className="text-[10px] text-gray-400 font-medium">
                                Last updated {daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Pending', value: pending.length, icon: Clock, color: 'text-amber-600' },
                        { label: 'Accepted', value: past.filter((r: any) => r.status === 'ACCEPTED').length, icon: CheckCircle, color: 'text-green-600' },
                        { label: 'Total Requests', value: alumni.connectRequests?.length ?? 0, icon: Users, color: 'text-blue-600' },
                    ].map(stat => (
                        <Card key={stat.label} className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                <p className="text-xs text-gray-500">{stat.label}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Connect Requests */}
                <Tabs defaultValue="pending">
                    <TabsList className="mb-4">
                        <TabsTrigger value="pending">
                            Pending <Badge variant="secondary" className="ml-1.5 text-xs">{pending.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="past">Past Requests</TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        {pending.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No pending requests</p>
                                <p className="text-xs mt-1">Students will see your profile in the Alumni Bridge section</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pending.map((r: any) => (
                                    <ConnectRequestCard key={r.id} request={r} onRefresh={() => setRefreshKey(k => k + 1)} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="past">
                        {past.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-sm">No past requests yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {past.map((r: any) => (
                                    <ConnectRequestCard key={r.id} request={r} onRefresh={() => setRefreshKey(k => k + 1)} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Update Your Information</DialogTitle>
                            <DialogDescription>
                                Keep your profile current so students can see your real journey and milestones.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Current Status</Label>
                                <Select value={editForm.alumniStatus} onValueChange={v => setEditForm(f => ({ ...f, alumniStatus: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your current status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_BADGE).map(([key, item]) => (
                                            <SelectItem key={key} value={key}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Degree Level</Label>
                                    <Select value={editForm.usDegreeLevel} onValueChange={v => setEditForm(f => ({ ...f, usDegreeLevel: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent>
                                            {['BACHELORS', 'MASTERS', 'PHD', 'CERTIFICATE'].map(l => (
                                                <SelectItem key={l} value={l}>{l}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Current City</Label>
                                    <Input value={editForm.usCity} onChange={e => setEditForm(f => ({ ...f, usCity: e.target.value }))} placeholder="e.g. New York, NY" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Current Employer (Optional)</Label>
                                    <Input value={editForm.currentEmployer} onChange={e => setEditForm(f => ({ ...f, currentEmployer: e.target.value }))} placeholder="Company Name" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Job Title (Optional)</Label>
                                    <Input value={editForm.jobTitle} onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))} placeholder="e.g. Software Engineer" />
                                </div>
                            </div>

                            {editForm.alumniStatus === 'PR_OTHER_COUNTRY' && (
                                <div className="space-y-2">
                                    <Label>Moved to Country</Label>
                                    <Input value={editForm.movedToCountry} onChange={e => setEditForm(f => ({ ...f, movedToCountry: e.target.value }))} placeholder="e.g. Canada" />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>LinkedIn URL</Label>
                                <Input value={editForm.linkedinUrl} onChange={e => setEditForm(f => ({ ...f, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                            </div>

                            <div className="border-t pt-4 mt-2">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Available to Help Students?</Label>
                                        <p className="text-xs text-gray-500">Toggle off if you are currently too busy to mentor.</p>
                                    </div>
                                    <Switch checked={editForm.isAvailable} onChange={(e) => setEditForm(f => ({ ...f, isAvailable: e.target.checked }))} />
                                </div>
                            </div>

                            {editForm.isAvailable && (
                                <div className="grid grid-cols-[1fr_2fr] gap-4 pt-2">
                                    <div className="space-y-2">
                                        <Label>Weekly Capacity</Label>
                                        <Input type="number" min="1" max="10" value={editForm.weeklyCapacity} onChange={e => setEditForm(f => ({ ...f, weeklyCapacity: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Availability Note (Optional)</Label>
                                        <Input value={editForm.availabilityNote} onChange={e => setEditForm(f => ({ ...f, availabilityNote: e.target.value }))} placeholder="e.g. Weekends IST only" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button onClick={handleEditSave} disabled={isPendingEdit} className="bg-amber-600 hover:bg-amber-700 text-white">
                                Save Profile
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    )
}
