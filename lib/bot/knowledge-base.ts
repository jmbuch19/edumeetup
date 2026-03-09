// lib/bot/knowledge-base.ts
// Tier 0 — Static Platform Knowledge Base
// Injected into the system prompt so the bot can answer portal questions
// without any database or API calls.
// Add new entries here as new features ship.

export const PLATFORM_KNOWLEDGE = `
## TIER 0 — EdUmeetup Platform Knowledge Base

Use this section to answer all questions about HOW the platform works, 
account actions, and navigation. Do NOT call any tool for these — answer directly.

---

### 🎓 Student Registration & Profile

**How do I register as a student?**
Visit https://edumeetup.com/student/register. Enter your email to receive a magic sign-in link. No password needed.

**How do I complete my profile?**
After logging in, go to Dashboard → Edit Profile. Fill in your field of interest, budget range, preferred countries, degree level, and English test scores. A complete profile helps us match you with the right universities.

**How do I upload my CV?**
Dashboard → Profile → Upload CV section. Supported formats: PDF. Max size: 5MB.

**How do I update my email address?**
Email changes require identity verification. Please contact support at info@edumeetup.com with your registered email and the new one you want.

**How do I delete my account?**
Go to Dashboard → Settings → Delete Account. This is permanent and removes all your data. Alternatively contact info@edumeetup.com.

**How do I add my English test score?**
Dashboard → Edit Profile → English Proficiency section. You can enter IELTS, TOEFL, PTE, or Duolingo scores.

---

### 🏫 Campus Fairs & QR Pass

**How do I register for a Campus Fair?**
Go to the fair listing page or check your Dashboard → Upcoming Fairs. Click "RSVP" or "Register." You'll receive a confirmation email with your digital pass.

**How do I download or access my QR Pass?**
After registering for a fair, go to Dashboard → My Fair Passes, or check your confirmation email. Your QR code is displayed there — screenshot it or show it at the venue.

**Can I attend multiple university booths at one fair?**
Yes! At each booth, the university rep scans your QR code to check you in. You can visit as many booths as you like during the fair.

**What if my QR pass is not working?**
Show your registered email to the EdUmeetup volunteer at the venue — they can manually check you in. For digital issues, email info@edumeetup.com before the event.

**Can I attend a fair online?**
If the fair is hybrid or virtual, you'll receive an online joining link in your confirmation email and on your dashboard.

---

### 📅 Meetings with Universities

**How do I book a 1-on-1 meeting with a university?**
Browse Universities → click on a university → click "Request a Meeting." Choose your preferred date/time from their available slots. You'll get a confirmation with a video link (Google Meet or Zoom).

**How do I cancel or reschedule a meeting?**
Go to Dashboard → My Meetings → click the meeting → Cancel or Propose New Time. Do this at least 24 hours before the meeting to avoid a late-cancel mark.

**What if the university doesn't confirm my meeting?**
Universities typically respond within 48 hours. If you don't hear back, email info@edumeetup.com with the university name and your requested time.

**What happens in the meeting?**
It's a 15–30 minute video call with a university admissions representative. You can ask about programs, scholarships, requirements, visa, and the application process.

---

### 🔐 Login & Authentication

**I didn't receive the magic link email.**
1. Check your spam/junk folder.
2. Ensure you're using the same email you registered with.
3. Try again after 2 minutes.
4. If still not received, email info@edumeetup.com.

**My magic link says "Link Expired."**
Magic links expire after 10 minutes for security. Go back to https://edumeetup.com/login and request a new one.

**I can't log in — getting an error.**
Try in incognito/private mode. Clear cookies. If using a VPN, try without it. Still stuck? Email info@edumeetup.com.

**Is there a mobile app?**
Not yet. EdUmeetup is fully mobile-responsive — use it in your mobile browser. A dedicated mobile app is on the roadmap.

---

### 📋 For Universities

**How does our institution join EdUmeetup?**
Register at https://edumeetup.com/university/register. Our team verifies institutions within 1–2 business days after document submission.

**How do we host a Campus Fair?**
Submit a hosting request at https://edumeetup.com/host-a-fair. EdUmeetup handles student invitations, RSVPs, and check-in logistics.

**How do we access matched student profiles?**
After your institution is verified and you log in as a University Rep, your dashboard shows students who have expressed interest in your programs.

---

### 💬 General Platform FAQ

**Is EdUmeetup free for students?**
Yes — 100% free. No registration fees, no commission, no hidden charges.

**Which countries' universities are on the platform?**
USA, UK, Canada, Australia, New Zealand, Germany, Ireland, Netherlands, and more. Browse all at https://edumeetup.com/universities.

**Is my data safe?**
Yes. Data is stored securely, never sold to third parties, and students can request deletion at any time. We comply with standard data protection practices.

**How do I report a bug or technical issue?**
Use the Bug Report button (🐛) on the website, or go to https://edumeetup.com/report-issue.

**How do I contact the EdUmeetup team?**
📧 info@edumeetup.com
🌐 https://edumeetup.com
Operating hours: Monday–Saturday, 10 AM – 6 PM IST

---

### 🌍 Level 0 — First Contact (Exploratory / New Visitors)

Use these answers for students who are just discovering the platform or are unsure where to begin.

**What is EdUmeetup?**
EdUmeetup is a platform where students can explore verified universities, attend official admission fairs, and connect directly with institutions for studying abroad. No agents. No middlemen. Direct, trusted connections.

**Can I use this even if I am just exploring?**
Absolutely! You can ask questions, compare countries, check costs, and understand admission requirements before making any decision. No commitment needed.

**Which countries can I study in through EdUmeetup?**
USA, Canada, UK, Australia, Germany, Ireland, Singapore, New Zealand, and other EU countries. Browse all listed universities at https://edumeetup.com/universities.

**Do I need to create an account?**
You can explore without an account. But creating a free account lets you save universities, book 1-on-1 meetings with reps, and attend official admission events.

**Is EdUmeetup an agent or consultancy?**
No. EdUmeetup is a platform — not an agent. We connect students with verified university representatives directly. You pay nothing to us.

**Are universities on EdUmeetup real and official?**
Yes. Only verified, accredited institutions are allowed to participate in meetings and events on the platform. We manually check every institution.

**Can I talk to universities directly here?**
Yes. You can book 1-on-1 video meetings, attend online live sessions, or meet universities at official campus fairs — all within EdUmeetup.

**Is EdUmeetup only for the USA?**
No. EdUmeetup supports multiple countries including USA, Canada, UK, Australia, EU nations, Singapore, and New Zealand.

**Is this free for students?**
Core exploration, account creation, and meeting booking are free. Some premium events or workshops may require registration. Check the specific event page for details.

**I don't know where to start. What should I do?**
Let's figure it out together! Tell me:
1. Your last qualification (degree / 12th grade / working professional)
2. Preferred country (if you have one)
3. Your budget range
4. When you want to start (intake — this year / next year)

I'll guide you step by step from there. 🎓

---

### 🎓 Level 1 — Serious Student (Actively Planning to Study Abroad)

Use these answers for students who have decided to study abroad and need structured guidance.

**I want to study abroad. Where should I begin?**
Great decision! Here's how to start:
1. **Choose your field** — What do you want to study? (Engineering, Business, IT, Healthcare, etc.)
2. **Pick a country** — Budget, visa ease, and post-study work rights vary a lot.
3. **Check your readiness** — English test (IELTS/TOEFL), academic percentage, financial proof.
4. **Set your timeline** — Which intake? Fall (Sept) is the biggest. Spring (Jan) and Summer (May) have fewer options.
5. **Explore universities** — Use EdUmeetup to find verified universities, attend fairs, and book meetings.

**Which intake should I apply for?**
The three main intakes are:
- **Fall (September)** — Largest intake, most universities and programs available. Best for most students.
- **Spring (January)** — Good option for US, Canada, and some UK programs.
- **Summer (May/June)** — Fewer programs; mostly US community colleges and some short courses.
For most students, **Fall** is the best starting point.

**What exams are required?**
For English proficiency: **IELTS / TOEFL / PTE / Duolingo English Test**
For specific programs:
- MBA / Business: GMAT
- Master's / PhD (USA): GRE
- Undergraduate (USA): SAT / ACT
Requirements vary by university and program — I can search specific requirements once you tell me your target university.

**How much money do I need to study abroad?**
It depends on the country. Approximate yearly total cost (tuition + living):
- 🇺🇸 USA: $35,000–$65,000
- 🇬🇧 UK: £25,000–£45,000
- 🇨🇦 Canada: CAD $30,000–$55,000
- 🇦🇺 Australia: AUD $35,000–$55,000
- 🇩🇪 Germany: Very low or free tuition (public universities), living ~€10,000/yr
Scholarships and part-time work can significantly reduce costs.

**Can I go abroad with a low percentage or lower grades?**
Yes, but university and program selection matters. Many universities evaluate holistically — your SOP, work experience, test scores, and portfolio can compensate. Let me search universities that accept your profile.

**Can I work while studying?**
Most countries allow part-time work for international students:
- 🇺🇸 USA: 20 hours/week on-campus
- 🇬🇧 UK: 20 hours/week
- 🇨🇦 Canada: 24 hours/week (as of 2024 cap policy — verify current rules)
- 🇦🇺 Australia: 48 hours/fortnight
- 🇩🇪 Germany: 120 full days or 240 half days/year
Always check the latest rules on official government websites as policies change.

**Can I get a scholarship?**
Yes, many universities offer scholarships. Common types:
- Merit-based (academic excellence)
- Need-based financial aid
- Country-specific grants
- Early application discounts
Scholarships are competitive — strong academics and a well-written SOP improve your chances. Book a meeting with a university rep through EdUmeetup to ask about specific scholarships.

**Which country is easiest for a visa?**
"Easy" depends on your profile, finances, and university. Generally:
- **Canada** — has a Student Direct Stream (SDS) for faster processing from India.
- **Germany** — relatively high acceptance rate from India.
- **UK** — Student visa with clear financial requirements.
- **USA** — F-1 visa, interview required, acceptance depends heavily on ties to home country.
Your university acceptance letter is the most important document for any visa.

**Can I stay and work after my studies?**
Most countries offer post-study work visas:
- 🇬🇧 UK: Graduate Route — 2 years
- 🇨🇦 Canada: PGWP — up to 3 years
- 🇦🇺 Australia: Graduate visa — 2–4 years (depends on location and level)
- 🇺🇸 USA: OPT — 1 year (STEM: 3 years)
- 🇩🇪 Germany: 18 months job-seeker visa after graduation

**How can EdUmeetup help me in my journey?**
EdUmeetup is your one-stop platform for the entire study-abroad journey:
✅ Explore verified universities by country, field, and budget
✅ Book direct 1-on-1 video meetings with admissions reps
✅ Attend Campus Fairs to meet multiple universities in one session
✅ Get your digital QR pass for fair check-in
✅ Compare programs and understand requirements directly from institutions
All of this is free. No agents. No commissions. Start at https://edumeetup.com/student/register
`

