'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { updateUniversitySettings, saveUniversityNotificationPrefs } from './actions'
import { updateUniversityLogo, removeUniversityLogo } from './logo-actions'
import { toast } from 'sonner'
import Image from 'next/image'

// ─── Data ──────────────────────────────────────────────────────────────────────
const COUNTRIES = ['USA','UK','Canada','Australia','Germany','Netherlands','Ireland','New Zealand',
  'Singapore','France','Sweden','Denmark','Japan','South Korea','Italy','Spain','Switzerland',
  'Austria','Belgium','Finland','Norway','India']
const TIMEZONES = ['America/New_York','America/Toronto','America/Chicago','America/Los_Angeles',
  'Europe/London','Europe/Berlin','Europe/Paris','Europe/Amsterdam','Australia/Sydney',
  'Australia/Melbourne','Asia/Singapore','Asia/Tokyo','Asia/Kolkata','Pacific/Auckland']
const UNI_TYPES = ['Public','Private','Research University','Liberal Arts','Technical University',
  'Business School','Community College','Deemed University']
const INTAKES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PROGRAMS_PRESET = ['Computer Science','Engineering','Business / MBA','Medicine','Law',
  'Architecture','Arts & Humanities','Social Sciences','Natural Sciences','Education',
  'Public Policy','Data Science','Nursing','Agriculture','Environmental Studies']
const STUDENT_TARGETS = ['Under 50','50–100','100–200','200–500','500+','No specific target']

const SECTIONS = [
  { id: 'identity',      label: 'Institution Identity' },
  { id: 'profile',       label: 'Public Profile'       },
  { id: 'programs',      label: 'Programs & Intake'    },
  { id: 'meetings',      label: 'Meeting Rules'        },
  { id: 'notifications', label: 'Notifications'        },
]

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface UniversitySettings {
  institutionName: string
  verificationStatus: string
  responseRate: number | null
  logo?: string | null
  brandColor?: string | null
  website?: string | null
  contactEmail?: string | null
  description?: string | null
  isPublic: boolean
  country: string | null
  timezone?: string | null
  linkedin?: string | null
  universityType?: string | null
  accreditation?: string | null
  rankingQS?: string | null
  rankingTHE?: string | null
  indianStudentTarget?: string | null
  programs: string[]
  intakeMonths: string[]
  defaultDuration: number
  dailyCapPerRep: number
  minLeadTimeHours: number
  bufferMinutes: number
  cancellationWindowHours: number
  approvalMode: string
  wherebyApiKey?: string | null
  notifyNewInterest: boolean
  notifyMeetingBooked: boolean
  notifyMeetingCancelled: boolean
  digestDaily: boolean
  notifyTarget: string
  quietHoursEnabled: boolean
  quietHoursStart: number
  quietHoursEnd: number
  followUpThresholdHours?: number | null
}

// ─── Micro components ──────────────────────────────────────────────────────────
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <label htmlFor={id} style={{ position: 'relative', width: 42, height: 24, display: 'inline-block', cursor: 'pointer', flexShrink: 0 }}>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: 100,
        background: checked ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)',
        transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', left: checked ? 21 : 3, top: 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)', transition: 'left 0.2s',
        }} />
      </span>
    </label>
  )
}

function Chip({ label, active, onClick, gold }: { label: string; active: boolean; onClick: () => void; gold?: boolean }) {
  const activeColor = gold ? 'oklch(56% 0.18 58)' : 'oklch(37.9% 0.146 265.522)'
  return (
    <div onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 13px', borderRadius: 100, cursor: 'pointer', userSelect: 'none',
      border: `1.5px solid ${active ? activeColor : 'oklch(84% 0.04 265)'}`,
      background: active ? activeColor : 'oklch(99.5% 0.004 265)',
      color: active ? '#fff' : 'oklch(58% 0.04 265)',
      fontSize: 12.5, fontWeight: 500, transition: 'all 0.14s',
    }}>
      {active && <span style={{ fontSize: 10 }}>✓</span>}
      {label}
    </div>
  )
}

