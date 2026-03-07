'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { updateUniversitySettings } from './actions'
import { updateUniversityLogo, removeUniversityLogo } from './logo-actions'
import { toast } from 'sonner'
import { RefreshCw, Trash2, ImagePlus, Loader2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

export default function SettingsForm({ settings }: { settings: any }) {
    const [isLoading, setIsLoading] = useState(false)
    const [logoUrl, setLogoUrl] = useState<string>(settings?.logo || '')
    const [brandColor, setBrandColor] = useState(settings?.brandColor || '')
    const [logoChanging, setLogoChanging] = useState(false)
    const [logoRemoving, setLogoRemoving] = useState(false)
    const [logoConfirmOpen, setLogoConfirmOpen] = useState(false)
    const logoInputRef = useRef<HTMLInputElement>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        const res = await updateUniversitySettings(formData)
        setIsLoading(false)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success('Settings saved successfully.')
        }
    }

    async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.currentTarget.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return }
        if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB.'); return }

        setLogoChanging(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return }

            const result = await updateUniversityLogo(data.url)
            if (!result.ok) { toast.error(result.error); return }

            setLogoUrl(data.url)
            toast.success(logoUrl ? 'Logo updated!' : 'Logo uploaded!')
        } catch {
            toast.error('Upload failed — try again')
        } finally {
            setLogoChanging(false)
        }
    }

    async function handleLogoRemove() {
        setLogoConfirmOpen(false)
        setLogoRemoving(true)
        const result = await removeUniversityLogo()
        if (result.ok) {
            setLogoUrl('')
            setBrandColor('')
            toast.success('Logo removed')
        } else {
            toast.error(result.error)
        }
        setLogoRemoving(false)
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
                        <p className="text-xs text-muted-foreground">Contact support to change your official institution name.</p>
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
                        <Label>University Logo</Label>
                        <Input type="hidden" name="logo" value={logoUrl} />
                        <Input type="hidden" name="brandColor" value={brandColor} />

                        {logoUrl ? (
                            <>
                                {/* Logo preview + actions */}
                                <div className="flex items-center gap-4">
                                    <div className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                        <Image src={logoUrl} alt="University logo" fill className="object-contain p-1" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {/* Change Logo */}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={logoChanging || logoRemoving}
                                            onClick={() => logoInputRef.current?.click()}
                                            className="flex items-center gap-1.5 border-teal-500 text-teal-700 hover:bg-teal-50 w-fit"
                                        >
                                            {logoChanging
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <RefreshCw className="h-3.5 w-3.5" />}
                                            Change Logo
                                        </Button>
                                        {/* Remove Logo */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={logoChanging || logoRemoving}
                                            onClick={() => setLogoConfirmOpen(true)}
                                            className="flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 w-fit"
                                        >
                                            {logoRemoving
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />}
                                            Remove Logo
                                        </Button>
                                    </div>
                                </div>

                                {/* Inline confirm banner */}
                                {logoConfirmOpen && (
                                    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-red-800">Remove logo?</p>
                                            <p className="text-xs text-red-600 mt-0.5">Your university profile will show no logo until you upload a new one.</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setLogoConfirmOpen(false)}
                                                className="text-xs text-red-500 hover:text-red-700 underline underline-offset-2"
                                            >
                                                Cancel
                                            </button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={logoRemoving}
                                                onClick={handleLogoRemove}
                                                className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs"
                                            >
                                                {logoRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            /* No logo — upload prompt */
                            <div
                                onClick={() => !logoChanging && logoInputRef.current?.click()}
                                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-6 text-center transition-colors border-gray-300 hover:border-primary hover:bg-gray-50 ${logoChanging ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                {logoChanging ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                        <p className="text-sm text-gray-600">Uploading…</p>
                                    </div>
                                ) : (
                                    <>
                                        <ImagePlus className="mx-auto h-7 w-7 mb-2 text-gray-400" />
                                        <p className="text-sm font-medium text-gray-700">Upload Logo — click to browse</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG, WebP · max 2 MB</p>
                                    </>
                                )}
                            </div>
                        )}

                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoChange}
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
                        <Input id="defaultDuration" name="defaultDuration" type="number" min={15} max={240} defaultValue={settings?.defaultDuration || 30} />
                        <p className="text-xs text-muted-foreground">Between 15 and 240 minutes.</p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="dailyCapPerRep">Daily Cap Per Rep (Meetings)</Label>
                        <Input id="dailyCapPerRep" name="dailyCapPerRep" type="number" min={1} max={50} defaultValue={settings?.dailyCapPerRep || 8} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="minLeadTimeHours">Minimum Lead Time (Hours)</Label>
                        <Input id="minLeadTimeHours" name="minLeadTimeHours" type="number" min={0} max={168} defaultValue={settings?.minLeadTimeHours || 12} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="bufferMinutes">Buffer Between Meetings (Minutes)</Label>
                        <Input id="bufferMinutes" name="bufferMinutes" type="number" min={0} max={120} defaultValue={settings?.bufferMinutes || 15} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cancellationWindowHours">Cancellation Window (Hours)</Label>
                        <Input id="cancellationWindowHours" name="cancellationWindowHours" type="number" min={0} max={168} defaultValue={settings?.cancellationWindowHours || 24} />
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
