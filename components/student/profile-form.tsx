'use client'

import { useState, useTransition } from 'react'
import { Student } from '@prisma/client'
import { DegreeLevels } from '@/lib/constants'
import { updateStudentProfile } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, History, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface ProfileData extends Student {
    phoneNumber?: string | null
}

interface ProfileFormProps {
    initialData: ProfileData
    fieldCategories: string[]
    logCount?: number
}

export function ProfileForm({ initialData, fieldCategories, logCount = 0 }: ProfileFormProps) {
    const [isPending, startTransition] = useTransition()

    const [greTaken, setGreTaken] = useState<boolean>(!!initialData.greScore)
    const [gmatTaken, setGmatTaken] = useState<boolean>(!!initialData.gmatScore)
    const [savedVersion, setSavedVersion] = useState<number | null>(null)

    const formatEnum = (key: string) => key.replace(/_/g, ' ')

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            const result = await updateStudentProfile(formData)
            if (result?.error) {
                toast.error(typeof result.error === 'string' ? result.error : "Please check your inputs")
            } else if (result?.success) {
                const count = result.changedCount ?? 0
                if (count === 0) {
                    toast.info("No changes detected")
                } else {
                    toast.success(`Profile updated to v${result.version} — ${count} field${count > 1 ? 's' : ''} changed`)
                    setSavedVersion(result.version ?? null)
                }
            }
        })
    }

    return (
        <form action={handleSubmit}>
            {/* Version badge + history link */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>
                        Profile <strong>v{savedVersion ?? initialData.profileVersion}</strong>
                        {' · '}
                        {logCount} saved version{logCount !== 1 ? 's' : ''}
                    </span>
                </div>
                <Link
                    href="/student/profile/history"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    <History className="h-4 w-4" />
                    View Change History
                </Link>
            </div>

            <div className="space-y-6">
                {/* ── Section 1: Basic Info ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Personal contact details and location.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="id_full_name">Full Name</Label>
                            <Input id="id_full_name" name="fullName" defaultValue={initialData.fullName || ''} required />
                        </div>

                        {/* Country — read-only */}
                        <div className="space-y-2">
                            <Label>Country of Residence</Label>
                            <div className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                                <span>🇮🇳</span><span>India</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_city">City <span className="text-red-500">*</span></Label>
                            <Input id="id_city" name="city" defaultValue={initialData.city || ''} required placeholder="e.g. Mumbai" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_pincode">PIN Code <span className="text-red-500">*</span></Label>
                            <Input id="id_pincode" name="pincode" defaultValue={initialData.pincode || ''} required placeholder="e.g. 400001" maxLength={10} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_phone">Phone Number</Label>
                            <Input id="id_phone" name="phone" defaultValue={initialData.phone || initialData.phoneNumber || ''} placeholder="+91 98765 43210" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_whatsapp">
                                WhatsApp Number <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                            </Label>
                            <div className="flex gap-2 items-center">
                                <span className="flex h-10 items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600">+91</span>
                                <Input id="id_whatsapp" name="whatsappNumber" type="tel" defaultValue={initialData.whatsappNumber || ''} placeholder="98765 43210" maxLength={15} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_gender">Gender <span className="text-red-500">*</span></Label>
                            <Select name="gender" defaultValue={initialData.gender || undefined} required>
                                <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_age">Age Group</Label>
                            <Select name="ageGroup" defaultValue={initialData.ageGroup || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Age Group" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Under 20">Under 20</SelectItem>
                                    <SelectItem value="21-25">21-25</SelectItem>
                                    <SelectItem value="26-30">26-30</SelectItem>
                                    <SelectItem value="31+">31+</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Section 2: Academic Preferences ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Preferences</CardTitle>
                        <CardDescription>What you are looking for in your studies abroad.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Current Education Status</Label>
                            <Select name="currentStatus" defaultValue={initialData.currentStatus || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Grade 12">12th Grade</SelectItem>
                                    <SelectItem value="Bachelor Final Year">Bachelor&apos;s Final Year</SelectItem>
                                    <SelectItem value="Bachelor Completed">Bachelor&apos;s Completed</SelectItem>
                                    <SelectItem value="Master Completed">Master&apos;s Completed</SelectItem>
                                    <SelectItem value="Working Professional">Working Professional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Field of Interest</Label>
                            <Select name="fieldOfInterest" defaultValue={initialData.fieldOfInterest || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Field" /></SelectTrigger>
                                <SelectContent>
                                    {fieldCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{formatEnum(cat)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Preferred Degree Level</Label>
                            <Select name="preferredDegree" defaultValue={initialData.preferredDegree || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Degree" /></SelectTrigger>
                                <SelectContent>
                                    {DegreeLevels.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Preferred Intake</Label>
                            <Select name="preferredIntake" defaultValue={initialData.preferredIntake || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Intake" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                                    <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                                    <SelectItem value="Summer 2026">Summer 2026</SelectItem>
                                    <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                                    <SelectItem value="Spring 2027">Spring 2027</SelectItem>
                                    <SelectItem value="Fall 2027">Fall 2027</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Budget Range (Annual)</Label>
                            <Select name="budgetRange" defaultValue={initialData.budgetRange || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Budget" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="< 15,000">&lt; $15,000</SelectItem>
                                    <SelectItem value="15,000-25,000">$15,000 - $25,000</SelectItem>
                                    <SelectItem value="25,000-40,000">$25,000 - $40,000</SelectItem>
                                    <SelectItem value="40,000+">$40,000+</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_pref_countries">Preferred Countries</Label>
                            <Input
                                id="id_pref_countries"
                                name="preferredCountries"
                                defaultValue={initialData.preferredCountries || ''}
                                placeholder="e.g. USA, UK, Canada"
                            />
                            <p className="text-xs text-muted-foreground">Comma-separated</p>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Section 3: Test Scores ── */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Scores</CardTitle>
                        <CardDescription>Update whenever you retake or get new scores. These are visible to advisors and universities.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        {/* English */}
                        <div className="space-y-2">
                            <Label>English Proficiency Test</Label>
                            <Select name="englishTestType" defaultValue={initialData.englishTestType || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Test" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IELTS">IELTS</SelectItem>
                                    <SelectItem value="TOEFL">TOEFL</SelectItem>
                                    <SelectItem value="Duolingo">Duolingo</SelectItem>
                                    <SelectItem value="PTE">PTE</SelectItem>
                                    <SelectItem value="Not Taken Yet">Not Taken Yet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_eng_score">English Score</Label>
                            <Input id="id_eng_score" name="englishScore" defaultValue={initialData.englishScore || ''} placeholder="e.g. 7.5 or 105" />
                        </div>

                        {/* GRE */}
                        <div className="space-y-2 col-span-full">
                            <Label>GRE</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="greTakenUI"
                                        value="yes"
                                        checked={greTaken}
                                        onChange={() => setGreTaken(true)}
                                        className="accent-primary"
                                    />
                                    Yes, I have taken GRE
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="greTakenUI"
                                        value="no"
                                        checked={!greTaken}
                                        onChange={() => { setGreTaken(false) }}
                                        className="accent-primary"
                                    />
                                    Not taken / Not applicable
                                </label>
                            </div>
                            {greTaken && (
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="id_gre_score">GRE Score</Label>
                                        <Input id="id_gre_score" name="greScore" type="number" min={260} max={340}
                                            defaultValue={initialData.greScore || ''} placeholder="e.g. 320" />
                                    </div>
                                </div>
                            )}
                            {!greTaken && <input type="hidden" name="greScore" value="" />}
                        </div>

                        {/* GMAT */}
                        <div className="space-y-2 col-span-full">
                            <Label>GMAT</Label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gmatTakenUI"
                                        value="yes"
                                        checked={gmatTaken}
                                        onChange={() => setGmatTaken(true)}
                                        className="accent-primary"
                                    />
                                    Yes, I have taken GMAT
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="gmatTakenUI"
                                        value="no"
                                        checked={!gmatTaken}
                                        onChange={() => { setGmatTaken(false) }}
                                        className="accent-primary"
                                    />
                                    Not taken / Not applicable
                                </label>
                            </div>
                            {gmatTaken && (
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="id_gmat_score">GMAT Score</Label>
                                        <Input id="id_gmat_score" name="gmatScore" type="number" min={200} max={800}
                                            defaultValue={initialData.gmatScore || ''} placeholder="e.g. 680" />
                                    </div>
                                </div>
                            )}
                            {!gmatTaken && <input type="hidden" name="gmatScore" value="" />}
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col items-end gap-2">
                        <p className="text-xs text-muted-foreground self-start">
                            💡 Each save is logged with a timestamp. Universities and advisors always see your latest version.
                        </p>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Profile
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </form>
    )
}
