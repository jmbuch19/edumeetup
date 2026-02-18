'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateUniversitySettings } from './actions'
// import { useToast } from '@/hooks/use-toast' // Removed as it likely doesn't exist

import ImageUpload from '@/components/ui/image-upload'

export default function SettingsForm({ settings }: { settings: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState(settings?.logo || '')
    const [brandColor, setBrandColor] = useState(settings?.brandColor || '')

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        const res = await updateUniversitySettings(formData)
        setIsLoading(false)

        if (res.error) {
            alert(res.error)
        } else {
            alert('Settings updated successfully')
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Public Profile</CardTitle>
                    <CardDescription>How students see your university.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="institutionName">Institution Name</Label>
                        <Input id="institutionName" defaultValue={settings?.institutionName} disabled />
                        <p className="text-xs text-muted-foreground">Contact support to change your verified name.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="website">Website</Label>
                        <Input id="website" name="website" defaultValue={settings?.website || ''} placeholder="https://..." />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="contactEmail">Public Contact Email</Label>
                        <Input id="contactEmail" name="contactEmail" defaultValue={settings?.contactEmail || ''} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="logo">University Logo</Label>
                        <Input type="hidden" name="logo" value={logoUrl} />
                        <Input type="hidden" name="brandColor" value={brandColor} />
                        <ImageUpload
                            value={logoUrl ? [logoUrl] : []}
                            onChange={(url, colors) => {
                                setLogoUrl(url)
                                if (colors && colors.length > 0) setBrandColor(colors[0])
                            }}
                            onRemove={() => {
                                setLogoUrl('')
                                setBrandColor('')
                            }}
                        />
                        {brandColor && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: brandColor }} />
                                <span>Detected Brand Color: {brandColor}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" name="description" defaultValue={settings?.description || ''} rows={4} />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch id="isPublic" name="isPublic" defaultChecked={settings?.isPublic ?? true} />
                        <Label htmlFor="isPublic">Publicly Listed</Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Meeting Rules</CardTitle>
                    <CardDescription>Control how students can book meetings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="defaultDuration">Default Duration (Minutes)</Label>
                        <Input id="defaultDuration" name="defaultDuration" type="number" defaultValue={settings?.defaultDuration || 30} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dailyCapPerRep">Daily Cap Per Rep (Meetings)</Label>
                        <Input id="dailyCapPerRep" name="dailyCapPerRep" type="number" defaultValue={settings?.dailyCapPerRep || 8} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="minLeadTimeHours">Minimum Lead Time (Hours)</Label>
                        <Input id="minLeadTimeHours" name="minLeadTimeHours" type="number" defaultValue={settings?.minLeadTimeHours || 12} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bufferMinutes">Buffer Between Meetings (Minutes)</Label>
                        <Input id="bufferMinutes" name="bufferMinutes" type="number" defaultValue={settings?.bufferMinutes || 15} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cancellationWindowHours">Cancellation Window (Hours)</Label>
                        <Input id="cancellationWindowHours" name="cancellationWindowHours" type="number" defaultValue={settings?.cancellationWindowHours || 24} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="approvalMode">Approval Mode</Label>
                        <select
                            id="approvalMode"
                            name="approvalMode"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={settings?.approvalMode || 'MANUAL'}
                        >
                            <option value="MANUAL">Manual Approval</option>
                            <option value="AUTOMATIC">Automatic Approval</option>
                        </select>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    )
}
