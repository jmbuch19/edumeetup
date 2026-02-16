'use client'

import React, { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, Mail, MapPin, Send, User } from 'lucide-react'
import {
    getInterestedStudents,
    getProgramInterestStats,
    sendBulkNotification,
    InterestedStudent,
    InterestStats
} from '@/app/actions/interest-actions'
import { toast } from 'sonner'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts'

interface InterestPanelProps {
    programId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    programName: string
}

export function InterestPanel({ programId, open, onOpenChange, programName }: InterestPanelProps) {
    const [students, setStudents] = useState<InterestedStudent[]>([])
    const [stats, setStats] = useState<InterestStats | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('students')

    // Notify State
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)

    useEffect(() => {
        if (open && programId) {
            fetchData(programId)
        }
    }, [open, programId])

    const fetchData = async (id: string) => {
        setLoading(true)
        try {
            const [studentsData, statsData] = await Promise.all([
                getInterestedStudents(id),
                getProgramInterestStats(id)
            ])
            setStudents(studentsData)
            setStats(statsData)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load interest data")
        } finally {
            setLoading(false)
        }
    }

    const handleSendNotification = async () => {
        if (!programId || !subject || !message) return
        setSending(true)
        try {
            const res = await sendBulkNotification(programId, subject, message)
            if (res.success) {
                toast.success(`Sent to ${res.count} students`)
                setSubject('')
                setMessage('')
                setActiveTab('students')
            } else {
                toast.error("Failed to send notification")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error sending notification")
        } finally {
            setSending(false)
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle>Interest for {programName}</SheetTitle>
                    <SheetDescription>
                        Manage and analyze student interest for this program.
                    </SheetDescription>
                </SheetHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-3 mb-6">
                            <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
                            <TabsTrigger value="insights">Insights</TabsTrigger>
                            <TabsTrigger value="notify">Notify All</TabsTrigger>
                        </TabsList>

                        <TabsContent value="students" className="space-y-4">
                            {students.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No students have expressed interest yet.
                                </div>
                            ) : (
                                students.map(student => (
                                    <div key={student.id} className="flex flex-col p-4 bg-muted/40 rounded-lg border">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{student.fullName}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" /> {student.country || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={student.hasMeeting ? 'default' : 'outline'}>
                                                {student.hasMeeting ? 'Meeting Set' : 'Interested'}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2 pl-10">
                                            <div>Status: {student.currentStatus}</div>
                                            <div>Degree: {student.preferredDegree}</div>
                                        </div>
                                        <div className="mt-3 pl-10 flex gap-2">
                                            {/* Future: Add Message/Schedule Buttons */}
                                            {/* <Button size="sm" variant="secondary" className="h-7 text-xs">Message</Button> */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        <TabsContent value="insights" className="space-y-6">
                            {stats && (
                                <>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium">Top Countries</h3>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.byCountry} layout="vertical" margin={{ left: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                        {stats.byCountry.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444'][index % 5]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium">Student Status</h3>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.byStatus}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Bar dataKey="value" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="notify" className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-800 mb-4 flex items-start gap-2">
                                <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium">Bulk Messaging</p>
                                    <p className="text-xs mt-1 opacity-90">
                                        This will send an email and in-app notification to all <strong>{students.length}</strong> interested students.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                    placeholder="e.g., Upcoming Webinar for Computer Science"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Message</label>
                                <Textarea
                                    placeholder="Type your message here..."
                                    className="min-h-[150px]"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>

                            <Button
                                className="w-full gap-2"
                                onClick={handleSendNotification}
                                disabled={sending || students.length === 0 || !subject || !message}
                            >
                                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Send Message
                            </Button>
                        </TabsContent>
                    </Tabs>
                )}
            </SheetContent>
        </Sheet>
    )
}
