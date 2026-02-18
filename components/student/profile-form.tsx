'use client'

import { useState } from 'react'
import { StudentProfile } from '@prisma/client'
import { DegreeLevels } from '@/lib/constants'

import { updateStudentProfile } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface ProfileFormProps {
    initialData: StudentProfile
    fieldCategories: string[]
}

export function ProfileForm({ initialData, fieldCategories }: ProfileFormProps) {
    const [loading, setLoading] = useState(false)

    // Helper to format enum keys to display text
    const formatEnum = (key: string) => key.replace(/_/g, ' ')

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        try {
            const result = await updateStudentProfile(formData)
            if (result?.error) {
                // Handle field errors if it's an object, or simple string
                if (typeof result.error === 'string') {
                    toast.error(result.error)
                } else {
                    // Check key by key or just generic
                    toast.error("Please check your inputs")
                }
            } else {
                toast.success("Profile updated successfully")
            }
        } catch {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit}>
            <div className="space-y-6">
                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>Your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="id_full_name">Full Name</Label>
                            <Input id="id_full_name" name="fullName" defaultValue={initialData.fullName} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id_country">Country of Residence <span className="text-red-500">*</span></Label>
                            <Input id="id_country" name="country" defaultValue={initialData.country || ''} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id_city">City <span className="text-red-500">*</span></Label>
                            <Input id="id_city" name="city" defaultValue={initialData.city || ''} required placeholder="e.g. Mumbai" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id_pincode">PIN Code <span className="text-red-500">*</span></Label>
                            <Input id="id_pincode" name="pincode" defaultValue={initialData.pincode || ''} required placeholder="e.g. 400001" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="id_phone">Phone Number</Label>
                            <Input id="id_phone" name="phoneNumber" defaultValue={initialData.phoneNumber || ''} placeholder="+1234567890" />
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

                {/* Academic Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle>Academic Preferences</CardTitle>
                        <CardDescription>Tell us what you are looking for.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="id_status">Current Status</Label>
                            <Select name="currentStatus" defaultValue={initialData.currentStatus || undefined}>
                                <SelectTrigger><SelectValue placeholder="Current Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Grade12">Grade 12</SelectItem>
                                    <SelectItem value="BachelorFinalYear">Bachelor&apos;s Final Year</SelectItem>
                                    <SelectItem value="BachelorCompleted">Bachelor&apos;s Completed</SelectItem>
                                    <SelectItem value="MasterCompleted">Master&apos;s Completed</SelectItem>
                                    <SelectItem value="WorkingProfessional">Working Professional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_field">Field of Interest</Label>
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
                            <Label htmlFor="id_degree">Preferred Degree</Label>
                            <Select name="preferredDegree" defaultValue={initialData.preferredDegree || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Degree" /></SelectTrigger>
                                <SelectContent>
                                    {DegreeLevels.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>
                                            {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_intake">Preferred Intake</Label>
                            <Select name="preferredIntake" defaultValue={initialData.preferredIntake || undefined}>
                                <SelectTrigger><SelectValue placeholder="Select Intake" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Fall 2025">Fall 2025</SelectItem>
                                    <SelectItem value="Spring 2026">Spring 2026</SelectItem>
                                    <SelectItem value="Summer 2026">Summer 2026</SelectItem>
                                    <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="id_budget">Budget Range (Annual)</Label>
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
                                placeholder="e.g. USA, UK, Canada (comma separated)"
                            />
                            <p className="text-xs text-muted-foreground">Separate multiple countries with commas.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* English Proficiency */}
                <Card>
                    <CardHeader>
                        <CardTitle>English Proficiency</CardTitle>
                        <CardDescription>Your test scores.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="id_eng_test">Test Type</Label>
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
                            <Label htmlFor="id_eng_score">Overall Score</Label>
                            <Input id="id_eng_score" name="englishScore" defaultValue={initialData.englishScore || ''} placeholder="e.g. 7.5 or 100" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Preferences
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </form>
    )
}
