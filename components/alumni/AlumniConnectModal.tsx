'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { requestAlumConnect } from '@/app/actions/alumni'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Mail, Video, Linkedin, CheckCircle } from 'lucide-react'

type ConnectType = 'EMAIL' | 'MEETING' | 'LINKEDIN'

const CONNECT_OPTIONS: { type: ConnectType; icon: typeof Mail; label: string; desc: string; color: string }[] = [
    { type: 'EMAIL', icon: Mail, label: 'Email Request', desc: 'Alumni will reply to you via email', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
    { type: 'MEETING', icon: Video, label: 'Video Call', desc: 'Request a short Zoom / Google Meet', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
    { type: 'LINKEDIN', icon: Linkedin, label: 'LinkedIn', desc: "Connect on alumni's LinkedIn profile", color: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100' },
]

interface Props {
    open: boolean
    onClose: () => void
    alumni: {
        id: string
        name: string
        usUniversityName: string
        usProgram: string
        availableFor: string[]
        linkedinUrl?: string | null
        isAtCapacity?: boolean
    }
}

export default function AlumniConnectModal({ open, onClose, alumni }: Props) {
    const [type, setType] = useState<ConnectType>('EMAIL')
    const [message, setMessage] = useState('')
    const [done, setDone] = useState(false)
    const [isPending, startTransition] = useTransition()

    // Filter options to those the alumni actually supports
    const availableTypes = CONNECT_OPTIONS.filter(opt => {
        if (opt.type === 'EMAIL') return alumni.availableFor.some(a => ['EMAIL_WHATSAPP', 'VIDEO_CALL', 'WRITTEN_TIPS', 'RECORD_VIDEO'].includes(a))
        if (opt.type === 'MEETING') return alumni.availableFor.includes('VIDEO_CALL')
        if (opt.type === 'LINKEDIN') return !!alumni.linkedinUrl
        return true
    })

    const selectedOpt = availableTypes.find(o => o.type === type) ?? availableTypes[0]

    const handleSubmit = () => {
        if (!message.trim() || message.length < 10) {
            toast.error('Please write at least 10 characters')
            return
        }
        startTransition(async () => {
            const res = await requestAlumConnect({ alumniId: alumni.id, type, message })
            if ('error' in res) {
                toast.error(res.error)
            } else {
                setDone(true)
            }
        })
    }

    const handleClose = () => {
        setType('EMAIL')
        setMessage('')
        setDone(false)
        onClose()
    }

    if (alumni.isAtCapacity) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Alumni is fully booked</DialogTitle>
                        <DialogDescription>
                            {alumni.name} has reached their weekly capacity for connections. Please check back next week!
                        </DialogDescription>
                    </DialogHeader>
                    <Button variant="outline" onClick={handleClose}>Got it</Button>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                            {alumni.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                            <DialogTitle className="text-base">{alumni.name}</DialogTitle>
                            <p className="text-xs text-muted-foreground">{alumni.usProgram} · {alumni.usUniversityName}</p>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-2">
                        ✅ This alumni has consented to receiving messages from verified EdUmeetup students.
                    </p>
                </DialogHeader>

                {done ? (
                    <div className="text-center py-8">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="font-semibold text-gray-900">Request sent!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {alumni.name} will be notified. You'll hear back via your EdUmeetup notifications.
                        </p>
                        <Button className="mt-5" variant="outline" onClick={handleClose}>Done</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Connect type */}
                        {availableTypes.length > 1 && (
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">How would you like to connect?</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {availableTypes.map(opt => {
                                        const Icon = opt.icon
                                        return (
                                            <button key={opt.type}
                                                onClick={() => setType(opt.type)}
                                                className={`border rounded-xl p-3 text-left transition-all ${type === opt.type ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                                            >
                                                <Icon className="w-4 h-4 mb-1" />
                                                <p className="text-xs font-semibold">{opt.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Show LinkedIn URL immediately if LinkedIn selected */}
                        {type === 'LINKEDIN' && alumni.linkedinUrl ? (
                            <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                                <p className="text-sm font-medium text-sky-800 mb-2">Connect on LinkedIn:</p>
                                <a href={alumni.linkedinUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-sky-600 underline underline-offset-2 break-all">
                                    {alumni.linkedinUrl}
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Your message to {alumni.name.split(' ')[0]}
                                </Label>
                                <Textarea
                                    placeholder={type === 'MEETING'
                                        ? 'Hi! I would love a 15-min call to ask about your experience at [university]. I\'m considering the same program...'
                                        : 'Hi! I\'m from IAES (batch of...) and considering [university] for [program]. I\'d love to hear about your experience...'
                                    }
                                    rows={4}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    maxLength={1000}
                                    className="resize-none text-sm"
                                />
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="text-xs">
                                        {type === 'MEETING' ? '📅 Video Call' : '✉️ Email Request'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{message.length}/1000</span>
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isPending || message.length < 10}
                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
                                >
                                    {isPending ? 'Sending...' : `Send ${type === 'MEETING' ? 'Meeting Request' : 'Connect Request'} →`}
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground">
                                    You can send up to 3 connect requests per day.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
