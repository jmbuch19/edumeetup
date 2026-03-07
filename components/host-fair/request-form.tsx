'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { hostRequestSchema, HostRequestFormValues } from "@/lib/host-fair-schema"
import { submitHostRequest } from "@/app/actions/host-fair"
import { toast } from "sonner"
import { format } from "date-fns"
import { CalendarIcon, Loader2, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

const PREFERRED_COUNTRIES = ["USA", "UK", "Canada", "Australia", "New Zealand", "Europe (General)", "Ireland", "Germany", "France"]
const FIELDS_OF_STUDY = ["Engineering", "Business & Management", "Computer Science", "Data Science", "Health Sciences", "Arts & Humanities", "Law", "Social Sciences"]

export function HostFairRequestForm() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successRef, setSuccessRef] = useState<string | null>(null)

    const form = useForm<HostRequestFormValues>({
        resolver: zodResolver(hostRequestSchema),
        defaultValues: {
            preferredCountries: [],
            fieldsOfStudy: [],
            institutionType: undefined,
            expectedStudentCount: undefined,
        }
    })

    const { register, handleSubmit, control, setValue, watch, formState: { errors } } = form

    const preferredDateStart = watch("preferredDateStart")
    const preferredDateEnd = watch("preferredDateEnd")

    async function onSubmit(data: HostRequestFormValues) {
        setIsSubmitting(true)
        try {
            const result = await submitHostRequest(data)

            if (result.success && result.referenceNumber) {
                setSuccessRef(result.referenceNumber)
                toast.success("Request Submitted Successfully!")
                window.scrollTo({ top: 0, behavior: 'smooth' })
            } else {
                toast.error(result.message || "Failed to submit request")
                console.error(result.errors)
            }
        } catch (error) {
            toast.error("Something went wrong. Please try again.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Manual Array Handling for Checkboxes (since shadcn checkbox is controlled)
    const handleCheckboxChange = (field: "preferredCountries" | "fieldsOfStudy", value: string, checked: boolean) => {
        const current = form.getValues(field) || []
        if (checked) {
            setValue(field, [...current, value], { shouldValidate: true })
        } else {
            setValue(field, current.filter((item) => item !== value), { shouldValidate: true })
        }
    }

    if (successRef) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-green-100 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="mx-auto h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900">Request Received!</h2>
                <p className="text-slate-600 text-lg">
                    Thank you for your interest. We have received your request to host a campus fair.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 inline-block">
                    <p className="text-sm text-slate-500 mb-1">Your Reference Number</p>
                    <p className="text-2xl font-mono font-bold text-primary">{successRef}</p>
                </div>
                <p className="text-sm text-slate-500">
                    A confirmation email has been sent to your contact address. <br />
                    Our team will review your request within 48 hours.
                </p>
                <div className="pt-4">
                    <Button variant="outline" onClick={() => window.location.href = '/'}>Return Home</Button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10 max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-lg border border-slate-100">

            <div className="space-y-2 border-b border-slate-100 pb-6">
                <h2 className="text-2xl font-bold text-slate-900">Institution Details</h2>
                <p className="text-slate-500">Tell us about your organization.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="institutionName">Institution Name <span className="text-red-500">*</span></Label>
                    <Input id="institutionName" {...register("institutionName")} placeholder="e.g. Acme Institute of Technology" />
                    {errors.institutionName && <p className="text-sm text-red-500">{errors.institutionName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="institutionType">Institution Type <span className="text-red-500">*</span></Label>
                    <Select onValueChange={(val) => setValue("institutionType", val as any, { shouldValidate: true })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UNIVERSITY">University</SelectItem>
                            <SelectItem value="COLLEGE">College</SelectItem>
                            <SelectItem value="SCHOOL">School (K-12)</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.institutionType && <p className="text-sm text-red-500">{errors.institutionType.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input id="city" {...register("city")} placeholder="e.g. Mumbai" />
                    {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                    <Input id="state" {...register("state")} placeholder="e.g. Maharashtra" />
                    {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="websiteUrl">Website URL <span className="text-red-500">*</span></Label>
                    <Input id="websiteUrl" {...register("websiteUrl")} placeholder="https://..." />
                    {errors.websiteUrl && <p className="text-sm text-red-500">{errors.websiteUrl.message}</p>}
                </div>
            </div>

            <div className="space-y-2 border-b border-slate-100 pb-6 pt-4">
                <h2 className="text-2xl font-bold text-slate-900">Contact Person</h2>
                <p className="text-slate-500">Who should we coordinate with?</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="contactName">Full Name <span className="text-red-500">*</span></Label>
                    <Input id="contactName" {...register("contactName")} placeholder="e.g. Dr. Jane Doe" />
                    {errors.contactName && <p className="text-sm text-red-500">{errors.contactName.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contactDesignation">Designation <span className="text-red-500">*</span></Label>
                    <Input id="contactDesignation" {...register("contactDesignation")} placeholder="e.g. Head of Placement" />
                    {errors.contactDesignation && <p className="text-sm text-red-500">{errors.contactDesignation.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contactEmail">Official Email <span className="text-red-500">*</span></Label>
                    <Input id="contactEmail" {...register("contactEmail")} placeholder="name@university.edu.in" />
                    <p className="text-xs text-slate-500">Please verify this email via OTP later.</p>
                    {errors.contactEmail && <p className="text-sm text-red-500">{errors.contactEmail.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone Number <span className="text-red-500">*</span></Label>
                    <Input id="contactPhone" {...register("contactPhone")} placeholder="+91 98765 43210" />
                    {errors.contactPhone && <p className="text-sm text-red-500">{errors.contactPhone.message}</p>}
                </div>
            </div>

            <div className="space-y-2 border-b border-slate-100 pb-6 pt-4">
                <h2 className="text-2xl font-bold text-slate-900">Event Requirements</h2>
                <p className="text-slate-500">Tell us about your planned event.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Preferred Start Date <span className="text-red-500">*</span></Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !preferredDateStart && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {preferredDateStart ? format(preferredDateStart, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={preferredDateStart}
                                onSelect={(date) => setValue("preferredDateStart", date as Date, { shouldValidate: true })}
                                disabled={(date) => date < new Date()}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.preferredDateStart && <p className="text-sm text-red-500">{errors.preferredDateStart.message}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Preferred End Date <span className="text-red-500">*</span></Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !preferredDateEnd && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {preferredDateEnd ? format(preferredDateEnd, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={preferredDateEnd}
                                onSelect={(date) => setValue("preferredDateEnd", date as Date, { shouldValidate: true })}
                                disabled={(date) => date < (preferredDateStart || new Date())}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.preferredDateEnd && <p className="text-sm text-red-500">{errors.preferredDateEnd.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="expectedStudentCount">Expected Student Footfall <span className="text-red-500">*</span></Label>
                    <Select onValueChange={(val) => setValue("expectedStudentCount", val as any, { shouldValidate: true })}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="50-100">50 - 100 Students</SelectItem>
                            <SelectItem value="100-250">100 - 250 Students</SelectItem>
                            <SelectItem value="250-500">250 - 500 Students</SelectItem>
                            <SelectItem value="500+">500+ Students</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.expectedStudentCount && <p className="text-sm text-red-500">{errors.expectedStudentCount.message}</p>}
                </div>

                <div className="space-y-3 md:col-span-2">
                    <Label>Preferred Countries (Select all that apply) <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PREFERRED_COUNTRIES.map((country) => (
                            <div key={country} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`country-${country}`}
                                    onChange={(e) => handleCheckboxChange("preferredCountries", country, e.target.checked)}
                                />
                                <Label htmlFor={`country-${country}`} className="font-normal cursor-pointer">{country}</Label>
                            </div>
                        ))}
                    </div>
                    {errors.preferredCountries && <p className="text-sm text-red-500">{errors.preferredCountries.message}</p>}
                </div>

                <div className="space-y-3 md:col-span-2">
                    <Label>Fields of Study Focus (Select all that apply) <span className="text-red-500">*</span></Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {FIELDS_OF_STUDY.map((field) => (
                            <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`field-${field}`}
                                    onChange={(e) => handleCheckboxChange("fieldsOfStudy", field, e.target.checked)}
                                />
                                <Label htmlFor={`field-${field}`} className="font-normal cursor-pointer">{field}</Label>
                            </div>
                        ))}
                    </div>
                    {errors.fieldsOfStudy && <p className="text-sm text-red-500">{errors.fieldsOfStudy.message}</p>}
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="additionalRequirements">Additional Requirements / Notes</Label>
                    <Textarea
                        id="additionalRequirements"
                        {...register("additionalRequirements")}
                        placeholder="Any specific requests? E.g. Need universities with strong Engineering programs only."
                        className="h-32"
                    />
                </div>
            </div>

            <div className="pt-6">
                <Button type="submit" size="lg" className="w-full text-lg h-14" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Submitting Request...
                        </>
                    ) : (
                        "Submit Host Request"
                    )}
                </Button>
                <p className="text-center text-sm text-slate-500 mt-4">
                    By submitting, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </form>
    )
}
