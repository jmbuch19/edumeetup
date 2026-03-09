// lib/bot/knowledge-base.ts
// Tier 0 — Platform Knowledge Base
// Structured as a keyed section map so getKnowledge can return only the relevant section.
// Groq/Llama 3.3 70B knows general study abroad facts — we only store EdUmeetup-specific info.

export interface KnowledgeSection {
    title: string
    keywords: string[]   // used for keyword matching
    content: string
}

export const KNOWLEDGE_SECTIONS: KnowledgeSection[] = [
    {
        title: 'Platform Overview',
        keywords: ['edumeetup', 'what is', 'platform', 'how does', 'agent', 'real', 'free', 'safe', 'verified', 'explore', 'start', 'hello', 'hi', 'help'],
        content: `EdUmeetup is a platform that connects students directly with verified international universities — no agents, no middlemen, no commission.

**What you can do:**
- Browse verified universities by country, field, and budget
- Book 1-on-1 video meetings with official admissions reps (free)
- Attend Campus Fairs — meet multiple universities in one session
- Get a digital QR pass for fair check-in

**Is it free?** Core features (browsing, meeting booking, fair registration) are free for students.
**Are universities real?** Yes — only verified, accredited institutions are listed.
**Is EdUmeetup an agent?** No. Direct connections only.

Register free: https://edumeetup.com/student/register`
    },
    {
        title: 'Registration & Profile',
        keywords: ['register', 'sign up', 'account', 'profile', 'create', 'login', 'magic link', 'email', 'password', 'cv', 'upload', 'delete account'],
        content: `**How to register:** Visit https://edumeetup.com/student/register — enter your email to receive a magic sign-in link. No password needed.

**Complete your profile:** Dashboard → Edit Profile. Add field of interest, budget, preferred countries, degree level, and English test scores.

**Upload CV:** Dashboard → Profile → Upload CV. PDF only, max 5MB.

**Magic link not received?** Check spam. Wait 2 min and try again. Links expire in 10 minutes.

**Delete account:** Dashboard → Settings → Delete Account. Or email info@edumeetup.com`
    },
    {
        title: 'Meetings with Universities',
        keywords: ['meeting', 'book', '1-on-1', 'one on one', 'video call', 'cancel', 'reschedule', 'representative', 'rep', 'talk to', 'connect'],
        content: `**Book a meeting:** Browse Universities → click a university → "Request a Meeting." Pick a time from available slots. You'll get a confirmation with a video link (Google Meet or Zoom).

**Cancel/Reschedule:** Dashboard → My Meetings → click the meeting → Cancel or Propose New Time. Do this 24 hours before.

**University doesn't respond?** They respond within 48 hours. If not, email info@edumeetup.com.

**What happens in the meeting?** 15–30 min video call with an admissions rep. Ask about programs, scholarships, visa, requirements — directly.`
    },
    {
        title: 'Campus Fairs & QR Pass',
        keywords: ['fair', 'campus fair', 'event', 'qr', 'pass', 'rsvp', 'attend', 'upcoming', 'hybrid', 'online', 'venue'],
        content: `**Register for a fair:** Dashboard → Upcoming Fairs → RSVP. You'll get a confirmation email with your digital QR pass.

**Access QR pass:** Dashboard → My Fair Passes, or check your email. Screenshot it or show it at the venue.

**Multiple booths?** Yes — visit as many university booths as you like at one fair.

**QR not working?** Show your registered email to the EdUmeetup volunteer for manual check-in.

**Virtual fairs?** Hybrid/virtual fairs include an online joining link in your confirmation email.`
    },
    {
        title: 'Study Abroad Planning',
        keywords: ['phd', 'masters', 'bachelor', 'undergraduate', 'postgraduate', 'mba', 'where to start', 'how to start', 'planning', 'intake', 'fall', 'spring', 'ielts', 'toefl', 'gre', 'gmat', 'sat', 'exam', 'requirement', 'eligibility', 'older', 'mature', 'age', 'management', 'science', 'engineering', 'business', 'cs', 'computer'],
        content: `**Where to start:** Choose field → choose country → check English test + finances → apply. EdUmeetup helps at every step.

**Intakes:** Fall (Sept) is biggest. Spring (Jan) for USA/Canada/UK. Summer (May) has fewer options.

**English tests:** IELTS / TOEFL / PTE / Duolingo. Most PhD and Masters programs require one.

**PhD-specific:** GRE may be required for US PhD programs (Management Science, STEM). Many now make it optional. Check the specific university.

**Mature students (30+/40+):** Very welcome in PhD and MBA programs in USA, UK, Canada, Australia. Industry experience is valued — often preferred over younger applicants.

**No age bar:** USA, UK, and Australia have no age limit for PhD or Masters admission.`
    },
    {
        title: 'Cost & Budget',
        keywords: ['cost', 'fee', 'budget', 'cheap', 'affordable', 'scholarship', 'fund', 'money', 'tuition', 'living', 'expensive', 'low budget', 'financial'],
        content: `**Approximate annual cost (tuition + living):**
- USA: $35k–$65k | UK: £25k–£45k | Canada: CAD $30k–$55k
- Australia: AUD $35k–$55k | Germany (public): ~€10k (mostly living cost)

**PhD funding:** Many US/UK/German universities offer full scholarships + stipends for PhD students. Germany is especially strong for funded PhDs.

**Scholarships:** Merit-based, university grants, DAAD (Germany), Chevening (UK), Commonwealth. Apply early.

**Low budget options:** Germany (near-zero tuition), some EU universities, Canadian colleges.`
    },
    {
        title: 'Visa & Immigration',
        keywords: ['visa', 'rejection', 'pr', 'permanent resident', 'stay back', 'work after study', 'opt', 'pgwp', 'safe', 'parents worried', 'immigration'],
        content: `**Visa success depends on:** Genuine student plan, correct university, strong financial proof, early application.

**Post-study work:**
- UK: 2 years | Canada: up to 3 years | Australia: 2–4 years | USA: OPT 1 year (STEM: 3 yrs) | Germany: 18 months

**PR pathways:** Canada (Express Entry), Australia (Skilled Migration), New Zealand, Germany (Blue Card) — always check current rules on official government websites.

**Parents' concern:** Valid. Key: verified university + financial proof + genuine SOP + early application = strong visa. EdUmeetup only lists verified universities.

⚠️ For legal immigration advice, consult a licensed advisor or official government websites.`
    },
    {
        title: 'Indian Student Profile Issues',
        keywords: ['low percentage', 'backlog', 'gap', 'gap year', 'marks', 'percentage', 'low marks', 'arrear', 'cbse', 'ssc', 'hsc', 'ielts not done', 'no ielts', 'no gre', 'diploma', '12th', 'class 12'],
        content: `**Low percentage:** Many universities accept 60–65%+. Strong SOP + work experience can compensate. Profile matching is key.

**Backlogs/arrears:** 1–2 cleared backlogs → manageable for many universities. Active backlogs → harder, but some universities accept. Disclose honestly.

**Study gap:** Acceptable with a clear explanation — work, health, or preparation. SOP is where you explain it. UK, Canada, Australia are flexible.

**Without IELTS:** Alternatives — Duolingo English Test, Medium of Instruction (MOI) letter, internal English test, pathway programs.

**Without GRE:** Many USA/Canada/UK/Australia programs are now GRE-optional.

**Diploma holders:** Can apply directly for Bachelor's (Year 2 entry in many cases) or pathway programs.`
    },
]

/**
 * Find the most relevant knowledge section for a given topic/query.
 * Returns the single best-matching section content (~200–400 words).
 */
export function getRelevantKnowledge(topic: string): string {
    const query = topic.toLowerCase()

    // Score each section by keyword matches
    const scored = KNOWLEDGE_SECTIONS.map(section => {
        const score = section.keywords.filter(kw => query.includes(kw.toLowerCase())).length
        return { section, score }
    })

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)

    // If top section has a match, return it
    if (scored[0].score > 0) {
        return `**${scored[0].section.title}**\n\n${scored[0].section.content}`
    }

    // No match — return platform overview as default
    return `**Platform Overview**\n\n${KNOWLEDGE_SECTIONS[0].content}`
}
