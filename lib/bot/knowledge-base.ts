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

### 🧭 Navigation Quick Reference

| What the student wants | Where to send them |
|---|---|
| Register as student | https://edumeetup.com/student/register |
| Login | https://edumeetup.com/login |
| Student dashboard | https://edumeetup.com/student/dashboard |
| Browse universities | https://edumeetup.com/universities |
| Host a fair | https://edumeetup.com/host-a-fair |
| Report a bug | https://edumeetup.com/report-issue |
| University registration | https://edumeetup.com/university/register |
| Contact us | info@edumeetup.com |
`