function SectionCard({ id, icon, title, desc, children }: { id: string; icon: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ background: '#fff', borderRadius: 16, border: '1px solid oklch(90% 0.025 265)', marginBottom: 24, overflow: 'hidden' }}>
      <div style={{ padding: '20px 28px 18px', borderBottom: '1px solid oklch(90% 0.025 265)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'oklch(92% 0.06 265)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'oklch(37.9% 0.146 265.522)', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 17, fontWeight: 600, color: 'oklch(18% 0.02 265)', letterSpacing: '-0.2px' }}>{title}</div>
          {desc && <div style={{ fontSize: 12.5, color: 'oklch(58% 0.04 265)', marginTop: 2 }}>{desc}</div>}
        </div>
      </div>
      <div style={{ padding: '24px 28px' }}>{children}</div>
    </div>
  )
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'oklch(38% 0.04 265)', marginBottom: 6, letterSpacing: '0.4px', textTransform: 'uppercase' }}>{label}</div>
      {children}
      {sub && <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)', marginTop: 5, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 9,
  border: '1.5px solid oklch(84% 0.04 265)', background: 'oklch(99.5% 0.004 265)',
  fontSize: 14, color: 'oklch(18% 0.02 265)', fontFamily: 'var(--font-jakarta, system-ui)',
  outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s',
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }}
    onFocus={e => { e.target.style.borderColor = 'oklch(37.9% 0.146 265.522)'; e.target.style.boxShadow = '0 0 0 3px oklch(37.9% 0.146 265.522 / 0.1)'; }}
    onBlur={e => { e.target.style.borderColor = 'oklch(84% 0.04 265)'; e.target.style.boxShadow = 'none'; }}
  />
}
function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...fieldStyle, cursor: 'pointer', ...props.style }}
    onFocus={e => { e.target.style.borderColor = 'oklch(37.9% 0.146 265.522)'; e.target.style.boxShadow = '0 0 0 3px oklch(37.9% 0.146 265.522 / 0.1)'; }}
    onBlur={e => { e.target.style.borderColor = 'oklch(84% 0.04 265)'; e.target.style.boxShadow = 'none'; }}
  />
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function SettingsForm({ settings }: { settings: UniversitySettings }) {
  const [data, setData]   = useState({ ...settings })
  const [logoUrl, setLogo] = useState(settings.logo || '')
  const [logoChanging, setLogoChanging] = useState(false)
  const [activeSection, setActiveSection] = useState('identity')
  const [isPending, startTransition] = useTransition()
  const logoRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: any) => setData(d => ({ ...d, [k]: v }))
  const toggleArr = (k: string, v: string) => setData(d => ({
    ...d, [k]: (d as any)[k].includes(v) ? (d as any)[k].filter((x: string) => x !== v) : [...(d as any)[k], v]
  }))

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSection(e.target.id) })
    }, { threshold: 0.25, rootMargin: '-80px 0px -60% 0px' })
    SECTIONS.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSection(id)
  }

  // Logo upload
  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.currentTarget.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Select an image file'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return }
    setLogoChanging(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error ?? 'Upload failed'); return }
      await updateUniversityLogo(d.url)
      setLogo(d.url)
      toast.success('Logo updated')
    } catch { toast.error('Upload failed — try again') }
    finally { setLogoChanging(false) }
  }

  async function handleLogoRemove() {
    const r = await removeUniversityLogo()
    if (r.ok) { setLogo(''); toast.success('Logo removed') }
    else toast.error(r.error)
  }

  // Save settings
  function handleSave(notifOnly = false) {
    startTransition(async () => {
      if (!notifOnly) {
        const fd = new FormData()
        fd.append('website', data.website || '')
        fd.append('contactEmail', data.contactEmail || '')
        fd.append('logo', logoUrl)
        fd.append('brandColor', data.brandColor || '')
        fd.append('description', data.description || '')
        if (data.isPublic) fd.append('isPublic', 'on')
        fd.append('country', data.country || '')
        fd.append('timezone', data.timezone || '')
        fd.append('linkedin', data.linkedin || '')
        fd.append('universityType', data.universityType || '')
        fd.append('accreditation', data.accreditation || '')
        if (data.rankingQS != null) fd.append('rankingQS', String(data.rankingQS))
        if (data.rankingTHE != null) fd.append('rankingTHE', String(data.rankingTHE))
        data.programs.forEach(p => fd.append('programs', p))
        data.intakeMonths.forEach(m => fd.append('intakeMonths', m))
        fd.append('indianStudentTarget', data.indianStudentTarget || '')
        fd.append('wherebyApiKey', data.wherebyApiKey || '')
        fd.append('defaultDuration', String(data.defaultDuration))
        fd.append('dailyCapPerRep', String(data.dailyCapPerRep))
        fd.append('minLeadTimeHours', String(data.minLeadTimeHours))
        fd.append('bufferMinutes', String(data.bufferMinutes))
        fd.append('cancellationWindowHours', String(data.cancellationWindowHours))
        fd.append('approvalMode', data.approvalMode)
        const r = await updateUniversitySettings(fd)
        if (r.error) { toast.error(r.error); return }
      }

      // Notifications
      const nfd = new FormData()
      if (data.notifyNewInterest) nfd.append('alertNewInterest', 'on')
      if (data.notifyMeetingBooked) nfd.append('alertMeetingBooked', 'on')
      if (data.notifyMeetingCancelled) nfd.append('alertMeetingCancelled', 'on')
      if (data.digestDaily) nfd.append('dailyBrief', 'on')
      nfd.append('responseSlaHours', String(data.followUpThresholdHours || 48))
      nfd.append('notifyTarget', data.notifyTarget)
      if (data.quietHoursEnabled) nfd.append('quietHoursEnabled', 'on')
      nfd.append('quietHoursStart', `${data.quietHoursStart}:00`)
      nfd.append('quietHoursEnd', `${data.quietHoursEnd}:00`)
      await saveUniversityNotificationPrefs(nfd)

      toast.success('Settings saved successfully')
    })
  }

  const rr = data.responseRate
  const rrColor = rr == null ? 'oklch(58% 0.04 265)' : rr >= 80 ? 'oklch(60% 0.15 150)' : rr >= 60 ? 'oklch(72% 0.17 65)' : 'oklch(55% 0.2 25)'

  return (
    <div style={{ minHeight: '100vh', background: 'oklch(97.5% 0.01 265)', fontFamily: 'var(--font-jakarta, system-ui)' }}>

      {/* ── DARK HEADER ───────────────────────────────────────────────────── */}
      <div style={{ background: 'oklch(37.9% 0.146 265.522)' }}>
        {/* Partner banner strip */}
        <div style={{ background: 'oklch(32% 0.13 265)', borderBottom: '1px solid oklch(28% 0.11 265)', padding: '9px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'oklch(72% 0.17 65)', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              Complimentary Partner Access · Subscription plans launching 2026
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>IAES Partner Portal</span>
        </div>

        {/* Nav bar */}
        <div style={{ padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L1.5 6v5.25L9 15l7.5-3.75V6L9 1.5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 1.5v11.25M1.5 6l7.5 4.5 7.5-4.5" stroke="white" strokeWidth="1.4"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontWeight: 600, fontSize: 15, color: '#fff' }}>edUmeetup</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>by IAES</div>
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 15, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
              {data.institutionName}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {data.verificationStatus === 'VERIFIED' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 14px' }}>
                <span style={{ fontSize: 11, color: 'oklch(72% 0.17 65)', fontWeight: 800 }}>✦ VERIFIED PARTNER</span>
              </div>
            )}
            <button
              onClick={() => handleSave(false)}
              disabled={isPending}
              style={{ padding: '9px 22px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-jakarta, system-ui)' }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Page title */}
        <div style={{ padding: '20px 40px 32px', maxWidth: 1040, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Partner Settings</div>
          <h1 style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 30, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Institution Profile & Preferences
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 300, lineHeight: 1.6, maxWidth: 540 }}>
            Control how Indian students discover your university, manage meeting rules, and configure your notification pipeline.
          </p>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 36, marginTop: 22 }}>
            {[
              { label: 'Response Rate', value: rr != null ? `${rr}%` : '—', color: rr != null && rr >= 80 ? 'oklch(72% 0.17 65)' : 'rgba(255,255,255,0.8)' },
              { label: 'Status', value: data.verificationStatus },
              { label: 'Partner Access', value: 'Complimentary' },
              { label: 'IAES Partnership', value: 'Since 1999' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 18, fontWeight: 600, color: s.color || 'rgba(255,255,255,0.8)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 40px 100px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40, alignItems: 'start' }}>

        {/* Left sticky nav */}
        <nav style={{ position: 'sticky', top: 24 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'oklch(58% 0.04 265)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10, paddingLeft: 12 }}>Sections</div>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
              cursor: 'pointer', width: '100%', border: 'none', textAlign: 'left',
              background: activeSection === s.id ? 'oklch(92% 0.06 265)' : 'transparent',
              color: activeSection === s.id ? 'oklch(37.9% 0.146 265.522)' : 'oklch(58% 0.04 265)',
              fontWeight: activeSection === s.id ? 700 : 500,
              fontSize: 13, fontFamily: 'var(--font-jakarta, system-ui)',
              transition: 'all 0.15s',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: activeSection === s.id ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)', transition: 'background 0.15s' }} />
              {s.label}
            </button>
          ))}
          {/* IAES note */}
          <div style={{ marginTop: 28, padding: '14px', background: 'oklch(96% 0.03 265)', borderRadius: 12, border: '1px solid oklch(92% 0.06 265)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'oklch(37.9% 0.146 265.522)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>IAES · Est. 1999</div>
            <div style={{ fontSize: 12, color: 'oklch(38% 0.04 265)', lineHeight: 1.6, fontWeight: 300 }}>25 years connecting India's brightest students with global universities.</div>
          </div>
        </nav>

        {/* Right content */}
        <div>

          {/* ── 1. Institution Identity ──────────────────────────────────── */}
          <SectionCard id="identity" icon="◈" title="Institution Identity" desc="Core details — used for verification and public listing.">
            <Field label="Institution Name" sub="Contact IAES support to change your official institution name.">
              <Inp value={data.institutionName} disabled style={{ background: 'oklch(97.5% 0.01 265)', color: 'oklch(58% 0.04 265)', cursor: 'not-allowed' }} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Country *">
                <Sel name="country" value={data.country || ''} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </Sel>
              </Field>
              <Field label="Timezone">
                <Sel name="timezone" value={data.timezone || ''} onChange={e => set('timezone', e.target.value)}>
                  <option value="">Select timezone</option>
                  {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                </Sel>
              </Field>
            </div>
            <Field label="Institution Type">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {UNI_TYPES.map(t => (
                  <Chip key={t} label={t} active={data.universityType === t} onClick={() => set('universityType', data.universityType === t ? '' : t)} />
                ))}
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Accreditations" sub="e.g. AACSB, EQUIS, NAAC A+">
                <Inp name="accreditation" placeholder="AACSB, NAAC A+…" value={data.accreditation || ''} onChange={e => set('accreditation', e.target.value)} />
              </Field>
              <Field label="Indian Students Target / Year">
                <Sel name="indianStudentTarget" value={data.indianStudentTarget || ''} onChange={e => set('indianStudentTarget', e.target.value)}>
                  <option value="">Select range</option>
                  {STUDENT_TARGETS.map(t => <option key={t}>{t}</option>)}
                </Sel>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="QS World Ranking">
                <Inp name="rankingQS" type="number" placeholder="e.g. 34" value={data.rankingQS ?? ''} onChange={e => set('rankingQS', e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="THE World Ranking">
                <Inp name="rankingTHE" type="number" placeholder="e.g. 18" value={data.rankingTHE ?? ''} onChange={e => set('rankingTHE', e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
          </SectionCard>

          {/* ── 2. Public Profile ────────────────────────────────────────── */}
          <SectionCard id="profile" icon="◎" title="Public Profile" desc="How pre-screened Indian students discover and evaluate your institution.">
            {/* Logo */}
            <Field label="Institution Logo">
              <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
              {logoUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 72, height: 72, borderRadius: 12, border: '1.5px solid oklch(84% 0.04 265)', background: 'oklch(97.5% 0.01 265)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Image src={logoUrl} alt="Logo" width={72} height={72} style={{ objectFit: 'contain', padding: 6 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button type="button" onClick={() => logoRef.current?.click()} disabled={logoChanging}
                      style={{ padding: '7px 16px', borderRadius: 100, border: '1.5px solid oklch(84% 0.04 265)', background: 'transparent', color: 'oklch(38% 0.04 265)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-jakarta, system-ui)' }}>
                      ↑ Change Logo
                    </button>
                    <button type="button" onClick={handleLogoRemove} disabled={logoChanging}
                      style={{ padding: '7px 16px', borderRadius: 100, border: '1.5px solid oklch(55% 0.2 25)', background: 'transparent', color: 'oklch(55% 0.2 25)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-jakarta, system-ui)' }}>
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div onClick={() => logoRef.current?.click()} style={{ cursor: 'pointer', borderRadius: 12, border: '1.5px dashed oklch(84% 0.04 265)', padding: '28px 20px', textAlign: 'center', background: 'oklch(99.5% 0.004 265)', transition: 'all 0.18s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'oklch(37.9% 0.146 265.522)'; (e.currentTarget as HTMLDivElement).style.background = 'oklch(96% 0.03 265)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'oklch(84% 0.04 265)'; (e.currentTarget as HTMLDivElement).style.background = 'oklch(99.5% 0.004 265)'; }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏛</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'oklch(38% 0.04 265)', marginBottom: 4 }}>Upload Institution Logo</div>
                  <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)' }}>PNG, JPG, SVG, WebP · max 2 MB</div>
                </div>
              )}
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Official Website *">
                <Inp name="website" type="url" placeholder="https://…" value={data.website || ''} onChange={e => set('website', e.target.value)} />
              </Field>
              <Field label="Public Contact Email *" sub="Must be an official institutional domain.">
                <Inp name="contactEmail" type="email" placeholder="admissions@university.edu" value={data.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)} />
              </Field>
            </div>
            <Field label="LinkedIn Page">
              <Inp name="linkedin" type="url" placeholder="https://linkedin.com/school/…" value={data.linkedin || ''} onChange={e => set('linkedin', e.target.value)} />
            </Field>
            <Field label="Institution Description" sub="2–4 sentences. Write for a prospective Indian undergraduate or postgraduate student.">
              <textarea name="description" rows={4} value={data.description || ''} onChange={e => set('description', e.target.value)}
                style={{ ...fieldStyle, resize: 'vertical', lineHeight: 1.65 }}
                onFocus={e => { e.target.style.borderColor = 'oklch(37.9% 0.146 265.522)'; e.target.style.boxShadow = '0 0 0 3px oklch(37.9% 0.146 265.522 / 0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'oklch(84% 0.04 265)'; e.target.style.boxShadow = 'none'; }}
              />
              <div style={{ fontSize: 11.5, color: 'oklch(58% 0.04 265)', textAlign: 'right', marginTop: 4 }}>{(data.description || '').length} / 600</div>
            </Field>

            {/* Public toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 10, border: '1.5px solid oklch(84% 0.04 265)', background: 'oklch(99.5% 0.004 265)', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(18% 0.02 265)' }}>Publicly Listed</div>
                <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)', marginTop: 2 }}>Visible to all pre-screened Indian students on edUmeetup</div>
              </div>
              <Toggle id="isPublic" checked={data.isPublic} onChange={v => set('isPublic', v)} />
            </div>

            {/* Response rate meter */}
            {rr != null && (
              <div style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid oklch(84% 0.04 265)', background: 'oklch(99.5% 0.004 265)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'oklch(58% 0.04 265)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Your Response Rate</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 8, borderRadius: 100, background: 'oklch(90% 0.025 265)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${rr}%`, borderRadius: 100, background: rrColor, transition: 'width 1s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11.5, color: 'oklch(58% 0.04 265)' }}>Platform avg: 67%</span>
                      <span style={{ fontSize: 11.5, color: rrColor, fontWeight: 700 }}>{rr >= 80 ? 'Excellent' : rr >= 60 ? 'Good' : 'Needs attention'}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 30, fontWeight: 700, color: rrColor, flexShrink: 0 }}>{rr}%</div>
                </div>
                <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)', marginTop: 10 }}>Faster responses improve your ranking in student search results. Target: ≥ 80%.</div>
              </div>
            )}
          </SectionCard>

          {/* ── 3. Programs & Intake ──────────────────────────────────────── */}
          <SectionCard id="programs" icon="◇" title="Programs & Intake" desc="Tell students which programs you offer and when you accept applications.">
            <Field label="Programs Offered" sub="Select all that you actively recruit Indian students for.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PROGRAMS_PRESET.map(p => (
                  <Chip key={p} label={p} active={data.programs.includes(p)} onClick={() => toggleArr('programs', p)} />
                ))}
              </div>
            </Field>
            <Field label="Intake Months">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INTAKES.map(m => (
                  <Chip key={m} label={m} active={data.intakeMonths.includes(m)} onClick={() => toggleArr('intakeMonths', m)} gold />
                ))}
              </div>
            </Field>
          </SectionCard>

          {/* ── 4. Meeting Rules ──────────────────────────────────────────── */}
          <SectionCard id="meetings" icon="⊞" title="Meeting Rules" desc="Control exactly how students can book counselling sessions with your team.">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              <Field label="Default Duration (min)" sub="15 – 240 minutes per session.">
                <Inp name="defaultDuration" type="number" min={15} max={240} value={data.defaultDuration} onChange={e => set('defaultDuration', Number(e.target.value))} />
              </Field>
              <Field label="Daily Cap per Rep" sub="Max meetings one rep handles per day.">
                <Inp name="dailyCapPerRep" type="number" min={1} max={50} value={data.dailyCapPerRep} onChange={e => set('dailyCapPerRep', Number(e.target.value))} />
              </Field>
              <Field label="Min Lead Time (hours)" sub="Students must book at least this far ahead.">
                <Inp name="minLeadTimeHours" type="number" min={0} max={168} value={data.minLeadTimeHours} onChange={e => set('minLeadTimeHours', Number(e.target.value))} />
              </Field>
              <Field label="Buffer Between Meetings (min)">
                <Inp name="bufferMinutes" type="number" min={0} max={120} value={data.bufferMinutes} onChange={e => set('bufferMinutes', Number(e.target.value))} />
              </Field>
              <Field label="Cancellation Window (hours)" sub="Students can cancel up to this many hours before.">
                <Inp name="cancellationWindowHours" type="number" min={0} max={168} value={data.cancellationWindowHours} onChange={e => set('cancellationWindowHours', Number(e.target.value))} />
              </Field>
              <Field label="Approval Mode">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[['MANUAL','Manual Approval','Your team confirms each booking'],['AUTOMATIC','Automatic Approval','Bookings confirmed instantly']].map(([val, label, desc]) => (
                    <div key={val} onClick={() => set('approvalMode', val)} style={{ padding: '13px 16px', borderRadius: 10, border: `1.5px solid ${data.approvalMode === val ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)'}`, background: data.approvalMode === val ? 'oklch(96% 0.03 265)' : 'oklch(99.5% 0.004 265)', cursor: 'pointer', display: 'flex', gap: 11, alignItems: 'flex-start', transition: 'all 0.14s' }}>
                      <div style={{ width: 17, height: 17, borderRadius: '50%', border: `2px solid ${data.approvalMode === val ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)'}`, background: data.approvalMode === val ? 'oklch(37.9% 0.146 265.522)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all 0.14s' }}>
                        {data.approvalMode === val && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'oklch(18% 0.02 265)', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Field>
            </div>

            {/* Whereby */}
            <div style={{ marginTop: 8, padding: '18px 20px', borderRadius: 12, border: '1.5px dashed oklch(84% 0.04 265)', background: 'oklch(99.5% 0.004 265)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: 'oklch(38% 0.04 265)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Whereby API Key</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'oklch(92% 0.06 265)', color: 'oklch(37.9% 0.146 265.522)', padding: '2px 9px', borderRadius: 100 }}>OPTIONAL</span>
              </div>
              <Inp name="wherebyApiKey" type="password" placeholder="Paste your own Whereby API key to use your account" value={data.wherebyApiKey || ''} onChange={e => set('wherebyApiKey', e.target.value)} />
              <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)', marginTop: 6 }}>Leave blank to use edUmeetup's shared meeting infrastructure.</div>
            </div>
          </SectionCard>

          {/* ── 5. Notifications ─────────────────────────────────────────── */}
          <SectionCard id="notifications" icon="◉" title="Notifications" desc="Configure your alert pipeline — what you hear about, when, and who gets notified.">

            {/* Instant alerts */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, color: 'oklch(18% 0.02 265)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ fontSize: 11, background: 'oklch(95% 0.05 150)', color: 'oklch(60% 0.15 150)', padding: '2px 9px', borderRadius: 100, fontWeight: 700 }}>INSTANT</span>
                Pipeline Alerts
              </div>
              {[
                { k: 'notifyNewInterest',      label: 'New student interest',    desc: 'Triggered the moment a student expresses interest.', badge: 'High impact', bc: 'oklch(95% 0.05 150)', bt: 'oklch(60% 0.15 150)' },
                { k: 'notifyMeetingBooked',    label: 'Meeting booked',          desc: 'Sent when a student schedules a counselling session.', badge: 'Recommended', bc: 'oklch(92% 0.06 265)', bt: 'oklch(37.9% 0.146 265.522)' },
                { k: 'notifyMeetingCancelled', label: 'Meeting cancelled',       desc: 'Sent if a student cancels a confirmed meeting.' },
              ].map(n => (
                <div key={n.k} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid oklch(90% 0.025 265)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'oklch(18% 0.02 265)' }}>{n.label}</span>
                      {n.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: n.bc, color: n.bt }}>{n.badge}</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'oklch(58% 0.04 265)' }}>{n.desc}</div>
                  </div>
                  <Toggle id={n.k} checked={(data as any)[n.k]} onChange={v => set(n.k, v)} />
                </div>
              ))}
            </div>

            {/* Daily brief */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 700, color: 'oklch(18% 0.02 265)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <span style={{ fontSize: 11, background: 'oklch(92% 0.06 265)', color: 'oklch(37.9% 0.146 265.522)', padding: '2px 9px', borderRadius: 100, fontWeight: 700 }}>DAILY</span>
                Morning Brief
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid oklch(90% 0.025 265)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(18% 0.02 265)', marginBottom: 3 }}>Daily pipeline briefing</div>
                  <div style={{ fontSize: 12.5, color: 'oklch(58% 0.04 265)', lineHeight: 1.5 }}>Sent at 9:00 AM IST — only when there's something worth reporting. New interests, pending responses, upcoming meetings, and your response rate.</div>
                </div>
                <Toggle id="digestDaily" checked={data.digestDaily} onChange={v => set('digestDaily', v)} />
              </div>
            </div>

            {/* Response SLA */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(18% 0.02 265)', marginBottom: 6 }}>Response SLA Threshold</div>
              <div style={{ fontSize: 12.5, color: 'oklch(58% 0.04 265)', marginBottom: 14, lineHeight: 1.5 }}>How long before edUmeetup reminds you of an unanswered student interest. Faster responses improve your search ranking.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {[['24','Same day'],['48','Standard'],['72','Relaxed']].map(([val, sub]) => (
                  <div key={val} onClick={() => set('followUpThresholdHours', Number(val))} style={{ padding: '16px 12px', borderRadius: 10, border: `1.5px solid ${data.followUpThresholdHours == Number(val) ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)'}`, background: data.followUpThresholdHours == Number(val) ? 'oklch(96% 0.03 265)' : 'oklch(99.5% 0.004 265)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.14s' }}>
                    <div style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 22, fontWeight: 700, color: data.followUpThresholdHours == Number(val) ? 'oklch(37.9% 0.146 265.522)' : 'oklch(18% 0.02 265)' }}>{val}h</div>
                    <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)' }}>{sub}</div>
                    {val === '48' && <div style={{ fontSize: 10, fontWeight: 700, color: 'oklch(37.9% 0.146 265.522)', marginTop: 2 }}>Recommended</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Who gets notified */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(18% 0.02 265)', marginBottom: 14 }}>Who Gets Notified</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[['PRIMARY','Primary contact only','Only the main account holder receives alert emails.'],['ALL','All team members','All registered reps receive emails. Coming soon.']].map(([val, label, desc]) => (
                  <div key={val} onClick={() => set('notifyTarget', val)} style={{ flex: 1, padding: '16px', borderRadius: 10, border: `1.5px solid ${data.notifyTarget === val ? 'oklch(37.9% 0.146 265.522)' : 'oklch(84% 0.04 265)'}`, background: data.notifyTarget === val ? 'oklch(96% 0.03 265)' : 'oklch(99.5% 0.004 265)', cursor: 'pointer', transition: 'all 0.14s' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: 'oklch(18% 0.02 265)', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'oklch(58% 0.04 265)', lineHeight: 1.5 }}>{desc}</div>
                    {val === 'ALL' && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 10, fontWeight: 700, color: 'oklch(58% 0.04 265)', border: '1px solid oklch(84% 0.04 265)', borderRadius: 100, padding: '1px 8px' }}>Coming soon</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Quiet hours */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(18% 0.02 265)', marginBottom: 2 }}>Quiet Hours</div>
                  <div style={{ fontSize: 12.5, color: 'oklch(58% 0.04 265)' }}>Pause non-urgent alerts during off-hours. Times in IST.</div>
                </div>
                <Toggle id="quietHoursEnabled" checked={data.quietHoursEnabled} onChange={v => set('quietHoursEnabled', v)} />
              </div>
              {data.quietHoursEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <Field label="Quiet from (IST)">
                    <Inp type="time" value={`${String(data.quietHoursStart).padStart(2, '0')}:00`}
                      onChange={e => set('quietHoursStart', parseInt(e.target.value))} />
                  </Field>
                  <Field label="Quiet until (IST)">
                    <Inp type="time" value={`${String(data.quietHoursEnd).padStart(2, '0')}:00`}
                      onChange={e => set('quietHoursEnd', parseInt(e.target.value))} />
                  </Field>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Save footer ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: '#fff', borderRadius: 14, border: '1px solid oklch(90% 0.025 265)' }}>
            <div style={{ fontSize: 13, color: 'oklch(58% 0.04 265)' }}>
              Changes apply immediately to your public profile and notification pipeline.
            </div>
            <button
              onClick={() => handleSave(false)}
              disabled={isPending}
              style={{ padding: '11px 28px', borderRadius: 100, border: 'none', background: 'oklch(37.9% 0.146 265.522)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: isPending ? 'default' : 'pointer', opacity: isPending ? 0.55 : 1, fontFamily: 'var(--font-jakarta, system-ui)', boxShadow: '0 3px 14px oklch(37.9% 0.146 265.522 / 0.28)', transition: 'all 0.2s' }}>
              {isPending ? 'Saving…' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
