'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { updateAvailability } from '@/app/meeting-actions'
import { Label } from '@/components/ui/label'

interface AvailabilityFormProps {
    initialAvailability: any[] // Array of Availability records
    user: { id: string, name: string | null }
}

export default function AvailabilityForm({ initialAvailability, user }: AvailabilityFormProps) {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    // Default values if no record exists
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    // Check if we have any existing data to pre-fill global settings
    const firstRecord = initialAvailability[0]

    // State for form fields
    const [formData, setFormData] = useState({
        repName: firstRecord?.repName || user.name || '',
        repTimezone: firstRecord?.repTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        bufferMinutes: firstRecord?.bufferMinutes || 10,
        minLeadTimeHours: firstRecord?.minLeadTimeHours || 12,
        dailyCap: firstRecord?.dailyCap || 8,
        videoProvider: firstRecord?.videoProvider || 'Google Meet',
        externalLink: firstRecord?.externalLink || '',
        meetingDurationOptions: firstRecord?.meetingDurationOptions || [15], // Default 15
        eligibleDegreeLevels: firstRecord?.eligibleDegreeLevels || ['UG', 'Grad', 'PhD'],
        eligibleCountries: firstRecord?.eligibleCountries?.join(', ') || '',
        blackoutDates: firstRecord?.blackoutDates?.join(', ') || '',
    })


    // Helper to get day specific data
    const getDayData = (day: string) => {
        return initialAvailability.find(r => r.dayOfWeek === day) || {}
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const form = new FormData(e.target as HTMLFormElement)

        // Append arrays manually if needed, but native form submission handles same-name inputs
        // Just need to ensure checkboxes for days are handled correctly

        const result = await updateAvailability(form)

        if (result?.error) {
            setMessage(result.error)
        } else {
            setMessage('Availability saved successfully! ✅')
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>Configure your meeting preferences</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Rep Name</Label>
                        <Input name="repName" defaultValue={formData.repName} required />
                    </div>

                    <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Input name="repTimezone" defaultValue={formData.repTimezone} required suppressHydrationWarning />
                        <p className="text-xs text-muted-foreground">Auto-detected</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Video Provider</Label>
                        <Select name="videoProvider" defaultValue={formData.videoProvider}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Google Meet">Google Meet</SelectItem>
                                <SelectItem value="Zoom">Zoom</SelectItem>
                                <SelectItem value="External Link">External Link</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>External Link (if applicable)</Label>
                        <Input name="externalLink" defaultValue={formData.externalLink} placeholder="https://..." />
                    </div>

                    <div className="space-y-2 col-span-2">
                        <Label className="mb-2 block">Meeting Duration Options</Label>
                        <div className="flex gap-4">
                            {[10, 15, 20].map(dur => (
                                <div key={dur} className="flex items-center space-x-2">
                                    <Checkbox
                                        name="meetingDurationOptions"
                                        value={dur.toString()}
                                        defaultChecked={formData.meetingDurationOptions.includes(dur)}
                                    />
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {dur} min
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Buffer Between Meetings (min)</Label>
                        <Select name="bufferMinutes" defaultValue={formData.bufferMinutes.toString()}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="5">5 min</SelectItem>
                                <SelectItem value="10">10 min</SelectItem>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Minimum Lead Time</Label>
                        <Select name="minLeadTimeHours" defaultValue={formData.minLeadTimeHours.toString()}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 hours</SelectItem>
                                <SelectItem value="12">12 hours</SelectItem>
                                <SelectItem value="24">24 hours</SelectItem>
                                <SelectItem value="48">48 hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Daily Meeting Cap</Label>
                        <Input type="number" name="dailyCap" defaultValue={formData.dailyCap} min={1} required />
                    </div>

                    <div className="space-y-4 col-span-2 border-t pt-4">
                        <Label className="text-base font-semibold">Eligibility & Restrictions</Label>

                        <div className="space-y-2">
                            <Label className="mb-2 block">Eligible Degree Levels</Label>
                            <div className="flex gap-4">
                                {['UG', 'Grad', 'PhD'].map(degree => (
                                    <div key={degree} className="flex items-center space-x-2">
                                        <Checkbox
                                            name="eligibleDegreeLevels"
                                            value={degree}
                                            defaultChecked={formData.eligibleDegreeLevels.includes(degree)}
                                        />
                                        <label className="text-sm font-medium leading-none">
                                            {degree}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Eligible Countries (Comma separated)</Label>
                                <Input
                                    name="eligibleCountries"
                                    defaultValue={formData.eligibleCountries}
                                    placeholder="e.g. USA, Canada, UK"
                                />
                                <p className="text-xs text-muted-foreground">Leave empty for all countries</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Blackout Dates (YYYY-MM-DD, Comma separated)</Label>
                                <Input
                                    name="blackoutDates"
                                    defaultValue={formData.blackoutDates}
                                    placeholder="e.g. 2025-12-25, 2026-01-01"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>Set your working hours for each day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {days.map(day => {
                        const dayData = getDayData(day)
                        const isActive = !!dayData.id // if record exists, assume active (or check dayData.isActive)

                        return (
                            <div key={day} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="w-32 flex items-center gap-2">
                                    <Checkbox
                                        name={`${day}_active`}
                                        defaultChecked={isActive}
                                    />
                                    <span className="font-medium">{day}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        name={`${day}_start`}
                                        defaultValue={dayData.slotStartTime || "09:00"}
                                        className="w-32"
                                    />
                                    <span>to</span>
                                    <Input
                                        type="time"
                                        name={`${day}_end`}
                                        defaultValue={dayData.slotEndTime || "17:00"}
                                        className="w-32"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {message && (
                <div className={`p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Availability
                </Button>
            </div>
        </form>
    )
}
