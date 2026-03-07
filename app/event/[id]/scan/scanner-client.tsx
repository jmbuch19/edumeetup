'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { processQRScan, updateRepNotes, type StudentPreview } from './actions'
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    ScanLine,
    Loader2,
    Users,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
type ScanState = 'idle' | 'scanning' | 'loading' | 'success' | 'alreadyScanned' | 'error'

interface ScannerClientProps {
    fairEventId: string
    universityId: string
    fairEventTitle: string
    initialScanCount: number
}

// ── Bottom sheet ─────────────────────────────────────────────────────────────
function BottomSheet({
    state,
    preview,
    repNotes,
    onNotesChange,
    onConfirm,
    onReset,
    loading,
    errorMsg,
}: {
    state: ScanState
    preview: StudentPreview | null
    repNotes: string
    onNotesChange: (v: string) => void
    onConfirm: () => void
    onReset: () => void
    loading: boolean
    errorMsg: string | null
}) {
    if (state === 'idle' || state === 'scanning') return null

    const firstName = (preview?.fullName ?? 'Unknown').split(' ')[0]

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={(e) => e.target === e.currentTarget && onReset()}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onReset} />

            {/* Sheet */}
            <div className="relative bg-white rounded-t-3xl p-6 pb-safe max-h-[80vh] overflow-y-auto shadow-2xl">
                {/* Drag handle */}
                <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

                {/* ── Loading ── */}
                {state === 'loading' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        <p className="text-gray-600 font-medium">Processing scan…</p>
                    </div>
                )}

                {/* ── Error ── */}
                {state === 'error' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                            <XCircle className="w-7 h-7 text-red-500" />
                        </div>
                        <p className="text-red-700 font-semibold text-center">{errorMsg ?? 'Invalid QR code'}</p>
                        <Button onClick={onReset} className="w-full rounded-xl" variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" /> Scan Again
                        </Button>
                    </div>
                )}

                {/* ── Already scanned ── */}
                {state === 'alreadyScanned' && preview && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="font-semibold text-amber-800 text-sm">Already scanned</p>
                                <p className="text-amber-600 text-xs">{preview.fullName} was scanned by your team earlier</p>
                            </div>
                        </div>
                        <StudentCard preview={preview} />
                        <Button onClick={onReset} className="w-full rounded-xl" variant="outline">
                            <RefreshCw className="w-4 h-4 mr-2" /> Scan Next
                        </Button>
                    </div>
                )}

                {/* ── Success — confirm lead ── */}
                {state === 'success' && preview && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Lead captured!</p>
                                <p className="text-gray-500 text-xs">Review and add notes before confirming</p>
                            </div>
                        </div>

                        <StudentCard preview={preview} />

                        {/* Rep notes */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">
                                Rep Notes <span className="text-gray-400 font-normal">(optional, max 200 chars)</span>
                            </label>
                            <Textarea
                                value={repNotes}
                                onChange={(e) => onNotesChange(e.target.value.slice(0, 200))}
                                placeholder="e.g. Very interested in MBA, follow up next week…"
                                rows={3}
                                className="rounded-xl border-gray-200 resize-none text-sm"
                            />
                            <p className="text-xs text-gray-400 text-right">{repNotes.length}/200</p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <Button
                                variant="outline"
                                onClick={onReset}
                                className="flex-1 rounded-xl border-gray-200"
                                disabled={loading}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Scan Again
                            </Button>
                            <Button
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                                ) : (
                                    <><CheckCircle2 className="w-4 h-4 mr-2" />Confirm Lead</>
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function StudentCard({ preview }: { preview: StudentPreview }) {
    return (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div>
                <p className="text-lg font-bold text-gray-900">{preview.fullName ?? '—'}</p>
                <p className="text-sm text-gray-500">
                    {preview.currentCourse ?? 'Course not specified'}
                    {preview.yearOfPassing ? ` · Class of ${preview.yearOfPassing}` : ''}
                </p>
            </div>
            {preview.matchedPrograms.length > 0 && (
                <div>
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1.5">
                        Matched Programs
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {preview.matchedPrograms.map((prog) => (
                            <span
                                key={prog}
                                className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium"
                            >
                                {prog}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// ── Success flash ─────────────────────────────────────────────────────────────
function SuccessFlash({ name }: { name: string }) {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold">{name} — Lead saved!</span>
        </div>
    )
}

// ── Main scanner ──────────────────────────────────────────────────────────────
export function ScannerClient({
    fairEventId,
    universityId,
    fairEventTitle,
    initialScanCount,
}: ScannerClientProps) {
    const viewfinderRef = useRef<HTMLDivElement>(null)
    const scannerRef = useRef<any>(null)

    const [scanState, setScanState] = useState<ScanState>('scanning')
    const [preview, setPreview] = useState<StudentPreview | null>(null)
    const [repNotes, setRepNotes] = useState('')
    const [pendingUuid, setPendingUuid] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [scanCount, setScanCount] = useState(initialScanCount)
    const [showFlash, setShowFlash] = useState(false)
    const [flashName, setFlashName] = useState('')
    const [pendingAttendanceId, setPendingAttendanceId] = useState<string | null>(null)

    // ── Initialise html5-qrcode scanner ───────────────────────────────────────
    useEffect(() => {
        let mounted = true

        async function startScanner() {
            const { Html5Qrcode } = await import('html5-qrcode')

            if (!viewfinderRef.current || !mounted) return

            const scanner = new Html5Qrcode('qr-viewfinder')
            scannerRef.current = scanner

            const onSuccess = async (decodedText: string) => {
                // Extract UUID from URL or use raw value
                const match = decodedText.match(/\/scan\/([a-z0-9]+)$/i)
                const uuid = match ? match[1] : decodedText.trim()

                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(200)

                // Pause scanning
                await scanner.pause(true)
                setScanState('loading')
                setPendingUuid(uuid)

                const result = await processQRScan(uuid, universityId, fairEventId)

                if (!mounted) return

                if ('error' in result) {
                    setErrorMsg(result.error)
                    setScanState('error')
                } else if ('alreadyScanned' in result) {
                    setPreview(result.studentPreview)
                    setScanState('alreadyScanned')
                } else {
                    setPreview(result.studentPreview)
                    setPendingAttendanceId(result.attendanceId)
                    setScanState('success')
                }
            }

            const onError = () => {
                // Suppress per-frame decode errors silently
            }

            try {
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onSuccess,
                    onError,
                )
            } catch (err) {
                console.error('[QR Scanner] Camera start failed:', err)
                if (mounted) {
                    setErrorMsg('Camera access denied. Please allow camera permissions and reload.')
                    setScanState('error')
                }
            }
        }

        startScanner()

        return () => {
            mounted = false
            scannerRef.current?.stop().catch(() => null)
        }
    }, [fairEventId, universityId])

    // ── Confirm Lead ─────────────────────────────────────────────────────────
    const handleConfirm = async () => {
        if (!pendingAttendanceId || !preview) return
        setLoading(true)

        // Save rep notes on the attendance record already created during scan
        if (repNotes.trim()) {
            await updateRepNotes(pendingAttendanceId, repNotes)
        }

        const firstName = (preview.fullName ?? 'Student').split(' ')[0]
        setFlashName(firstName)
        setShowFlash(true)
        setScanCount((c) => c + 1)
        setTimeout(() => setShowFlash(false), 2500)

        setLoading(false)
        handleReset()
    }

    // ── Scan Again ───────────────────────────────────────────────────────────
    const handleReset = async () => {
        setPreview(null)
        setRepNotes('')
        setPendingUuid(null)
        setPendingAttendanceId(null)
        setErrorMsg(null)
        setScanState('scanning')
        try {
            await scannerRef.current?.resume()
        } catch {
            // If resume fails, scanner may need restart — handle gracefully
        }
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
            {/* ── Success flash ── */}
            {showFlash && <SuccessFlash name={flashName} />}

            {/* ── Header ── */}
            <div className="absolute top-0 left-0 right-0 z-10 px-5 pt-safe pt-4 pb-3 bg-gradient-to-b from-black/80 to-transparent">
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">EdUmeetup</p>
                <h1 className="text-white font-bold text-lg leading-tight truncate">{fairEventTitle}</h1>
                <div className="flex items-center gap-1.5 mt-1">
                    <Users className="w-3.5 h-3.5 text-indigo-300" />
                    <p className="text-indigo-200 text-xs font-medium">
                        {scanCount} student{scanCount !== 1 ? 's' : ''} scanned today
                    </p>
                </div>
            </div>

            {/* ── Camera viewfinder ── */}
            <div id="qr-viewfinder" ref={viewfinderRef} className="w-full h-full" />

            {/* ── Scanning frame overlay ── */}
            {scanState === 'scanning' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-64">
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
                        {/* Scan line */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-indigo-400/80 animate-pulse" />
                    </div>
                    <div className="absolute bottom-36 flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-white/70 animate-pulse" />
                        <p className="text-white/70 text-sm">Point at student pass QR</p>
                    </div>
                </div>
            )}

            {/* ── Bottom sheet ── */}
            <BottomSheet
                state={scanState}
                preview={preview}
                repNotes={repNotes}
                onNotesChange={setRepNotes}
                onConfirm={handleConfirm}
                onReset={handleReset}
                loading={loading}
                errorMsg={errorMsg}
            />
        </div>
    )
}
