'use client'

import { useState, useRef, useEffect } from "react"
import { TurnstileWidget } from '@/components/ui/TurnstileWidget'
import { registerStudent } from "@/app/actions"
import { toast } from "sonner"
import { DegreeLevels } from "@/lib/constants"
import { COMMON_TYPO_DOMAINS } from "@/lib/schemas"

// ─── Constants ──────────────────────────────────────────────────────────────
const STEPS = [
    { id: 1, label: "Personal", icon: "01" },
    { id: 2, label: "Academic & Goals", icon: "02" },
    { id: 3, label: "Preferences", icon: "03" },
    { id: 4, label: "Test Scores", icon: "04" },
]

const COUNTRIES = ["USA", "UK", "Canada", "Australia", "Germany", "New Zealand", "Singapore", "France", "Sweden", "Denmark", "Ireland", "Italy"]
const INTAKES = ["Fall", "Spring", "Summer", "Flexible"]
const BUDGETS = ["< 15,000", "15,000–25,000", "25,000–40,000", "40,000+"]
const ENGLISH_TESTS = ["Not Taken Yet", "IELTS", "TOEFL", "Duolingo", "PTE"]

// ─── CSS Injection ───────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary:       oklch(37.9% 0.146 265.522);
    --primary-mid:   oklch(48% 0.18 265);
    --primary-lite:  oklch(60% 0.18 265);
    --primary-tint:  oklch(95% 0.04 265);
    --primary-tint2: oklch(92% 0.06 265);
    --gold:          oklch(72% 0.17 65);
    --gold-deep:     oklch(58% 0.18 58);
    --gold-tint:     oklch(97% 0.04 80);
    --surface:       oklch(99% 0.005 265);
    --surface2:      oklch(97% 0.01 265);
    --border:        oklch(90% 0.03 265);
    --border2:       oklch(85% 0.05 265);
    --text:          oklch(18% 0.03 265);
    --text-mid:      oklch(40% 0.04 265);
    --text-muted:    oklch(60% 0.04 265);
    --success:       oklch(65% 0.15 150);
    --serif:         'Fraunces', Georgia, serif;
    --sans:          'Plus Jakarta Sans', system-ui, sans-serif;
  }

  ::selection { background: var(--gold); color: var(--primary); }

  @keyframes fadeUp    { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
  @keyframes float     { 0%,100% { transform:translateY(0) rotate(-0.5deg); } 50% { transform:translateY(-10px) rotate(0.5deg); } }
  @keyframes pulse-dot { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(0.85); } }
  @keyframes pop       { 0% { opacity:0; transform:scale(0.9) translateY(10px); } 70% { transform:scale(1.02); } 100% { opacity:1; transform:scale(1) translateY(0); } }
  @keyframes count-up  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin      { to { transform:rotate(360deg); } }
  @keyframes slide-in  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slide-out { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }

  .fade-up  { animation: fadeUp 0.6s cubic-bezier(.22,.68,0,1.2) both; }
  .fade-in  { animation: fadeIn 0.4s ease both; }
  .float    { animation: float 5s ease-in-out infinite; }
  .pop      { animation: pop 0.5s cubic-bezier(.22,.68,0,1.2) both; }
  .step-fwd { animation: slide-in  0.25s cubic-bezier(.22,.68,0,1.2) both; }
  .step-bwd { animation: slide-out 0.25s cubic-bezier(.22,.68,0,1.2) both; }

  .field {
    width:100%; padding:13px 16px; border-radius:10px;
    border:1.5px solid var(--border2); background:var(--surface);
    font-size:14.5px; color:var(--text); font-family:var(--sans);
    transition:border-color .2s, box-shadow .2s, background .2s;
  }
  .field:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px oklch(37.9% 0.146 265.522 / 0.12); background:#fff; }
  .field::placeholder { color:var(--text-muted); }

  .chip {
    display:inline-flex; align-items:center; gap:5px;
    padding:7px 14px; border-radius:100px;
    border:1.5px solid var(--border2); background:var(--surface);
    font-size:13px; font-weight:500; cursor:pointer;
    transition:all .15s; color:var(--text-mid); user-select:none;
    font-family:var(--sans);
  }
  .chip:hover  { border-color:var(--primary); color:var(--primary); background:var(--primary-tint); }
  .chip.on     { border-color:var(--primary); background:var(--primary); color:#fff; }

  .rcard {
    padding:12px 16px; border-radius:11px; border:1.5px solid var(--border2);
    background:var(--surface); cursor:pointer; transition:all .15s;
    font-size:13.5px; color:var(--text-mid); display:flex; align-items:center; gap:12px;
    font-family:var(--sans);
  }
  .rcard:hover { border-color:var(--primary-mid); background:var(--primary-tint); color:var(--text); }
  .rcard.on    { border-color:var(--primary); background:var(--primary-tint2); color:var(--primary); font-weight:600; }
  .rdot { width:17px; height:17px; border-radius:50%; border:2px solid var(--border2); flex-shrink:0; transition:all .15s; position:relative; }
  .rcard.on .rdot { border-color:var(--primary); background:var(--primary); }
  .rdot::after { content:''; position:absolute; inset:3px; border-radius:50%; background:#fff; opacity:0; transition:opacity .15s; }
  .rcard.on .rdot::after { opacity:1; }

  .btn-primary {
    padding:13px 32px; border-radius:100px; border:none;
    background:var(--primary); color:#fff;
    font-family:var(--sans); font-size:14.5px; font-weight:700;
    cursor:pointer; transition:all .22s; letter-spacing:0.15px;
    box-shadow:0 4px 20px oklch(37.9% 0.146 265.522 / 0.3);
    display:inline-flex; align-items:center; gap:9px;
  }
  .btn-primary:hover:not(:disabled) { background:var(--primary-mid); transform:translateY(-1px); box-shadow:0 8px 28px oklch(37.9% 0.146 265.522 / 0.38); }
  .btn-primary:active { transform:translateY(0); }
  .btn-primary:disabled { opacity:0.55; cursor:default; }

  .btn-ghost {
    padding:12px 22px; border-radius:100px; border:1.5px solid var(--border2);
    background:transparent; color:var(--text-muted);
    font-family:var(--sans); font-size:14px; font-weight:600; cursor:pointer; transition:all .18s;
  }
  .btn-ghost:hover { border-color:var(--primary); color:var(--primary); background:var(--primary-tint); }

  .lbl  { font-size:12.5px; font-weight:700; color:var(--text-mid); margin-bottom:7px; display:block; letter-spacing:0.3px; text-transform:uppercase; }
  .sub  { font-size:12px; color:var(--text-muted); margin-bottom:10px; display:block; line-height:1.5; }
  .fg   { margin-bottom:22px; }
  .g2   { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .cw   { display:flex; flex-wrap:wrap; gap:8px; }
  .rg   { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
`

// ─── Tiny components ──────────────────────────────────────────────────────────
const Chip = ({ label, active, onClick }: any) => (
    <div className={`chip ${active ? "on" : ""}`} onClick={onClick}>
        {active && <span style={{ fontSize: 10 }}>✓</span>}{label}
    </div>
)

const RCard = ({ label, active, onClick }: any) => (
    <div className={`rcard ${active ? "on" : ""}`} onClick={onClick}>
        <div className="rdot" /><span>{label}</span>
    </div>
)

// ─── Social Proof Logic ───────────────────────────────────────────────────────
function getSocialProof(count: number | null) {
    if (count === null) return { badge: null, bubble: null }

    if (count < 100) {
        return {
            badge: { emoji: "🌱", text: "Founding Explorer", sub: "You're among our very first" },
            bubble: {
                headline: "Hey — you propel our confidence.",
                body: "You're one of the very first students on EdUmeetup. Our platform exists because of explorers like you. Thank you for being here.",
                cta: "Be a Founding Explorer",
                tag: "FOUNDING MEMBER",
            },
        }
    }

    if (count < 500) {
        return {
            badge: { emoji: "🚀", text: "100+ Students", sub: "are already exploring" },
            bubble: {
                headline: `${count}+ students have found their path.`,
                body: "Join a growing community of Indian students connecting directly with verified universities — no agents, no fees.",
                cta: "Join the Community",
                tag: "GROWING FAST",
            },
        }
    }

    const formatted = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count.toString()

    return {
        badge: { emoji: "✦", text: `${formatted} Students`, sub: "have profiles on EdUmeetup" },
        bubble: {
            headline: `${formatted} students already here.`,
            body: `Welcome to join the explorers. Every one of them connected directly with international universities — no middlemen, no commission.`,
            cta: "Create Your Profile",
            tag: "VERIFIED COUNT",
        },
    }
}

function SocialProofBubble({ count }: { count: number | null }) {
    const proof = getSocialProof(count)
    if (!proof.bubble) return (
        <div style={{ padding: "20px", background: "rgba(255,255,255,0.06)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", animation: "shimmer 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Loading live count…</span>
        </div>
    )

    const b = proof.bubble
    return (
        <div className="float" style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(8px)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", padding: "22px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--gold)", borderRadius: 100, padding: "3px 12px", marginBottom: 14 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", animation: "pulse-dot 1.8s infinite" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", letterSpacing: "0.8px" }}>{b.tag}</span>
            </div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, color: "#fff", lineHeight: 1.3, marginBottom: 10, letterSpacing: "-0.3px", animation: count !== null ? "count-up 0.5s ease both" : "none" }}>
                {b.headline}
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 18, fontWeight: 300 }}>
                {b.body}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", animation: "pulse-dot 2s infinite" }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                    {count !== null ? "Live count · Updates in real time" : "Fetching count…"}
                </span>
            </div>
        </div>
    )
}

// ─── Form Steps ───────────────────────────────────────────────────────────────
function Step1({ form, set }: any) {
    return (
        <div>
            <div className="fg">
                <label className="lbl">Full Name *</label>
                <input className="field" placeholder="John Doe" value={form.fullName} onChange={e => set("fullName", e.target.value)} />
            </div>
            <div className="g2">
                <div className="fg">
                    <label className="lbl">Gender *</label>
                    <div className="rg">
                        {["Male", "Female", "Prefer not to say"].map(g => (
                            <RCard key={g} label={g} active={form.gender === g} onClick={() => set("gender", g)} />
                        ))}
                    </div>
                </div>
                <div className="fg">
                    <label className="lbl">Age Group *</label>
                    <select className="field" value={form.ageGroup} onChange={e => set("ageGroup", e.target.value)}>
                        <option value="">Select Age Group</option>
                        {["Under 20", "21-25", "26-30", "31+"].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
            <div className="fg">
                <label className="lbl">Email Address *</label>
                <input className="field" type="email" placeholder="john@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
            </div>
            <div className="fg">
                <label className="lbl">Confirm Email Address *</label>
                <input 
                    className="field" 
                    type="email" 
                    placeholder="john@example.com" 
                    value={form.confirmEmail} 
                    onChange={e => set("confirmEmail", e.target.value)} 
                    onPaste={(e) => {
                        e.preventDefault();
                        toast.error("Please type your email to confirm");
                    }} 
                />
            </div>
            <div className="g2">
                <div className="fg">
                    <label className="lbl">Mobile Number *</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <span className="field" style={{ width: "80px", flexShrink: 0, textAlign: "center", background: "var(--surface2)", color: "var(--text-muted)" }}>+91</span>
                        <input className="field" placeholder="98765 43210" value={form.phone} onChange={e => set("phone", e.target.value)} />
                    </div>
                </div>
                <div className="fg">
                    <label className="lbl">WhatsApp (Optional)</label>
                    <input className="field" placeholder="98765 43210" value={form.whatsappNumber} onChange={e => set("whatsappNumber", e.target.value)} />
                </div>
            </div>
            <div className="g2">
                <div className="fg">
                    <label className="lbl">City / Town *</label>
                    <input className="field" placeholder="Mumbai" value={form.city} onChange={e => set("city", e.target.value)} />
                </div>
                <div className="fg">
                    <label className="lbl">PIN Code *</label>
                    <input className="field" placeholder="400001" value={form.pincode} onChange={e => set("pincode", e.target.value)} />
                </div>
            </div>
        </div>
    )
}

function Step2({ form, set }: any) {
    return (
        <div>
            <div className="fg">
                <label className="lbl">Current Education Level *</label>
                <select className="field" value={form.currentStatus} onChange={e => set("currentStatus", e.target.value)}>
                    <option value="">Select Status</option>
                    {["Grade 12", "Bachelor Final Year", "Bachelor Completed", "Master Completed", "Working Professional"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
            <div className="fg">
                <label className="lbl">Degree Level You're Targeting *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {DegreeLevels.map(d => <RCard key={d.value} label={d.label} active={form.preferredDegree === d.value} onClick={() => set("preferredDegree", d.value)} />)}
                </div>
            </div>
            <div className="fg">
                <label className="lbl">Field of Interest</label>
                <div className="cw">
                    {["Computer Science", "Engineering", "Business", "Data Science", "Health Sciences", "Social Sciences", "Arts & Humanities", "Law", "Architecture", "Others"].map(s => (
                        <Chip key={s} label={s} active={form.fieldOfInterest === s} onClick={() => set("fieldOfInterest", s)} />
                    ))}
                </div>
            </div>
        </div>
    )
}

function Step3({ form, set, toggle }: any) {
    return (
        <div>
            <div className="fg">
                <label className="lbl">Preferred Study Countries (Optional)</label>
                <span className="sub">Select any that interest you</span>
                <div className="cw">
                    {COUNTRIES.map(c => <Chip key={c} label={c} active={form.countries.includes(c)} onClick={() => toggle("countries", c)} />)}
                </div>
            </div>
            <div className="fg">
                <label className="lbl">Preferred Intake</label>
                <div className="rg">
                    {INTAKES.map(i => <RCard key={i} label={i} active={form.intake === i} onClick={() => set("intake", i)} />)}
                </div>
            </div>
            <div className="fg">
                <label className="lbl">Annual Budget (USD)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {BUDGETS.map(b => <RCard key={b} label={b} active={form.budgetRange === b} onClick={() => set("budgetRange", b)} />)}
                </div>
            </div>
        </div>
    )
}

function Step4({ form, set }: any) {
    const isUndergrad = form.preferredDegree === "Associate" || form.preferredDegree === "Bachelor's"
    const isGrad = form.preferredDegree === "Master's" || form.preferredDegree === "MBA" || form.preferredDegree === "PhD"

    return (
        <div>
            <div className="fg">
                <label className="lbl">English Proficiency Tests *</label>
                <div className="cw">
                    {ENGLISH_TESTS.map(t => <Chip key={t} label={t} active={form.englishTestType === t} onClick={() => set("englishTestType", t)} />)}
                </div>
            </div>
            {form.englishTestType && form.englishTestType !== 'Not Taken Yet' && (
                <div className="fg">
                    <label className="lbl">English Test Score</label>
                    <input className="field" type="number" step="0.5" placeholder="e.g. 7.5 or 100" value={form.englishScore} onChange={e => set("englishScore", e.target.value)} />
                </div>
            )}

            {isGrad && (
                <>
                    <div className="g2">
                        <div className="fg">
                            <label className="lbl">GRE Taken?</label>
                            <span className="sub" style={{ fontSize: 11, marginBottom: 8, marginTop: -4 }}>The GRE is for most graduate programs. <a href="https://www.ets.org/gre" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Official Site</a></span>
                            <div className="rg">
                                <RCard label="Yes" active={form.greTaken === 'yes'} onClick={() => set("greTaken", 'yes')} />
                                <RCard label="No" active={form.greTaken === 'no'} onClick={() => { set("greTaken", 'no'); set("greScore", "") }} />
                            </div>
                        </div>
                        <div className="fg">
                            <label className="lbl">GMAT Taken?</label>
                            <span className="sub" style={{ fontSize: 11, marginBottom: 8, marginTop: -4 }}>The GMAT is primarily for business schools. <a href="https://www.mba.com/exams/gmat-exam" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Official Site</a></span>
                            <div className="rg">
                                <RCard label="Yes" active={form.gmatTaken === 'yes'} onClick={() => set("gmatTaken", 'yes')} />
                                <RCard label="No" active={form.gmatTaken === 'no'} onClick={() => { set("gmatTaken", 'no'); set("gmatScore", "") }} />
                            </div>
                        </div>
                    </div>
                    <div className="g2">
                        {form.greTaken === 'yes' && (
                            <div className="fg">
                                <label className="lbl">GRE Score (out of 340)</label>
                                <input className="field" type="number" min="260" max="340" placeholder="e.g. 320" value={form.greScore} onChange={e => set("greScore", e.target.value)} />
                            </div>
                        )}
                        {form.gmatTaken === 'yes' && (
                            <div className="fg">
                                <label className="lbl">GMAT Score (out of 800)</label>
                                <input className="field" type="number" min="200" max="800" placeholder="e.g. 680" value={form.gmatScore} onChange={e => set("gmatScore", e.target.value)} />
                            </div>
                        )}
                    </div>
                </>
            )}

            {isUndergrad && (
                <>
                    <div className="g2">
                        <div className="fg">
                            <label className="lbl">SAT Taken?</label>
                            <span className="sub" style={{ fontSize: 11, marginBottom: 8, marginTop: -4 }}>Standardized test for college admissions. <a href="https://satsuite.collegeboard.org/sat" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Official Site</a></span>
                            <div className="rg">
                                <RCard label="Yes" active={form.satTaken === 'yes'} onClick={() => set("satTaken", 'yes')} />
                                <RCard label="No" active={form.satTaken === 'no'} onClick={() => { set("satTaken", 'no'); set("satScore", "") }} />
                            </div>
                        </div>
                        <div className="fg">
                            <label className="lbl">ACT Taken?</label>
                            <span className="sub" style={{ fontSize: 11, marginBottom: 8, marginTop: -4 }}>Alternative to the SAT for college admissions. <a href="https://www.act.org/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>Official Site</a></span>
                            <div className="rg">
                                <RCard label="Yes" active={form.actTaken === 'yes'} onClick={() => set("actTaken", 'yes')} />
                                <RCard label="No" active={form.actTaken === 'no'} onClick={() => { set("actTaken", 'no'); set("actScore", "") }} />
                            </div>
                        </div>
                    </div>
                    <div className="g2">
                        {form.satTaken === 'yes' && (
                            <div className="fg">
                                <label className="lbl">SAT Score (400-1600)</label>
                                <input className="field" type="number" min="400" max="1600" placeholder="e.g. 1350" value={form.satScore} onChange={e => set("satScore", e.target.value)} />
                            </div>
                        )}
                        {form.actTaken === 'yes' && (
                            <div className="fg">
                                <label className="lbl">ACT Score (1-36)</label>
                                <input className="field" type="number" min="1" max="36" placeholder="e.g. 29" value={form.actScore} onChange={e => set("actScore", e.target.value)} />
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="fg">
                <input type="text" name="website_url" className="hidden" aria-hidden="true" autoComplete="off" tabIndex={-1} value={form.website_url} onChange={e => set("website_url", e.target.value)} />
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudentRegisterForm({ initialCount }: { initialCount: number }) {
    const [view, setView] = useState("form")   // form | done
    const [step, setStep] = useState(1)
    const [dir, setDir] = useState(1)
    const [animKey, setAnimKey] = useState(0)
    const [busy, setBusy] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
    const [turnstileError, setTurnstileError] = useState(false)

    const [form, setForm] = useState({
        fullName: "", email: "", confirmEmail: "", gender: "", ageGroup: "", phone: "", whatsappNumber: "", city: "", pincode: "",
        currentStatus: "", fieldOfInterest: "", preferredDegree: "",
        countries: [] as string[], intake: "", budgetRange: "",
        englishTestType: "", englishScore: "",
        greTaken: "no", greScore: "", gmatTaken: "no", gmatScore: "",
        satTaken: "no", satScore: "", actTaken: "no", actScore: "", website_url: ""
    })

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
    const toggle = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x: string) => x !== v) : [...f[k], v] }))

    const goTo = (n: number) => {
        setDir(n > step ? 1 : -1)
        setStep(n)
        setAnimKey(k => k + 1)
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
    }

    const validateStep = () => {
        if (step === 1) {
            if (!form.fullName || form.fullName.length < 2) { toast.error("Full name is required"); return false }
            if (!form.email || !form.email.includes('@')) { toast.error("Valid email is required"); return false }
            if (form.email !== form.confirmEmail) { toast.error("Email addresses do not match"); return false }
            if (COMMON_TYPO_DOMAINS[form.email.split('@')[1] ?? '']) { toast.error("There appears to be a typo in your email domain"); return false }
            if (!form.gender) { toast.error("Gender is required"); return false }
            if (!form.ageGroup) { toast.error("Age group is required"); return false }
            if (!form.city) { toast.error("City is required"); return false }
            if (!form.pincode || form.pincode.length < 4) { toast.error("PIN Code is required"); return false }
        }
        if (step === 2) {
            if (!form.currentStatus) { toast.error("Current education status is required"); return false }
        }
        if (step === 3) {
            if (!form.preferredDegree) { toast.error("Degree level you're targeting is required"); return false }
        }
        return true
    }

    const submit = async () => {
        if (!validateStep()) return

        setBusy(true)

        const fd = new FormData()
        fd.append("fullName", form.fullName)
        fd.append("email", form.email)
        fd.append("gender", form.gender)
        fd.append("ageGroup", form.ageGroup)
        fd.append("city", form.city)
        fd.append("pincode", form.pincode)
        fd.append("phoneNumber", "+91 " + form.phone)
        if (form.whatsappNumber) fd.append("whatsappNumber", "+91 " + form.whatsappNumber)
        
        fd.append("currentStatus", form.currentStatus)
        if (form.fieldOfInterest) fd.append("fieldOfInterest", form.fieldOfInterest)
        if (form.preferredDegree) fd.append("preferredDegree", form.preferredDegree)
        
        if (form.budgetRange) fd.append("budgetRange", form.budgetRange)
        if (form.intake) fd.append("preferredIntake", form.intake)
        if (form.countries.length > 0) fd.append("preferredCountries", form.countries.join(", "))
        
        if (form.englishTestType) fd.append("englishTestType", form.englishTestType)
        if (form.englishScore) fd.append("englishScore", form.englishScore)
        
        if (form.greTaken === 'yes') fd.append("greScore", form.greScore)
        if (form.gmatTaken === 'yes') fd.append("gmatScore", form.gmatScore)
        if (form.satTaken === 'yes') fd.append("satScore", form.satScore)
        if (form.actTaken === 'yes') fd.append("actScore", form.actScore)
        
        if (form.website_url) fd.append("website_url", form.website_url)
        fd.append("cf-turnstile-response", turnstileToken || "")

        try {
            const res = await registerStudent(null, fd)
            if (res.error) {
                const msg = typeof res.error === 'string' ? res.error : "Please check your form inputs."
                toast.error(msg)
                setBusy(false)
            } else {
                toast.success(res.message || "Account created!")
                setView("done")
            }
        } catch (e) {
            toast.error("An unexpected error occurred.")
            setBusy(false)
        }
    }

    const currentStepObj = STEPS.find(s => s.id === step)
    const pct = ((step - 1) / (STEPS.length - 1)) * 100

    if (view === "done") return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface2)", fontFamily: "var(--sans)", padding: 24 }}>
            <style>{CSS}</style>
            <div className="pop" style={{ textAlign: "center", maxWidth: 500 }}>
                <div style={{ width: 88, height: 88, borderRadius: "50%", background: "var(--primary)", margin: "0 auto 28px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px oklch(37.9% 0.146 265.522 / 0.35)" }}>
                    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                        <path d="M10 19l6 7 12-13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 600, color: "var(--primary)", marginBottom: 12, letterSpacing: "-0.5px", lineHeight: 1.2 }}>
                    Welcome to EdUmeetup, {form.fullName.split(' ')[0]}!
                </div>
                <p style={{ fontSize: 16, color: "var(--text-muted)", lineHeight: 1.75, fontWeight: 300, marginBottom: 10 }}>
                    We've sent a magic login link to <strong>{form.email}</strong> to verify your account.
                </p>
                {initialCount !== null && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--gold-tint)", border: "1px solid oklch(72% 0.17 65 / 0.3)", borderRadius: 100, padding: "6px 16px", marginBottom: 32 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold-deep)" }}>
                            You are explorer #{initialCount < 100 ? initialCount + 1 : initialCount.toLocaleString()} on EdUmeetup
                        </span>
                    </div>
                )}
                <div style={{ background: "var(--primary-tint)", borderRadius: 16, padding: "20px 24px", textAlign: "left", border: "1px solid var(--border2)" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>What happens next</div>
                    {[
                        "Open the email we just sent you",
                        "Click the secure login link inside",
                        "Universities will discover you directly — no agents",
                    ].map((t, i) => (
                        <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < 2 ? 12 : 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                            <span style={{ fontSize: 14, color: "var(--text-mid)", lineHeight: 1.55 }}>{t}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    return (
        <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--sans)", background: "var(--surface2)" }}>
            <style>{CSS}</style>

            {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
            <div className="hidden lg:flex" style={{ width: 310, flexShrink: 0, background: "var(--primary)", padding: "36px 32px", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
                {/* Decorative rings */}
                {([[-60, -60, 200], [-30, -30, 120], [undefined, -80, 240]] as [number | undefined, number, number][]).map(([t, r, s], i) => (
                    <div key={i} style={{ position: "absolute", top: t ?? "auto", bottom: t === undefined ? -80 : "auto", right: r, left: t === undefined ? -40 : "auto", width: s, height: s, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.07)", pointerEvents: "none" }} />
                ))}

                {/* Logo */}
                <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44, textDecoration: "none", position: "relative", zIndex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L1.5 6v5.25L9 15l7.5-3.75V6L9 1.5z" stroke="white" strokeWidth="1.4" strokeLinejoin="round" /><path d="M9 1.5v11.25M1.5 6l7.5 4.5 7.5-4.5" stroke="white" strokeWidth="1.4" /></svg>
                    </div>
                    <div style={{ textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--serif)", fontWeight: 600, fontSize: 15.5, color: "#fff", letterSpacing: "-0.3px" }}>EdUmeetup</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "1.2px", textTransform: "uppercase" }}>by IAES</div>
                    </div>
                </a>

                {/* Heading */}
                <div style={{ position: "relative", zIndex: 1, marginBottom: 36 }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 600, color: "#fff", lineHeight: 1.28, letterSpacing: "-0.4px", marginBottom: 10 }}>
                        Create your<br />
                        <em style={{ fontStyle: "italic", color: "oklch(72% 0.17 65)" }}>student profile</em>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, fontWeight: 300 }}>
                        Universities will discover you directly. No agents. No fees.
                    </p>
                </div>

                {/* Step nav */}
                <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
                    {STEPS.map((s, i) => {
                        const done = step > s.id
                        const current = step === s.id
                        return (
                            <div key={s.id} style={{ position: "relative" }}>
                                {i < STEPS.length - 1 && (
                                    <div style={{ position: "absolute", left: 16, top: 34, width: 2, height: 40, borderRadius: 2, background: done ? "oklch(72% 0.17 65)" : "rgba(255,255,255,0.1)", transition: "background 0.4s" }} />
                                )}
                                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 42 }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 14 : 12, fontWeight: 700, transition: "all 0.3s",
                                        background: done ? "oklch(72% 0.17 65)" : current ? "#fff" : "rgba(255,255,255,0.1)",
                                        color: done ? "var(--primary)" : current ? "var(--primary)" : "rgba(255,255,255,0.35)",
                                        boxShadow: current ? "0 0 0 4px rgba(255,255,255,0.12)" : "none",
                                    }}>
                                        {done ? "✓" : s.icon}
                                    </div>
                                    <div style={{ paddingTop: 5 }}>
                                        <div style={{ fontSize: 10.5, fontWeight: 700, color: current ? "rgba(255,255,255,0.9)" : done ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 2, transition: "color 0.3s" }}>Step {s.id}</div>
                                        <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600, color: current ? "#fff" : done ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.28)", transition: "color 0.3s" }}>{s.label}</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Social proof bubble */}
                <div style={{ position: "relative", zIndex: 1 }}>
                    <SocialProofBubble count={initialCount} />
                </div>
            </div>

            {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

                {/* Mobile Heading Bar (Hidden on Desktop) */}
                <div className="lg:hidden" style={{ background: "var(--primary)", padding: "20px", color: "white" }}>
                    <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600 }}>Create your profile</div>
                    <div style={{ marginTop: 10 }}>
                        <SocialProofBubble count={initialCount} />
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", padding: "18px 48px", position: "sticky", top: 0, zIndex: 5 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{currentStepObj?.label} Details</span>
                        <span style={{ fontSize: 12.5, color: "var(--text-muted)", fontWeight: 500 }}>Step {step} of {STEPS.length}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 100, background: "var(--border2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, var(--primary), var(--gold))`, borderRadius: 100, transition: "width 0.4s cubic-bezier(.22,.68,0,1.2)" }} />
                    </div>
                </div>

                {/* Form scroll area */}
                <div ref={scrollRef} className="lg:!px-12" style={{ flex: 1, overflowY: "auto", padding: "44px 24px 24px" }}>
                    <div style={{ maxWidth: 580, margin: "0 auto" }}>
                        
                        {/* India Notice */}
                        {step === 1 && (
                            <div style={{ background: "oklch(96% 0.04 80)", border: "1px solid oklch(72% 0.17 65 / 0.3)", borderRadius: "10px", padding: "12px 18px", marginBottom: "28px", display: "flex", gap: "12px" }}>
                                <span style={{ fontSize: "20px" }}>🇮🇳</span>
                                <span style={{ fontSize: "13px", color: "var(--gold-deep)", lineHeight: "1.5" }}>
                                    Currently, EdUmeetup profiling is available to <strong>students based in India</strong> with a valid Indian phone number.
                                </span>
                            </div>
                        )}

                        {/* Step heading */}
                        <div style={{ marginBottom: 32 }}>
                            <h2 style={{ fontFamily: "var(--serif)", fontSize: 28, fontWeight: 600, color: "var(--primary)", letterSpacing: "-0.4px", marginBottom: 8 }}>
                                {["Who are you?", "Your academic background", "Where do you want to go?", "Documents & readiness"][step - 1]}
                            </h2>
                            <p style={{ fontSize: 15, color: "var(--text-muted)", fontWeight: 300, lineHeight: 1.65 }}>
                                {[
                                    "Start with the basics. Universities love knowing the person behind the profile.",
                                    "Your current education helps us match you with the right programs.",
                                    "Tell us your dream destination and we'll find universities that fit your goals.",
                                    "Let universities know your test scores and readiness so they can reach out confidently.",
                                ][step - 1]}
                            </p>
                        </div>

                        {/* Animated step */}
                        <div key={animKey} className={dir > 0 ? "step-fwd" : "step-bwd"}>
                            {step === 1 && <Step1 form={form} set={set} />}
                            {step === 2 && <Step2 form={form} set={set} />}
                            {step === 3 && <Step3 form={form} set={set} toggle={toggle} />}
                            {step === 4 && <Step4 form={form} set={set} />}
                        </div>
                    </div>
                </div>

                {/* Footer nav */}
                <div style={{ background: "#fff", borderTop: "1px solid var(--border)", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", bottom: 0, zIndex: 5 }}>
                    <div>
                        {step > 1 && <button className="btn-ghost" onClick={() => goTo(step - 1)}>← Back</button>}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="hidden sm:flex" style={{ gap: 6 }}>
                            {STEPS.map(s => (
                                <div key={s.id} onClick={() => s.id < step ? goTo(s.id) : null}
                                    style={{
                                        height: 7, borderRadius: 100, transition: "all 0.3s",
                                        width: s.id === step ? 24 : 7,
                                        background: s.id === step ? "var(--primary)" : s.id < step ? "var(--gold)" : "var(--border2)",
                                        cursor: s.id < step ? "pointer" : "default",
                                    }} />
                            ))}
                        </div>

                        {step === STEPS.length ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                {turnstileError && (
                                    <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>
                                        Verification failed. Refresh page.
                                    </span>
                                )}
                                <TurnstileWidget 
                                    onVerify={(token) => { setTurnstileToken(token); setTurnstileError(false) }}
                                    onExpire={() => setTurnstileToken(null)}
                                    onError={() => setTurnstileError(true)}
                                />
                                <button className="btn-primary" onClick={submit} disabled={busy || !turnstileToken}>
                                    {busy ? (
                                        <>
                                            <span style={{ width: 15, height: 15, border: "2.5px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                            Creating…
                                        </>
                                    ) : "Launch My Profile 🚀"}
                                </button>
                            </div>
                        ) : (
                            <button className="btn-primary" onClick={() => {
                                if (validateStep()) goTo(step + 1)
                            }}>
                                Continue →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
