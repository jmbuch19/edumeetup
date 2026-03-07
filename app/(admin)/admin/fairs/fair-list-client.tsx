'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFairEvent, type FairEventRow } from './actions'
import { Plus, QrCode, BarChart2, Loader2, X, Calendar, MapPin } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
    UPCOMING: 'bg-blue-50 text-blue-700 border-blue-200',
    LIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-red-50 text-red-600 border-red-200',
}

// ── Create dialog ─────────────────────────────────────────────────────────────
function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
    const [pending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [form, setForm] = useState({
        name: '', slug: '', city: '', venue: '', country: '',
        startDate: '', endDate: '', capacity: '',
    })

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(f => ({ ...f, [k]: e.target.value }))
        // Auto-generate slug from name
        if (k === 'name') {
            setForm(f => ({
                ...f,
                name: e.target.value,
                slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            }))
        }
    }

    const handleCreate = () => {
        setError(null)
        startTransition(async () => {
            const result = await createFairEvent(form)
            if (!result.ok) { setError(result.error); return }
            onCreated(result.id)
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Create Fair Event</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1.5">
                        <Label>Event Name <span className="text-red-500">*</span></Label>
                        <Input value={form.name} onChange={set('name')} placeholder="EdUmeetup Mumbai Fair 2026" className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                        <Label>Slug <span className="text-red-500">*</span></Label>
                        <Input value={form.slug} onChange={set('slug')} placeholder="mumbai-2026" className="rounded-xl font-mono text-sm" />
                        <p className="text-xs text-gray-400">URL: /fair?eventId=… (auto-generated, editable)</p>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Start Date <span className="text-red-500">*</span></Label>
                        <Input type="date" value={form.startDate} onChange={set('startDate')} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>End Date <span className="text-red-500">*</span></Label>
                        <Input type="date" value={form.endDate} onChange={set('endDate')} className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>City</Label>
                        <Input value={form.city} onChange={set('city')} placeholder="Mumbai" className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Country</Label>
                        <Input value={form.country} onChange={set('country')} placeholder="India" className="rounded-xl" />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                        <Label>Venue</Label>
                        <Input value={form.venue} onChange={set('venue')} placeholder="NESCO Convention Centre" className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Capacity</Label>
                        <Input type="number" value={form.capacity} onChange={set('capacity')} placeholder="500" className="rounded-xl" />
                    </div>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

                <div className="flex gap-3 pt-1">
                    <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
                    <Button onClick={handleCreate} disabled={pending} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700">
                        {pending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : 'Create Event'}
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ── Main list ─────────────────────────────────────────────────────────────────
export function FairListClient({ initialEvents }: { initialEvents: FairEventRow[] }) {
    const router = useRouter()
    const [showCreate, setShowCreate] = useState(false)

    const handleCreated = (id: string) => {
        setShowCreate(false)
        router.push(`/admin/fairs/${id}`)
    }

    return (
        <>
            {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

            {/* Header actions */}
            <div className="flex justify-end">
                <Button onClick={() => setShowCreate(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="w-4 h-4" /> New Fair Event
                </Button>
            </div>

            {/* Empty state */}
            {initialEvents.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                        <QrCode className="w-10 h-10 text-gray-300" />
                        <div>
                            <p className="font-semibold text-gray-700">No fair events yet</p>
                            <p className="text-sm text-gray-400 mt-1">Create your first fair event to get an entrance QR code.</p>
                        </div>
                        <Button onClick={() => setShowCreate(true)} className="rounded-xl gap-2">
                            <Plus className="w-4 h-4" /> Create First Event
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Events grid */}
            {initialEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {initialEvents.map((ev) => (
                        <Link key={ev.id} href={`/admin/fairs/${ev.id}`}>
                            <Card className="hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-base leading-tight">{ev.name}</CardTitle>
                                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[ev.status] ?? STATUS_STYLES.UPCOMING}`}>
                                            {ev.status === 'LIVE' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" />}
                                            {ev.status}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-sm text-gray-500 space-y-1">
                                        {(ev.city || ev.country) && (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                {[ev.city, ev.country].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                                            {new Date(ev.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-1 border-t border-gray-100">
                                        <div className="flex-1 text-center">
                                            <p className="text-xl font-bold text-indigo-600">{ev.passes}</p>
                                            <p className="text-xs text-gray-400">Passes</p>
                                        </div>
                                        <div className="w-px bg-gray-100" />
                                        <div className="flex-1 text-center">
                                            <p className="text-xl font-bold text-violet-600">{ev.scans}</p>
                                            <p className="text-xs text-gray-400">Scans</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <span className="flex-1 flex items-center justify-center gap-1 text-xs text-indigo-600 bg-indigo-50 rounded-lg py-1.5">
                                            <QrCode className="w-3.5 h-3.5" /> Entrance QR
                                        </span>
                                        <span className="flex-1 flex items-center justify-center gap-1 text-xs text-violet-600 bg-violet-50 rounded-lg py-1.5">
                                            <BarChart2 className="w-3.5 h-3.5" /> Report
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </>
    )
}
