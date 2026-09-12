'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { AvailabilityProfileData, saveAllAvailabilityProfiles } from '@/app/university/availability/actions'
import { DaysOfWeek, MeetingDurations, VideoProviders } from '@/lib/constants'
import { AvailabilityProfile, DayOfWeek } from '@prisma/client'
import { Loader2 } from 'lucide-react'

const COMMON_TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'Asia/Kolkata',
    'Europe/London',
]

function isValidTimezone(timezone: string) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone })
        return true
    } catch {
        return false
    }
}

const createDefaultProfile = (day: DayOfWeek): AvailabilityProfileData => ({
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '17:00',
    isActive: false,
    meetingDurationOptions: [15],
    bufferMinutes: 10,
    minLeadTimeHours: 12,
    dailyCap: 8,
    videoProvider: 'GOOGLE_MEET',
    eligibleDegreeLevels: ['Grad'],
    eligibleCountries: [],
    timezone: 'UTC',
})

export default function AvailabilityForm({
    initialAvailability = []
}: {
    initialAvailability: AvailabilityProfile[]
}) {
    const [isLoading, setIsLoading] = useState(false)
    const [profiles, setProfiles] = useState<AvailabilityProfileData[]>(() => {
        return DaysOfWeek.map(dayObj => {
            const existing = initialAvailability.find(p => p.dayOfWeek === dayObj.value)
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
                    eligibleCountries: existing.eligibleCountries,
                    timezone: existing.timezone ?? 'UTC',
                }
            }
            return createDefaultProfile(dayObj.value as DayOfWeek)
        })
    })

    const handleProfileChange = <K extends keyof AvailabilityProfileData>(
        day: DayOfWeek,
        field: K,
        value: AvailabilityProfileData[K]
    ) => {
        setProfiles(prev => prev.map(p =>
            p.dayOfWeek === day ? { ...p, [field]: value } : p
        ))
    }

    const setAll = <K extends keyof AvailabilityProfileData>(
        field: K,
        value: AvailabilityProfileData[K],
        notify = false
    ) => {
        setProfiles(prev => prev.map(p => ({ ...p, [field]: value })))
        if (notify) toast.success('Applied to all days')
    }

    async function onSubmit() {
        const timezone = profiles[0]?.timezone || 'UTC'
        if (!isValidTimezone(timezone)) {
            toast.error('Please enter a valid IANA timezone, for example America/New_York')
            return
        }
        if (profiles.some(profile => profile.meetingDurationOptions.length === 0)) {
            toast.error('Select at least one meeting duration')
            return
        }

        setIsLoading(true)
        const res = await saveAllAvailabilityProfiles(profiles)
        setIsLoading(false)

        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Availability saved successfully!')
        }
    }

    const global = profiles[0]

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
                    <div key={profile.dayOfWeek} className={`rounded-lg border p-4 ${profile.isActive ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                        <div className="flex flex-wrap items-center gap-4">
                            <Switch
                                checked={profile.isActive}
                                onChange={(e) => handleProfileChange(profile.dayOfWeek, 'isActive', e.target.checked)}
                            />
                            <span className="w-24 font-medium">{DaysOfWeek.find(d => d.value === profile.dayOfWeek)?.label || ''}</span>

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
                    </div>
                ))}
            </div>

            {global && (
                <div className="space-y-6 rounded-xl border border-slate-200 bg-slate-50 p-6">
                    <div>
                        <h3 className="text-lg font-semibold">Global Settings</h3>
                        <p className="mt-1 text-sm text-slate-500">These settings apply to every day in this representative&apos;s schedule.</p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="availability-timezone" className="text-sm font-medium">Scheduling timezone</label>
                            <Input
                                id="availability-timezone"
                                list="availability-timezones"
                                value={global.timezone}
                                onChange={(e) => setAll('timezone', e.target.value)}
                                placeholder="America/New_York"
                                aria-invalid={!isValidTimezone(global.timezone)}
                            />
                            <datalist id="availability-timezones">
                                {COMMON_TIMEZONES.map(timezone => <option key={timezone} value={timezone} />)}
                            </datalist>
                            <p className="text-xs text-slate-500">
                                Use an IANA timezone. Weekly hours and student-facing slots are generated in this timezone.
                            </p>
                            {!isValidTimezone(global.timezone) && (
                                <p className="text-xs text-red-600">Enter a valid timezone such as America/New_York.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Meeting Duration</label>
                            <div className="flex flex-wrap gap-4">
                                {MeetingDurations.map(duration => (
                                    <div key={duration} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`dur-${duration}`}
                                            checked={global.meetingDurationOptions.includes(duration)}
                                            onChange={(e) => {
                                                const current = global.meetingDurationOptions
                                                if (!e.target.checked && current.length === 1) {
                                                    toast.error('At least one meeting duration is required')
                                                    return
                                                }
                                                const next = e.target.checked
                                                    ? Array.from(new Set([...current, duration]))
                                                    : current.filter(d => d !== duration)
                                                setAll('meetingDurationOptions', next)
                                            }}
                                        />
                                        <label htmlFor={`dur-${duration}`}>{duration} min</label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Video Provider</label>
                            <Select
                                value={global.videoProvider}
                                onValueChange={(value) => setAll('videoProvider', value as AvailabilityProfileData['videoProvider'], true)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {VideoProviders.map(provider => (
                                        <SelectItem key={provider.value} value={provider.value}>{provider.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {global.videoProvider === 'EXTERNAL_LINK' && (
                                <Input
                                    placeholder="Paste your meeting link here..."
                                    value={global.externalLink || ''}
                                    onChange={(e) => setAll('externalLink', e.target.value)}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Daily Meeting Cap</label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={global.dailyCap}
                                onChange={(e) => setAll('dailyCap', Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                                className="w-28"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Minimum Lead Time</label>
                            <Select
                                value={String(global.minLeadTimeHours)}
                                onValueChange={(value) => setAll('minLeadTimeHours', Number(value), true)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="6">6 Hours</SelectItem>
                                    <SelectItem value="12">12 Hours</SelectItem>
                                    <SelectItem value="24">24 Hours</SelectItem>
                                    <SelectItem value="48">48 Hours</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Buffer Between Meetings</label>
                            <Select
                                value={String(global.bufferMinutes)}
                                onValueChange={(value) => setAll('bufferMinutes', Number(value), true)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">No buffer</SelectItem>
                                    <SelectItem value="5">5 Minutes</SelectItem>
                                    <SelectItem value="10">10 Minutes</SelectItem>
                                    <SelectItem value="15">15 Minutes</SelectItem>
                                    <SelectItem value="30">30 Minutes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
