'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { AvailabilityProfileData, saveAllAvailabilityProfiles } from '@/app/university/availability/actions'
import { DaysOfWeek, MeetingDurations, VideoProviders, DegreeLevels } from '@/lib/constants'
import { AvailabilityProfile, DayOfWeek, VideoProvider } from '@prisma/client'
import { Loader2, Plus, Trash2 } from 'lucide-react'

// Helper to get default profile structure
const createDefaultProfile = (day: DayOfWeek): AvailabilityProfileData => ({
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '17:00',
    isActive: false, // Default to inactive
    meetingDurationOptions: [15],
    bufferMinutes: 10,
    minLeadTimeHours: 12,
    dailyCap: 8,
    videoProvider: 'GOOGLE_MEET',
    eligibleDegreeLevels: ['Grad'],
    eligibleCountries: []
})

interface AvailabilityFormProps {
    initialProfiles: AvailabilityProfile[]
}

export default function AvailabilityForm({ initialProfiles }: AvailabilityFormProps) {
    const [isLoading, setIsLoading] = useState(false)

    // Initialize state merging existing profiles with defaults for all days
    const [profiles, setProfiles] = useState<AvailabilityProfileData[]>(() => {
        return DaysOfWeek.map(dayObj => {
            const existing = initialProfiles.find(p => p.dayOfWeek === dayObj.value)
            // If existing, map to data structure (handling optional fields)
            if (existing) {
                return {
                    dayOfWeek: existing.dayOfWeek,
                    startTime: existing.startTime,
                    endTime: existing.endTime,
                    isActive: existing.isActive,
                    meetingDurationOptions: existing.meetingDurationOptions,
                    bufferMinutes: existing.bufferMinutes,
                    minLeadTimeHours: existing.minLeadTimeHours,
                    dailyCap: existing.dailyCap,
                    videoProvider: existing.videoProvider,
                    externalLink: existing.externalLink || undefined,
                    eligibleDegreeLevels: existing.eligibleDegreeLevels,
                    eligibleCountries: existing.eligibleCountries
                }
            }
            return createDefaultProfile(dayObj.value as DayOfWeek)
        })
    })

    const handleProfileChange = (day: DayOfWeek, field: keyof AvailabilityProfileData, value: any) => {
        setProfiles(prev => prev.map(p =>
            p.dayOfWeek === day ? { ...p, [field]: value } : p
        ))
    }

    // Global setters (apply to all active days)
    const applyToAll = (field: keyof AvailabilityProfileData, value: any) => {
        setProfiles(prev => prev.map(p => ({ ...p, [field]: value })))
        toast.success(`Applied to all days`)
    }

    async function onSubmit() {
        setIsLoading(true)
        // Filter to only send active profiles? 
        // No, we should send all state so we know which are active/inactive (inactive ones will be saved as inactive)
        const res = await saveAllAvailabilityProfiles(profiles)
        setIsLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Availability saved successfully!")
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Weekly Schedule</h2>
                <Button onClick={onSubmit} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-6">
                {profiles.map((profile) => (
                    <div key={profile.dayOfWeek} className={`p-4 rounded-lg border ${profile.isActive ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                        <div className="flex items-center gap-4 mb-4">
                            <Switch
                                checked={profile.isActive}
                                onCheckedChange={(checked) => handleProfileChange(profile.dayOfWeek, 'isActive', checked)}
                            />
                            <span className="font-medium w-24">{DaysOfWeek.find(d => d.value === profile.dayOfWeek)?.label}</span>

                            {profile.isActive && (
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="time"
                                        value={profile.startTime}
                                        onChange={(e) => handleProfileChange(profile.dayOfWeek, 'startTime', e.target.value)}
                                        className="w-32"
                                    />
                                    <span>to</span>
                                    <Input
                                        type="time"
                                        value={profile.endTime}
                                        onChange={(e) => handleProfileChange(profile.dayOfWeek, 'endTime', e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                            )}
                        </div>

                        {profile.isActive && (
                            <div className="pl-14 grid md:grid-cols-2 gap-4 text-sm text-slate-600">
                                {/* Configuration per day (optional, could be global) */}
                                {/* For MVP, let's keep it simple. Only show simple slots here. */}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-6">
                <h3 className="font-semibold text-lg">Global Settings</h3>
                <p className="text-sm text-slate-500">These settings apply to all your available slots.</p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-sm font-medium">Meeting Duration</label>
                        <div className="flex gap-4">
                            {MeetingDurations.map(duration => (
                                <div key={duration} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`dur-${duration}`}
                                        checked={profiles[0].meetingDurationOptions.includes(duration)}
                                        onCheckedChange={(checked) => {
                                            const current = profiles[0].meetingDurationOptions
                                            const newVal = checked
                                                ? [...current, duration]
                                                : current.filter(d => d !== duration)
                                            applyToAll('meetingDurationOptions', newVal)
                                        }}
                                    />
                                    <label htmlFor={`dur-${duration}`}>{duration} min</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium">Video Provider</label>
                        <Select
                            value={profiles[0].videoProvider}
                            onValueChange={(val) => applyToAll('videoProvider', val)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {VideoProviders.map(p => (
                                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {profiles[0].videoProvider === 'EXTERNAL_LINK' && (
                            <Input
                                placeholder="Paste your meeting link here..."
                                value={profiles[0].externalLink || ''}
                                onChange={(e) => applyToAll('externalLink', e.target.value)}
                            />
                        )}
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium">Daily Meeting Cap</label>
                        <Input
                            type="number"
                            value={profiles[0].dailyCap}
                            onChange={(e) => applyToAll('dailyCap', parseInt(e.target.value) || 8)}
                            className="w-24"
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-medium">Minimum Lead Time (Hours)</label>
                        <Select
                            value={String(profiles[0].minLeadTimeHours)}
                            onValueChange={(val) => applyToAll('minLeadTimeHours', parseInt(val))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 Hours</SelectItem>
                                <SelectItem value="12">12 Hours</SelectItem>
                                <SelectItem value="24">24 Hours</SelectItem>
                                <SelectItem value="48">48 Hours</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}
