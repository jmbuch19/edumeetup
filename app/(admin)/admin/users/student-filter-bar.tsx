'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Bell } from 'lucide-react'
import { notifyFilteredStudents } from './actions'
import { toast } from 'sonner'
import { useState, useTransition } from 'react'

const QUICK_MESSAGES = [
    {
        id: 'profile',
        label: '📋 Complete your profile',
        title: '🔔 Your profile needs attention',
        message: 'Hey! We noticed your profile is incomplete. Please fill in the missing details so universities can discover and connect with you better.'
    },
    {
        id: 'advisory',
        label: '🎓 Schedule advisory session',
        title: '🎓 Have you tried an Advisory Session?',
        message: 'Hey! We feel you haven\'t taken an advisory session yet. A quick chat with our adviser can help you find the right university and programme. Please check and schedule!'
    },
    {
        id: 'interests',
        label: '🔍 Explore universities',
        title: '🌍 Discover Universities on EdUmeetup',
        message: 'Hey! Many top universities are looking for students like you. Browse our listings and express interest to start your study-abroad journey today.'
    },
    {
        id: 'cv',
        label: '📄 Upload your CV',
        title: '📄 Strengthen your profile — add your CV',
        message: 'Hey! Universities love seeing a CV. Upload yours to stand out and improve your chances of getting matched with the right programme.'
    },
]

interface StudentFilterBarProps {
    totalCount: number
    filteredStudentIds: string[]
    currentFilters: Record<string, string>
}

export function StudentFilterBar({ totalCount, filteredStudentIds, currentFilters }: StudentFilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    const [notifyMode, setNotifyMode] = useState(false)
    const [selectedMsg, setSelectedMsg] = useState(QUICK_MESSAGES[0].id)
    const [customTitle, setCustomTitle] = useState('')
    const [customMessage, setCustomMessage] = useState('')

    const setFilter = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'ALL') params.delete(key)
        else params.set(key, value)
        router.push(`${pathname}?${params.toString()}`)
    }, [router, pathname, searchParams])

    function resetFilters() {
        router.push(pathname)
    }

    const hasFilters = Object.values(currentFilters).some(Boolean)
    const showNotify = currentFilters.role === 'STUDENT' && filteredStudentIds.length > 0

    async function handleSendNotification() {
        const msg = QUICK_MESSAGES.find(m => m.id === selectedMsg)
        const title = selectedMsg === 'custom' ? customTitle : msg?.title ?? ''
        const message = selectedMsg === 'custom' ? customMessage : msg?.message ?? ''

        if (!title || !message) { toast.error('Please fill title and message'); return }

        startTransition(async () => {
            const res = await notifyFilteredStudents(filteredStudentIds, title, message)
            if ('error' in res && res.error) toast.error(res.error)
            else {
                toast.success(`Notification sent to ${res.count} student${(res.count ?? 0) > 1 ? 's' : ''}`)
                setNotifyMode(false)
            }
        })
    }

    return (
        <div className="space-y-3">
            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-3">
                <FilterSelect label="Role" paramKey="role" value={currentFilters.role || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'All Roles'], ['STUDENT', 'Student'], ['UNIVERSITY', 'University'], ['ADMIN', 'Admin']]} />
                <FilterSelect label="Profile" paramKey="profile" value={currentFilters.profile || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any Profile'], ['COMPLETE', '✅ Complete'], ['INCOMPLETE', '⚠️ Incomplete']]} />
                <FilterSelect label="CV" paramKey="cv" value={currentFilters.cv || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any CV'], ['UPLOADED', '📄 CV Uploaded'], ['MISSING', '❌ No CV']]} />
                <FilterSelect label="Interests" paramKey="interests" value={currentFilters.interests || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any Interests'], ['HAS', '⭐ Has Interests'], ['NONE', '— No Interests']]} />
                <FilterSelect label="Advisory" paramKey="advisory" value={currentFilters.advisory || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any Advisory'], ['HAS', '🎓 Has Request'], ['NONE', '— No Request']]} />
                <FilterSelect label="Status" paramKey="status" value={currentFilters.status || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any Status'], ['ACTIVE', '✅ Active'], ['INACTIVE', '🚫 Inactive']]} />
                <FilterSelect label="English Test" paramKey="english" value={currentFilters.english || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any Test'], ['TAKEN', '✅ Test Taken'], ['NOT_TAKEN', '— Not Taken']]} />
                <FilterSelect label="GRE" paramKey="gre" value={currentFilters.gre || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any'], ['TAKEN', '✅ GRE Taken'], ['NOT_TAKEN', '— No GRE']]} />
                <FilterSelect label="GMAT" paramKey="gmat" value={currentFilters.gmat || 'ALL'} setFilter={setFilter}
                    options={[['ALL', 'Any'], ['TAKEN', '✅ GMAT Taken'], ['NOT_TAKEN', '— No GMAT']]} />

                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground h-9">
                        <X className="h-3.5 w-3.5" /> Reset
                    </Button>
                )}
            </div>

            {/* Results bar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                    Showing <strong>{totalCount}</strong> {hasFilters ? 'matching' : 'total'} user{totalCount !== 1 ? 's' : ''}
                    {filteredStudentIds.length > 0 && currentFilters.role === 'STUDENT' && ` (${filteredStudentIds.length} student${filteredStudentIds.length !== 1 ? 's' : ''})`}
                </p>

                {showNotify && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => setNotifyMode(!notifyMode)}
                    >
                        <Bell className="h-3.5 w-3.5" />
                        Notify {filteredStudentIds.length} Student{filteredStudentIds.length !== 1 ? 's' : ''}
                    </Button>
                )}
            </div>

            {/* Notification panel */}
            {notifyMode && showNotify && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
                    <p className="text-sm font-semibold text-indigo-800">
                        📣 Send Targeted Notification — {filteredStudentIds.length} student{filteredStudentIds.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_MESSAGES.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setSelectedMsg(m.id)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedMsg === m.id
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                    }`}
                            >
                                {m.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedMsg('custom')}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedMsg === 'custom'
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                                }`}
                        >
                            ✏️ Custom
                        </button>
                    </div>

                    {selectedMsg !== 'custom' && (
                        <p className="text-xs text-indigo-700 bg-white rounded-lg border border-indigo-100 px-3 py-2 leading-relaxed">
                            {QUICK_MESSAGES.find(m => m.id === selectedMsg)?.message}
                        </p>
                    )}

                    {selectedMsg === 'custom' && (
                        <div className="space-y-2">
                            <input
                                className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white"
                                placeholder="Notification title..."
                                value={customTitle}
                                onChange={e => setCustomTitle(e.target.value)}
                            />
                            <textarea
                                className="w-full text-sm border border-indigo-200 rounded-lg px-3 py-2 bg-white resize-none"
                                rows={3}
                                placeholder="Notification message..."
                                value={customMessage}
                                onChange={e => setCustomMessage(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button size="sm" disabled={isPending} onClick={handleSendNotification}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {isPending ? 'Sending...' : `Send to ${filteredStudentIds.length} Student${filteredStudentIds.length !== 1 ? 's' : ''}`}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setNotifyMode(false)}>Cancel</Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function FilterSelect({ label, paramKey, value, setFilter, options }: {
    label: string
    paramKey: string
    value: string
    setFilter: (key: string, value: string) => void
    options: [string, string][]
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{label}:</span>
            <Select value={value} onValueChange={(v) => setFilter(paramKey, v)}>
                <SelectTrigger className="h-8 text-xs min-w-[120px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map(([val, label]) => (
                        <SelectItem key={val} value={val} className="text-xs">{label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
