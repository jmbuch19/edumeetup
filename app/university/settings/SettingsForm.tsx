'use client'

import { useRef, useState, useEffect, useTransition } from 'react'
import { updateUniversitySettings, saveUniversityNotificationPrefs } from './actions'
import { updateUniversityLogo, removeUniversityLogo } from './logo-actions'
import { toast } from 'sonner'

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
  { id: 'identity',       label: 'Institution Identity',  icon: '◈' },
  { id: 'profile',        label: 'Public Profile',        icon: '◎' },
  { id: 'programs',       label: 'Programs & Intake',     icon: '◇' },
  { id: 'meetings',       label: 'Meeting Rules',         icon: '⊞' },
  { id: 'notifications',  label: 'Notifications',         icon: '◉' },
]

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

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --p:      oklch(37.9% 0.146 265.522);
    --p-mid:  oklch(48% 0.18 265);
    --p-lite: oklch(60% 0.18 265);
    --p-tint: oklch(96% 0.03 265);
    --p-tint2:oklch(92% 0.06 265);
    --gold:   oklch(72% 0.17 65);
    --gold-d: oklch(56% 0.18 58);
    --gold-t: oklch(97% 0.04 80);
    --ink:    oklch(18% 0.02 265);
    --ink-mid:oklch(38% 0.04 265);
    --muted:  oklch(58% 0.04 265);
    --border: oklch(90% 0.025 265);
    --border2:oklch(84% 0.04 265);
    --surf:   oklch(99.5% 0.004 265);
    --surf2:  oklch(97.5% 0.01 265);
    --red:    oklch(55% 0.2 25);
    --red-t:  oklch(96% 0.04 25);
    --green:  oklch(60% 0.15 150);
    --green-t:oklch(95% 0.05 150);
    --serif:  var(--font-fraunces, Georgia, serif);
    --sans:   var(--font-jakarta, system-ui, sans-serif);
  }

  .settings-container { min-height:100vh; font-family:var(--sans); background:var(--surf2); color:var(--ink); -webkit-font-smoothing:antialiased; }
  .settings-container ::selection { background:var(--gold); color:var(--p); }

  @keyframes fadeUpSettings { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeInSettings { from{opacity:0} to{opacity:1} }
  @keyframes spinSettings   { to{transform:rotate(360deg)} }
  @keyframes pulseSettings  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.88)} }

  .fade-up { animation: fadeUpSettings 0.5s cubic-bezier(.22,.68,0,1.2) both; }
  .fade-in { animation: fadeInSettings 0.3s ease both; }

  /* ── field ── */
  .f {
    width:100%; padding:11px 14px; border-radius:9px;
    border:1.5px solid var(--border2); background:var(--surf);
    font-size:14px; color:var(--ink); font-family:var(--sans);
    transition:border-color .18s, box-shadow .18s, background .18s;
  }
  .f:focus { outline:none; border-color:var(--p); box-shadow:0 0 0 3px oklch(37.9% 0.146 265.522 / 0.1); background:#fff; }
  .f::placeholder { color:var(--muted); }
  .f:disabled { background:var(--surf2); color:var(--muted); cursor:not-allowed; }

  /* ── label ── */
  .lbl { font-size:11.5px; font-weight:700; color:var(--ink-mid); margin-bottom:6px; display:block; letter-spacing:0.4px; text-transform:uppercase; }
  .sub { font-size:12px; color:var(--muted); margin-top:5px; line-height:1.5; }
  .fg  { margin-bottom:20px; }

  /* ── chip ── */
  .chip {
    display:inline-flex; align-items:center; gap:4px;
    padding:6px 13px; border-radius:100px;
    border:1.5px solid var(--border2); background:var(--surf);
    font-size:12.5px; font-weight:500; cursor:pointer;
    transition:all .14s; color:var(--muted); user-select:none; font-family:var(--sans);
  }
  .chip:hover { border-color:var(--p); color:var(--p); background:var(--p-tint); }
  .chip.on    { border-color:var(--p); background:var(--p); color:#fff; }
  .chip.on-gold { border-color:var(--gold-d); background:var(--gold-d); color:#fff; }

  /* ── toggle ── */
  .tog-wrap { position:relative; width:42px; height:24px; flex-shrink:0; }
  .tog-input { opacity:0; width:0; height:0; position:absolute; }
  .tog-slider {
    position:absolute; inset:0; border-radius:100px;
    background:var(--border2); cursor:pointer; transition:background .2s;
  }
  .tog-slider::after {
    content:''; position:absolute; left:3px; top:3px;
    width:18px; height:18px; border-radius:50%; background:#fff;
    transition:transform .2s; box-shadow:0 1px 4px rgba(0,0,0,0.15);
  }
  .tog-input:checked + .tog-slider { background:var(--p); }
  .tog-input:checked + .tog-slider::after { transform:translateX(18px); }

  /* ── radio card ── */
  .rc {
    padding:13px 16px; border-radius:10px; border:1.5px solid var(--border2);
    background:var(--surf); cursor:pointer; transition:all .14s;
    font-size:13.5px; color:var(--ink-mid);
    display:flex; align-items:flex-start; gap:11px; font-family:var(--sans);
  }
  .rc:hover { border-color:var(--p-mid); background:var(--p-tint); }
  .rc.on    { border-color:var(--p); background:var(--p-tint2); }
  .rd { width:17px; height:17px; border-radius:50%; border:2px solid var(--border2); flex-shrink:0; margin-top:1px; transition:all .14s; position:relative; }
  .rc.on .rd { border-color:var(--p); background:var(--p); }
  .rd::after { content:''; position:absolute; inset:3px; border-radius:50%; background:#fff; opacity:0; transition:opacity .14s; }
  .rc.on .rd::after { opacity:1; }

  /* ── section card ── */
  .sec {
    background:#fff; border-radius:16px; border:1px solid var(--border);
    margin-bottom:24px; overflow:hidden;
  }
  .sec-head {
    padding:20px 28px 18px; border-bottom:1px solid var(--border);
    display:flex; align-items:center; gap:14px;
  }
  .sec-icon {
    width:36px; height:36px; border-radius:9px; background:var(--p-tint2);
    display:flex; align-items:center; justify-content:center;
    font-size:15px; color:var(--p); flex-shrink:0;
  }
  .sec-body { padding:24px 28px; }
  .g2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .g3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; }
  .cw { display:flex; flex-wrap:wrap; gap:8px; }
  @media(max-width:640px){ .g2,.g3 { grid-template-columns:1fr; } }

  /* ── btn ── */
  .btn {
    padding:11px 28px; border-radius:100px; border:none;
    background:var(--p); color:#fff; font-family:var(--sans);
    font-size:14px; font-weight:700; cursor:pointer; transition:all .2s;
    display:inline-flex; align-items:center; gap:8px;
    box-shadow:0 3px 14px oklch(37.9% 0.146 265.522 / 0.28);
  }
  .btn:hover:not(:disabled) { background:var(--p-mid); transform:translateY(-1px); box-shadow:0 6px 22px oklch(37.9% 0.146 265.522 / 0.36); }
  .btn:disabled { opacity:0.55; cursor:default; transform:none; }
  .btn-ghost {
    padding:10px 22px; border-radius:100px; border:1.5px solid var(--border2);
    background:transparent; color:var(--muted); font-family:var(--sans);
    font-size:13.5px; font-weight:600; cursor:pointer; transition:all .18s;
  }
  .btn-ghost:hover { border-color:var(--p); color:var(--p); background:var(--p-tint); }
  .btn-danger {
    padding:9px 20px; border-radius:100px; border:1.5px solid var(--red);
    background:transparent; color:var(--red); font-family:var(--sans);
    font-size:13px; font-weight:600; cursor:pointer; transition:all .18s;
  }
  .btn-danger:hover { background:var(--red-t); }

  /* ── nav dot ── */
  .nav-item {
    display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:9px;
    cursor:pointer; transition:all .15s; text-decoration:none; font-size:13px;
    font-weight:500; color:var(--muted); font-family:var(--sans); border:none; background:none; width:100%;
  }
  .nav-item:hover { background:var(--p-tint); color:var(--p); }
  .nav-item.active { background:var(--p-tint2); color:var(--p); font-weight:700; }
  .nav-dot { width:7px; height:7px; border-radius:50%; background:var(--border2); flex-shrink:0; transition:background .15s; }
  .nav-item.active .nav-dot { background:var(--p); }
`;

function Toggle({ checked, onChange, id }: { checked: boolean, onChange: (val: boolean) => void, id: string }) {
  return (
    <label className="tog-wrap" htmlFor={id} style={{ cursor: 'pointer' }}>
      <input id={id} type="checkbox" className="tog-input" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="tog-slider" />
    </label>
  );
}

function SectionHead({ icon, title, desc, id }: { icon: string, title: string, desc?: string, id: string }) {
  return (
    <div className="sec-head" id={id}>
      <div className="sec-icon">{icon}</div>
      <div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.2px' }}>{title}</div>
        {desc && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>}
      </div>
    </div>
  );
}

function LogoUpload({ logoUrl, onFileInput, onLogoRemove, logoChanging }: { logoUrl: string, onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void, onLogoRemove: () => void, logoChanging: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      {logoUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 12, border: '1.5px solid var(--border2)', background: 'var(--surf2)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="btn-ghost" style={{ padding: '7px 16px', fontSize: 12.5 }} disabled={logoChanging} onClick={() => ref.current?.click()}>
              ↑ Change Logo
            </button>
            <button type="button" className="btn-danger" style={{ padding: '7px 16px', fontSize: 12.5 }} disabled={logoChanging} onClick={() => setConfirmOpen(true)}>
              ✕ Remove
            </button>
          </div>
        </div>
      ) : (
        <div onClick={() => !logoChanging && ref.current?.click()} style={{ cursor: logoChanging ? 'default' : 'pointer', borderRadius: 12, border: '1.5px dashed var(--border2)', padding: '28px 20px', textAlign: 'center', transition: 'all .18s', background: 'var(--surf)', opacity: logoChanging ? 0.6 : 1 }}
          onMouseEnter={e => { if(logoChanging) return; e.currentTarget.style.borderColor = 'var(--p)'; e.currentTarget.style.background = 'var(--p-tint)'; }}
          onMouseLeave={e => { if(logoChanging) return; e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surf)'; }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🏛</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-mid)', marginBottom: 4 }}>{logoChanging ? 'Uploading...' : 'Upload Institution Logo'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>PNG, JPG, SVG, WebP · max 2 MB</div>
        </div>
      )}

      {confirmOpen && (
        <div className="fade-in" style={{ marginTop: 12, background: 'var(--red-t)', border: '1px solid var(--red)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 14, color: 'var(--red)', flex: 1, fontWeight: 500 }}>Remove logo? Your profile will show no logo until a new one is uploaded.</span>
          <button type="button" style={{ fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--sans)' }} onClick={() => setConfirmOpen(false)}>Cancel</button>
          <button type="button" className="btn-danger" style={{ padding: '7px 16px', fontSize: 12.5 }} onClick={() => { setConfirmOpen(false); onLogoRemove(); }}>Remove</button>
        </div>
      )}

      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileInput} />
    </div>
  );
}

function RateMeter({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'var(--green)' : rate >= 60 ? 'var(--gold)' : 'var(--red)';
  const label = rate >= 80 ? 'Excellent' : rate >= 60 ? 'Good' : 'Needs attention';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ height: 8, borderRadius: 100, background: 'var(--border)', overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `\${rate}%`, borderRadius: 100, background: color, transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Platform avg: 67%</span>
          <span style={{ fontSize: 11.5, color, fontWeight: 700 }}>{label}</span>
        </div>
      </div>
      <div style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 700, color, letterSpacing: '-1px', flexShrink: 0 }}>{rate}%</div>
    </div>
  );
}

export default function SettingsForm({ settings }: { settings: UniversitySettings }) {
  const [data, setData] = useState({ ...settings })
  const [logoUrl, setLogo] = useState(settings.logo || '')
  const [logoChanging, setLogoChanging] = useState(false)
  const [activeSegment, setActiveSegment] = useState('identity')
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof UniversitySettings, v: any) => setData(d => ({ ...d, [k]: v }))
  const toggleChip = (k: keyof UniversitySettings, v: string) => setData(d => ({
    ...d, [k]: (d as any)[k as keyof typeof d].includes(v) ? (d as any)[k as keyof typeof d].filter((x: string) => x !== v) : [...((d as any)[k as keyof typeof d] || []), v]
  }))

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveSegment(e.target.id) })
    }, { threshold: 0.3 })
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSegment(id)
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
    setLogoChanging(true)
    const r = await removeUniversityLogo()
    if (r.ok) { setLogo(''); toast.success('Logo removed') }
    else toast.error(r.error)
    setLogoChanging(false)
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
      
      nfd.append('quietHoursStart', `\${data.quietHoursStart}:00`)
      nfd.append('quietHoursEnd', `\${data.quietHoursEnd}:00`)
      
      await saveUniversityNotificationPrefs(nfd)

      toast.success('Settings saved successfully')
    })
  }

  const rr = data.responseRate

  return (
    <div className="settings-container">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── TOP HEADER BAR ────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--p)', borderBottom: '1px solid oklch(30% 0.12 265)' }}>
        {/* Partner banner */}
        <div style={{ background: 'oklch(32% 0.13 265)', borderBottom: '1px solid oklch(28% 0.11 265)', padding: '9px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', animation: 'pulseSettings 2s infinite' }} />
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', fontWeight: 500, letterSpacing: '0.3px' }}>
              Complimentary Partner Access · Subscription plans launching 2026
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            IAES Partner Portal
          </span>
        </div>

        {/* Main nav bar */}
        <div style={{ padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L1.5 6v5.25L9 15l7.5-3.75V6L9 1.5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 1.5v11.25M1.5 6l7.5 4.5 7.5-4.5" stroke="white" strokeWidth="1.4"/></svg>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 15, color: '#fff', letterSpacing: '-0.2px' }}>edUmeetup</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>by IAES</div>
              </div>
            </div>
            <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 400, fontStyle: 'italic' }}>
              {data.institutionName}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {data.verificationStatus === 'VERIFIED' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 100, padding: '5px 14px' }}>
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 800 }}>✦ VERIFIED PARTNER</span>
              </div>
            )}
            <button className="btn" style={{ padding: '9px 22px', fontSize: 13, boxShadow: 'none', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }} onClick={() => handleSave(false)} disabled={isPending}>
              {isPending ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spinSettings 0.7s linear infinite', display: 'inline-block' }} />Saving…</> : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Page title strip */}
        <div style={{ padding: '20px 40px 28px', maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            Partner Settings
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 32, fontWeight: 600, color: '#fff', letterSpacing: '-0.5px', marginBottom: 6 }}>
            Institution Profile & Preferences
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: 300, lineHeight: 1.6 }}>
            Control how Indian students discover your university, manage meeting rules, and configure your notification pipeline.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 32, marginTop: 22 }}>
            {[
              { label: 'Response Rate', value: rr != null ? `\${rr}%` : '—', highlight: rr != null && rr >= 80 },
              { label: 'Status', value: data.verificationStatus, highlight: false },
              { label: 'Access', value: 'Complimentary', highlight: false },
              { label: 'IAES Partnership', value: 'Since 1999', highlight: false },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: s.highlight ? 'var(--gold)' : 'rgba(255,255,255,0.85)' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 40px 80px', display: 'grid', gridTemplateColumns: '180px 1fr', gap: 40, alignItems: 'start' }}>

        {/* Left nav */}
        <div style={{ position: 'sticky', top: 28 }} className="fade-in">
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, paddingLeft: 12 }}>Sections</div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map(s => (
              <button key={s.id} className={`nav-item \${activeSegment === s.id ? 'active' : ''}`} onClick={() => scrollTo(s.id)}>
                <span className="nav-dot" />
                {s.label}
              </button>
            ))}
          </nav>

          {/* IAES note */}
          <div style={{ marginTop: 32, padding: '14px 14px', background: 'var(--p-tint)', borderRadius: 12, border: '1px solid var(--p-tint2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--p)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>IAES · Est. 1999</div>
            <div style={{ fontSize: 12, color: 'var(--ink-mid)', lineHeight: 1.6, fontWeight: 300 }}>
              25 years connecting India's brightest students with global universities.
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="fade-up">

          {/* ── 1. INSTITUTION IDENTITY ──────────────────────────────────── */}
          <div className="sec" id="identity">
            <SectionHead icon="◈" id="identity" title="Institution Identity" desc="Core details of your institution — used for verification and public listing." />
            <div className="sec-body">
              <div className="fg">
                <label className="lbl">Institution Name</label>
                <input className="f" value={data.institutionName} disabled />
                <div className="sub">To change your official institution name, contact the IAES support team.</div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Country *</label>
                  <select className="f" value={data.country || ''} onChange={e => set('country', e.target.value)}>
                    <option value="">Select country</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Timezone</label>
                  <select className="f" value={data.timezone || ''} onChange={e => set('timezone', e.target.value)}>
                    <option value="">Select timezone</option>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Institution Type</label>
                <div className="cw">
                  {UNI_TYPES.map(t => (
                    <div key={t} className={`chip \${data.universityType === t ? 'on' : ''}`} onClick={() => set('universityType', data.universityType === t ? '' : t)}>{t}</div>
                  ))}
                </div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Accreditations</label>
                  <input className="f" placeholder="e.g. AACSB, EQUIS, NAAC A+" value={data.accreditation || ''} onChange={e => set('accreditation', e.target.value)} />
                </div>
                <div className="fg">
                  <label className="lbl">Indian Students Target / Year</label>
                  <select className="f" value={data.indianStudentTarget || ''} onChange={e => set('indianStudentTarget', e.target.value)}>
                    <option value="">Select range</option>
                    {STUDENT_TARGETS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">QS World Ranking</label>
                  <input className="f" type="number" placeholder="e.g. 34" value={data.rankingQS || ''} onChange={e => set('rankingQS', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div className="fg">
                  <label className="lbl">THE World Ranking</label>
                  <input className="f" type="number" placeholder="e.g. 18" value={data.rankingTHE || ''} onChange={e => set('rankingTHE', e.target.value ? Number(e.target.value) : null)} />
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. PUBLIC PROFILE ─────────────────────────────────────────── */}
          <div className="sec" id="profile">
            <SectionHead icon="◎" id="profile" title="Public Profile" desc="How pre-screened Indian students discover and evaluate your institution." />
            <div className="sec-body">

              {/* Logo */}
              <div className="fg">
                <label className="lbl">Institution Logo</label>
                <LogoUpload
                  logoUrl={logoUrl}
                  onFileInput={handleLogoChange}
                  onLogoRemove={handleLogoRemove}
                  logoChanging={logoChanging}
                />
              </div>

              <div className="g2">
                <div className="fg">
                  <label className="lbl">Official Website *</label>
                  <input className="f" type="url" placeholder="https://…" value={data.website || ''} onChange={e => set('website', e.target.value)} />
                </div>
                <div className="fg">
                  <label className="lbl">Public Contact Email *</label>
                  <input className="f" type="email" placeholder="admissions@university.edu" value={data.contactEmail || ''} onChange={e => set('contactEmail', e.target.value)} />
                  <div className="sub">Must be an official institutional domain.</div>
                </div>
              </div>

              <div className="fg">
                <label className="lbl">LinkedIn Page</label>
                <input className="f" type="url" placeholder="https://linkedin.com/school/…" value={data.linkedin || ''} onChange={e => set('linkedin', e.target.value)} />
              </div>

              <div className="fg">
                <label className="lbl">Institution Description</label>
                <div className="sub" style={{ marginBottom: 8 }}>Shown on your public profile. 2–4 sentences. Write for a prospective Indian undergraduate or postgraduate student.</div>
                <textarea className="f" rows={4} style={{ resize: 'vertical', lineHeight: 1.65 }} value={data.description || ''} onChange={e => set('description', e.target.value)} />
                <div className="sub" style={{ textAlign: 'right' }}>{(data.description || '').length} / 600 characters</div>
              </div>

              {/* Public toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderRadius: 10, border: '1.5px solid var(--border2)', background: 'var(--surf)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Publicly Listed</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Visible to all pre-screened Indian students on edUmeetup</div>
                </div>
                <Toggle id="isPublic" checked={data.isPublic} onChange={v => set('isPublic', v)} />
              </div>

              {/* Response rate */}
              {rr != null && (
                <div style={{ marginTop: 20, padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border2)', background: 'var(--surf)' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Your Response Rate</div>
                  <RateMeter rate={rr} />
                  <div className="sub" style={{ marginTop: 10 }}>Faster responses improve your ranking in student search results. Target: ≥ 80%.</div>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. PROGRAMS & INTAKE ──────────────────────────────────────── */}
          <div className="sec" id="programs">
            <SectionHead icon="◇" id="programs" title="Programs & Intake" desc="Tell students which programs you offer and when you accept applications." />
            <div className="sec-body">
              <div className="fg">
                <label className="lbl">Programs Offered</label>
                <div className="sub" style={{ marginBottom: 10 }}>Select all that you actively recruit Indian students for.</div>
                <div className="cw">
                  {PROGRAMS_PRESET.map(p => (
                    <div key={p} className={`chip \${data.programs.includes(p) ? 'on' : ''}`} onClick={() => toggleChip('programs', p)}>
                      {data.programs.includes(p) && <span style={{ fontSize: 10 }}>✓</span>} {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="fg">
                <label className="lbl">Intake Months</label>
                <div className="cw">
                  {INTAKES.map(m => (
                    <div key={m} className={`chip \${data.intakeMonths.includes(m) ? 'on-gold' : ''}`}
                      style={data.intakeMonths.includes(m) ? { borderColor: 'var(--gold-d)', background: 'var(--gold-d)', color: '#fff' } : {}}
                      onClick={() => toggleChip('intakeMonths', m)}>
                      {data.intakeMonths.includes(m) && <span style={{ fontSize: 10 }}>✓</span>} {m}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. MEETING RULES ──────────────────────────────────────────── */}
          <div className="sec" id="meetings">
            <SectionHead icon="⊞" id="meetings" title="Meeting Rules" desc="Control exactly how students can book counselling sessions with your team." />
            <div className="sec-body">
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Default Duration (min)</label>
                  <input className="f" type="number" min={15} max={240} value={data.defaultDuration} onChange={e => set('defaultDuration', Number(e.target.value))} />
                  <div className="sub">15 – 240 minutes per session.</div>
                </div>
                <div className="fg">
                  <label className="lbl">Daily Cap per Rep</label>
                  <input className="f" type="number" min={1} max={50} value={data.dailyCapPerRep} onChange={e => set('dailyCapPerRep', Number(e.target.value))} />
                  <div className="sub">Max meetings one rep handles per day.</div>
                </div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Min Lead Time (hours)</label>
                  <input className="f" type="number" min={0} max={168} value={data.minLeadTimeHours} onChange={e => set('minLeadTimeHours', Number(e.target.value))} />
                  <div className="sub">Students must book at least this far ahead.</div>
                </div>
                <div className="fg">
                  <label className="lbl">Buffer Between Meetings (min)</label>
                  <input className="f" type="number" min={0} max={120} value={data.bufferMinutes} onChange={e => set('bufferMinutes', Number(e.target.value))} />
                </div>
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="lbl">Cancellation Window (hours)</label>
                  <input className="f" type="number" min={0} max={168} value={data.cancellationWindowHours} onChange={e => set('cancellationWindowHours', Number(e.target.value))} />
                  <div className="sub">Students can cancel up to this many hours before.</div>
                </div>
                <div className="fg">
                  <label className="lbl">Approval Mode</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[['MANUAL','Manual Approval','Your team confirms each booking'],['AUTOMATIC','Automatic Approval','Bookings confirmed instantly']].map(([val, label, desc]) => (
                      <div key={val} className={`rc \${data.approvalMode === val ? 'on' : ''}`} onClick={() => set('approvalMode', val)}>
                        <div className="rd" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Whereby */}
              <div style={{ marginTop: 4, padding: '18px 20px', borderRadius: 12, border: '1.5px dashed var(--border2)', background: 'var(--surf)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <label className="lbl" style={{ margin: 0 }}>Whereby API Key</label>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--p-tint2)', color: 'var(--p)', padding: '2px 9px', borderRadius: 100 }}>OPTIONAL</span>
                </div>
                <input className="f" type="password" placeholder="Use your own Whereby account for meetings" value={data.wherebyApiKey || ''} onChange={e => set('wherebyApiKey', e.target.value)} />
                <div className="sub">Leave blank to use edUmeetup's shared meeting infrastructure.</div>
              </div>
            </div>
          </div>

          {/* ── 5. NOTIFICATIONS ──────────────────────────────────────────── */}
          <div className="sec" id="notifications">
            <SectionHead icon="◉" id="notifications" title="Notifications" desc="Configure your alert pipeline — what you hear about, when, and who gets notified." />
            <div className="sec-body">

              {/* Pipeline alerts */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, background: 'oklch(72% 0.17 65 / 0.15)', color: 'var(--gold-d)', padding: '2px 9px', borderRadius: 100, fontWeight: 700 }}>INSTANT</span>
                  Pipeline Alerts
                </div>
                {[
                  { k: 'notifyNewInterest',      label: 'New student interest',    desc: 'Triggered the moment a student expresses interest in your university.', badge: 'High impact', bc: 'var(--green-t)', bt: 'var(--green)' },
                  { k: 'notifyMeetingBooked',    label: 'Meeting booked',          desc: 'Sent when a student schedules a counselling session with your team.',   badge: 'Recommended', bc: 'var(--p-tint2)', bt: 'var(--p)' },
                  { k: 'notifyMeetingCancelled', label: 'Meeting cancelled',       desc: 'Sent if a student cancels a confirmed meeting.' },
                ].map(n => (
                  <div key={n.k} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{n.label}</span>
                        {n.badge && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: n.bc, color: n.bt }}>{n.badge}</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{n.desc}</div>
                    </div>
                    <Toggle id={n.k} checked={(data as any)[n.k]} onChange={v => set(n.k as keyof UniversitySettings, v)} />
                  </div>
                ))}
              </div>

              {/* Daily brief */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, background: 'var(--p-tint2)', color: 'var(--p)', padding: '2px 9px', borderRadius: 100, fontWeight: 700 }}>DAILY</span>
                  Morning Brief
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>Daily pipeline briefing</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>Sent at 9:00 AM IST — only when there's something worth reporting. Includes new interests, pending responses, upcoming meetings, and your response rate.</div>
                  </div>
                  <Toggle id="digestDaily" checked={data.digestDaily} onChange={v => set('digestDaily', v)} />
                </div>
              </div>

              {/* SLA */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Response SLA Threshold</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>How long before edUmeetup reminds you of an unanswered student interest. Faster responses improve your search ranking.</div>
                <div className="g3">
                  {[['24','Same day','24h'],['48','Standard','48h'],['72','Relaxed','72h']].map(([val, sub, label]) => (
                    <div key={val} className={`rc \${data.followUpThresholdHours == Number(val) ? 'on' : ''}`} onClick={() => set('followUpThresholdHours', Number(val))} style={{ flexDirection: 'column', gap: 4, textAlign: 'center', padding: '16px 12px' }}>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 700, color: data.followUpThresholdHours == Number(val) ? 'var(--p)' : 'var(--ink)', lineHeight: 1 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{sub}</div>
                      {val === '48' && <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)' }}>Recommended</div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Who gets notified */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Who Gets Notified</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[['PRIMARY','Primary contact only','Only the main account holder receives alert emails.'],['ALL','All team members','All registered reps receive emails. Coming soon.']].map(([val, label, desc]) => (
                    <div key={val} className={`rc \${data.notifyTarget === val ? 'on' : ''}`} style={{ flex: 1, flexDirection: 'column', gap: 6, alignItems: 'flex-start' }} onClick={() => set('notifyTarget', val)}>
                      <div className="rd" />
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)' }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</div>
                      {val === 'ALL' && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', border: '1px solid var(--border2)', borderRadius: 100, padding: '1px 8px' }}>Coming soon</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiet hours */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>Quiet Hours</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Pause non-urgent alerts during off-hours. Times in IST.</div>
                  </div>
                  <Toggle id="quietHoursEnabled" checked={data.quietHoursEnabled} onChange={v => set('quietHoursEnabled', v)} />
                </div>
                {data.quietHoursEnabled && (
                  <div className="g2 fade-in">
                    <div className="fg">
                      <label className="lbl">Quiet from (IST)</label>
                      <input className="f" type="time" value={`\${String(data.quietHoursStart).padStart(2, '0')}:00`} onChange={e => set('quietHoursStart', parseInt(e.target.value))} />
                    </div>
                    <div className="fg">
                      <label className="lbl">Quiet until (IST)</label>
                      <input className="f" type="time" value={`\${String(data.quietHoursEnd).padStart(2, '0')}:00`} onChange={e => set('quietHoursEnd', parseInt(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SAVE FOOTER ───────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', background: '#fff', borderRadius: 14, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400 }}>
              Changes apply immediately to your public profile and notification pipeline.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" onClick={() => handleSave(false)} disabled={isPending}>
                {isPending
                  ? <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spinSettings 0.7s linear infinite', display: 'inline-block' }} />Saving…</>
                  : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
