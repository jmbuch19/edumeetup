# EdUmeetup — Meeting System: Google Antigravity Build Prompt
## Student ↔ University Virtual Meeting Scheduler

**Platform:** EdUmeetup.com
**Feature:** 1:1 Virtual Meeting Scheduling System
**Brand Colors:** #1B5E7E (Deep Teal), #2B7A9B (Ocean Blue), #4A9EBF (Light Blue)
**Tagline:** WHERE DREAMS MEET DESTINATIONS

---

## SECTION 1: DATABASE — NEW DATA TYPES TO ADD

> Add these to your existing database alongside User, Student Profile, University Profile, Program, Interest.

---

### New Data Type 1: Availability
> Stores when university reps are available for meetings

Fields:
- university (→ University Profile, required)
- rep_user (→ User, required) — the rep who owns this slot
- rep_name (text)
- rep_timezone (text) — e.g. "America/New_York"
- day_of_week (option set: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- slot_start_time (text) — "09:00"
- slot_end_time (text) — "17:00"
- meeting_duration_options (list of numbers) — [10, 15, 20]
- buffer_minutes (number, default: 10)
- min_lead_time_hours (number, default: 12)
- daily_cap (number, default: 8) — max meetings per rep per day
- audio_only_allowed (yes/no, default: yes)
- video_provider (option set: Google Meet, Zoom, External Link)
- external_link (text) — if provider = External Link, rep pastes their link
- eligible_degree_levels (list of texts) — e.g. ["UG", "Grad", "PhD"] — filter low-quality requests
- eligible_countries (list of texts) — optional filter
- is_active (yes/no, default: yes)
- blackout_dates (list of dates)

---

### New Data Type 2: Meeting Request
> The core "contract" between student and university. Status-driven.

Fields:
- student (→ Student Profile, required)
- university (→ University Profile, required)
- rep (→ User — university rep, required)
- program (→ Program, optional)

**Meeting Purpose & Content:**
- meeting_purpose (option set: Admission Query, Program Fit, Scholarship Info, Document Help, Application Status, Other)
- student_questions (text, max 5 bullet points — 1000 chars)
- uploaded_doc (file, optional — max 1 file, 10MB)
- duration_minutes (number: 10, 15, or 20)
- audio_only_requested (yes/no)

**Scheduling:**
- proposed_datetime (date+time) — student's chosen slot
- student_timezone (text)
- rep_timezone (text)
- confirmed_datetime (date+time) — finalized slot
- video_provider (option set: Google Meet, Zoom, External Link)
- video_link (text) — generated or pasted link
- meeting_id_code (text) — e.g. "EDU-2025-00123"

**Status Machine:**
- status (option set):
  → Draft
  → Pending
  → Confirmed
  → Reschedule Proposed
  → Cancelled
  → Completed
  → No Show

**Reschedule Fields:**
- reschedule_proposed_by (option set: Student, University)
- reschedule_proposed_datetime (date+time)
- reschedule_reason (text)

**Cancellation Fields:**
- cancelled_by (option set: Student, University, System)
- cancellation_reason (text)
- cancelled_at (date+time)
- is_late_cancel (yes/no) — auto-set if cancelled within 2 hours of start

**Post-Meeting:**
- university_notes (text) — internal, hidden from student
- student_notes (text) — private to student
- student_rating (number, 1-5)
- university_rating (number, 1-5)
- follow_up_template_sent (yes/no)

**Tracking:**
- created_at (date, auto)
- last_updated (date, auto-modified)
- reminder_24h_sent (yes/no)
- reminder_1h_sent (yes/no)
- reminder_10min_sent (yes/no)

---

### New Data Type 3: Bookmark (Wishlist)
> Student saves universities they're interested in

Fields:
- student (→ Student Profile, required)
- university (→ University Profile, required)
- notes (text) — e.g. "Check tuition, need scholarship"
- bookmarked_at (date, auto)
- converted_to_meeting (yes/no, default: no) — track conversion

---

### New Data Type 4: Notification Log
> Audit trail for all notifications sent

Fields:
- recipient_user (→ User)
- meeting_request (→ Meeting Request)
- notification_type (option set: Meeting Booked, Meeting Confirmed, Meeting Cancelled, Reschedule Proposed, Reschedule Accepted, Reminder 24h, Reminder 1h, Reminder 10min, No Show Flagged)
- channel (option set: Email, WhatsApp, In-App)
- sent_at (date, auto)
- delivered (yes/no)
- content_preview (text)

---

## SECTION 2: STATUS MACHINE — EXACT TRANSITION RULES

> CRITICAL: Enforce these rules strictly. Only one active status at a time.

```
DRAFT
  → Student is selecting a slot (nothing saved yet)
  → No record created until student clicks Confirm

PENDING
  → Triggered: Student submits booking
  → Condition: University has "approval required" = yes
  → University must: Accept | Propose New Time | Decline

CONFIRMED
  → Triggered: University accepts OR instant-book enabled
  → Actions on transition:
      1. Generate video link (Meet/Zoom/External)
      2. Send confirmation email to BOTH parties
      3. Create calendar invites (.ics)
      4. Schedule reminder workflows (24h, 1h, 10min)

RESCHEDULE PROPOSED
  → Triggered: Either party clicks "Reschedule"
  → Proposer sets new datetime
  → Other party must: Accept → back to CONFIRMED | Suggest Another Time

CANCELLED
  → Can be triggered from: PENDING, CONFIRMED, RESCHEDULE PROPOSED
  → Always capture: who cancelled, reason, timestamp
  → If cancelled < 2 hours before start → set is_late_cancel = yes (log only)
  → Send cancellation email to both parties

COMPLETED
  → Triggered: Scheduled workflow 15 minutes after meeting end time
  → Actions: Send feedback request to both parties

NO SHOW
  → Triggered: Scheduled workflow 15 minutes after start if status still CONFIRMED
  → Log for admin visibility
  → Optional: auto-email both parties
```

---

## SECTION 3: STUDENT WORKFLOW — PAGE BY PAGE

---

### PAGE 1: Student Onboarding (profile completion gate)

**URL:** /student/onboarding

**Rule:** If student profile_complete = no → show this page before allowing bookings.
Browsing is allowed without complete profile. Booking requires completion.

**Form Fields (2-minute flow):**
- Full name
- Email verification (send OTP)
- Phone verification (send OTP — optional but recommended)
- Intended level: UG / Grad / PhD / Other
- Interests (multi-select tags): Engineering, Business, Medicine, CS, Law, Arts, Science, Other
- Preferred countries (multi-select): USA, UK, Canada, Australia, Germany, India, Singapore, NZ, Other
- Preferred intake: Fall 2025, Spring 2026, Fall 2026, Other
- Time zone (auto-detect from browser, student can override)
- Consent checkbox: "I agree to Privacy Policy and allow EdUmeetup to share my profile with universities I connect with"

**On Submit:**
- Update Student Profile: profile_complete = yes, timezone = detected
- Navigate to /universities

---

### PAGE 2: Browse Universities

**URL:** /universities

**University Card shows:**
- Logo + Name + Country + City
- Tags: UG / Grad / PhD / STEM / Business / Scholarships
- "Available slots this week" — count from Availability records for this week
- Rep languages (if added)
- Expected response time (from University Profile)
- Two buttons: "Book Meeting" | "Bookmark ♡"

**Bookmark Nudge Logic:**
- When student has bookmarked ≥ 3 universities AND has zero Meeting Requests
- Show banner: "You've saved 3 universities! Want a 15-min chat with a rep? See available slots →"

**Privacy Rule:**
- Only show universities where verification_status = Verified

---

### PAGE 3: Bookmark Detail Page

**URL:** /student/bookmarks/[id]

**Elements:**
- University overview (logo, name, description, programs)
- Student's own notes (editable text field — "Add your notes")
- "Request Meeting" CTA button (primary, prominent)
- "Remove Bookmark" button (secondary)

---

### PAGE 4: Schedule Meeting — Guided 4-Step Booking

**URL:** /student/book/[university_id]

**GATE CHECK before showing page:**
- If profile_complete = no → redirect to /student/onboarding
- If student has ≥ 2 active Pending Meeting Requests → show message:
  "You have 2 pending meetings awaiting confirmation. Please wait for a response before booking more."

---

**STEP A — Choose Purpose**

Display as large clickable cards (not dropdown):
```
📋 Admission Query
🎓 Program Fit
💰 Scholarship Info
📄 Document Help
📊 Application Status
💬 Other
```

Below the cards:
- Textarea: "Add your questions (max 5 bullet points)" — character limit 1000
- File upload: "Attach a document (optional)" — 1 file, max 10MB, PDF/DOC only

---

**STEP B — Choose Format & Duration**

Duration selector (3 pill buttons):
```
[10 min]  [15 min ✓ recommended]  [20 min]
```

Audio toggle:
```
🎙️ Audio-only OK?  [Toggle ON/OFF]
"Turning this on helps if your internet is slow"
```

---

**STEP C — Select Time Slot**

**Display logic:**
- Fetch Availability records for this university
- Filter: is_active = yes, day_of_week matches upcoming 7 days
- Exclude: blackout_dates, already-booked slots (where Meeting Request exists for that slot and status = Confirmed/Pending)
- Exclude: slots where daily_cap already reached
- Exclude: slots where proposed_datetime < now + min_lead_time_hours

**UI Layout:**
- Date row: show next 7 days as tabs (Mon 3 | Tue 4 | Wed 5...)
- Time slots: grid of available times
- Each slot shows: Time in STUDENT timezone + "(Rep's timezone: X)"
- Unavailable slots shown as greyed out (not hidden)

**No slots available state:**
- Show: "No slots this week — check back soon or send a message to this university"
- Show "Message University" button

---

**STEP D — Confirmation Summary**

Display clean summary card:
```
📍 University: [Name]
👤 Rep: [Rep Name]
🎯 Purpose: [Selected Purpose]
📅 Date: [Date in student timezone]
⏰ Time: [Time] (Your timezone: [TZ])
⏱️ Duration: [X] minutes
📹 Video: [Platform]
```

Show simple cancellation policy:
"You can cancel or reschedule any time before the meeting starts."

**Two buttons:**
- "Confirm Booking" (primary — creates Meeting Request)
- "← Go Back" (secondary)

**On Confirm:**
1. Create Meeting Request:
   - status = Confirmed (if instant-book) OR Pending (if approval required)
   - Generate meeting_id_code = "EDU-" + Year + "-" + padded auto-number
2. If Confirmed: generate video link immediately
3. Navigate to /student/meetings with success toast:
   "Meeting booked! 🎉 Check your email for confirmation details."

---

### PAGE 5: Student Meetings Dashboard

**URL:** /student/meetings

**Tabs: Upcoming | Past | Cancelled**

---

**UPCOMING tab:**

Repeating Group filtered by:
- student = Current User
- status IN [Pending, Confirmed, Reschedule Proposed]
- confirmed_datetime > Now

Each Meeting Card shows:
```
┌─────────────────────────────────────────────┐
│ 🏫 [University Logo] [University Name]       │
│ 👤 Rep: [Rep Name]                           │
│ 📅 [Date] at [Time] ([Student Timezone])     │
│ ⏱️ [Duration] mins • 🎯 [Purpose]            │
│ Status badge: [CONFIRMED ✅ / PENDING ⏳]    │
├─────────────────────────────────────────────┤
│ [JOIN ▶] (active only 10 min before start)  │
│ [📅 Add to Calendar]  [✏️ Reschedule]  [✕]  │
│ Your questions: [expandable section]         │
└─────────────────────────────────────────────┘
```

**JOIN button logic:**
- Show as active (clickable, green) ONLY when:
  current_time >= confirmed_datetime MINUS 10 minutes
  AND current_time <= confirmed_datetime PLUS duration_minutes
- Otherwise: greyed out, shows countdown "Joins in 2h 15m"
- On click: open video_link in new tab

**PAST tab:**
- Filter: status = Completed
- Show: Meeting details + "Rate this meeting" (stars 1-5) + "Add notes"

**CANCELLED tab:**
- Filter: status = Cancelled
- Show: who cancelled, reason, when

---

### PAGE 6: Cancel / Reschedule Flow

**Cancel:**
- Popup confirmation: "Cancel meeting with [University]?"
- Dropdown: reason (Changed plans / Found info elsewhere / Schedule conflict / Other)
- "Yes, Cancel" button
- On confirm:
  - Update status = Cancelled
  - Set cancelled_by = Student, cancellation_reason, cancelled_at = now
  - If cancelled_at > confirmed_datetime - 2 hours: is_late_cancel = yes
  - Send cancellation email to university
  - Send confirmation email to student

**Reschedule:**
- Show available slots again (same Step C UI)
- Student selects new slot
- Update: status = Reschedule Proposed, reschedule_proposed_by = Student, reschedule_proposed_datetime = new slot
- Send email to university with new proposed time + Accept / Suggest Another Time buttons

---

## SECTION 4: UNIVERSITY WORKFLOW — PAGE BY PAGE

---

### PAGE 7: Availability Setup

**URL:** /university/availability

**Purpose:** Rep sets when they're available for student meetings

**Form:**
- Rep name (pre-filled from User profile)
- Timezone selector (searchable dropdown — all timezones)
- Weekly schedule builder:
  For each day of week (Mon-Sun):
  - Toggle: Available / Unavailable
  - If available: Start time picker + End time picker
- Meeting duration options (checkboxes): [10 min] [15 min] [20 min]
- Buffer between meetings (dropdown: 5 / 10 / 15 / 30 minutes)
- Minimum lead time (dropdown: 6 hours / 12 hours / 24 hours / 48 hours)
- Max meetings per day (number input, default 8)

**Eligibility Filters (optional — to reduce low-quality requests):**
- Degree level filter (multi-select): UG only / Grad only / PhD only / All levels
- Country filter (multi-select, optional): leave empty = all countries

**Video Provider:**
- Radio: Google Meet | Zoom | External Link
- If External Link: paste your meeting link (permanent link used for all meetings)

**Blackout dates:**
- Date range picker (add multiple ranges)

**Save Availability button**

---

### PAGE 8: University Meetings Dashboard

**URL:** /university/meetings

**Tabs: Requests | Calendar | Past**

---

**REQUESTS tab (triage queue):**

Shows: Meeting Requests where status = Pending, sorted by created_at ascending (oldest first)

Each Request Card:
```
┌─────────────────────────────────────────────────┐
│ 👤 [Student Name] from [Country] 🌍              │
│ 🎓 Applying for: [Degree Level] in [Field]       │
│ 🎯 Purpose: [Meeting Purpose]                    │
│ 📅 Proposed: [Date + Time in REP timezone]       │
│ ⏱️ Duration: [X] minutes                         │
│ ❓ Questions: [expandable — student's questions] │
│ 📎 Document: [view if uploaded]                  │
├─────────────────────────────────────────────────┤
│ [✅ Accept]  [🔄 Propose New Time]  [❌ Decline] │
│              (with reason required)              │
└─────────────────────────────────────────────────┘
```

**On Accept:**
1. Update status = Confirmed
2. Set confirmed_datetime = proposed_datetime
3. Generate video link (based on university's video provider setting)
4. Schedule reminder workflows
5. Send confirmation emails to both parties

**On Propose New Time:**
1. Show available slots picker (rep's own slots)
2. Update status = Reschedule Proposed, reschedule_proposed_by = University
3. Send email to student with new time + Accept button

**On Decline:**
1. Require reason (dropdown):
   - Out of scope for our programs
   - Fully booked
   - Student profile incomplete
   - Other
2. Update status = Cancelled, cancellation_reason = selected reason
3. Send polite decline email to student with reason

---

**CALENDAR tab:**

Monthly/weekly calendar view showing all Confirmed meetings for this university's reps.

Each event on calendar:
- Student name + meeting purpose
- Time (rep timezone)
- Click to expand: full student profile snapshot + questions

---

### PAGE 9: Meeting Detail Page (University View)

**URL:** /university/meetings/[meeting_id]

**Sections:**

**Student Profile Snapshot:**
- Name, country, degree level, field of interest
- GPA, test scores (if provided)
- Preferred countries, budget range
- View Full Profile link

**Meeting Details:**
- Purpose, proposed questions, uploaded doc
- Confirmed date/time (both timezones shown)
- Video link (with Copy button)
- Status badge

**Rep Actions:**
- Update status dropdown (Confirmed → Completed / No Show)
- Internal notes (rich text, not visible to student)
- Send follow-up template (dropdown of saved templates)
- "Schedule next meeting" button

**Follow-up templates (university can save):**
- "What documents to bring"
- "Apply here: [link]"
- "You're eligible for scholarship — next steps"
- "We recommend this program for you"

---

## SECTION 5: VIDEO LINK LOGIC

**University sets preference in Availability setup. Logic:**

```
IF video_provider = "Google Meet":
  → On Meeting Confirmed:
     Create Google Calendar event via Google Calendar API
     (Use service account with delegated access)
     Auto-generates Meet link
     Sends calendar invite to student email + rep email
     Stores Meet link in Meeting Request → video_link

IF video_provider = "Zoom":
  → On Meeting Confirmed:
     Call Zoom API: Create Meeting
     (Under licensed host account)
     Store zoom join URL in Meeting Request → video_link
     Store zoom meeting ID/password if applicable

IF video_provider = "External Link":
  → University has pre-set a permanent link in Availability
  → On Meeting Confirmed:
     Copy that link to Meeting Request → video_link
     (No API call needed)
  → Display note to student:
     "Join via the link below. Your host will let you in at the scheduled time."
```

**Fallback if API fails:**
- Set video_link = "Link will be shared 30 minutes before meeting"
- Send email manually prompt to university rep

---

## SECTION 6: NOTIFICATION SYSTEM — ALL TRIGGERS

> Send ALL notifications via Email (required) + In-App (required) + WhatsApp (optional)
> Log every notification in Notification Log data type

---

### TO STUDENT:

| Trigger | Subject | Key Content |
|---------|---------|-------------|
| Booking submitted (Pending) | "Meeting request sent to [University]" | Summary + "We'll notify you when confirmed" |
| Meeting Confirmed | "Meeting confirmed with [University] ✅" | Date/time, join link, add to calendar, questions recap |
| Reschedule proposed by University | "New time proposed by [University]" | Proposed time + Accept button + Suggest Another link |
| Reschedule accepted | "Reschedule confirmed ✅" | New date/time + join link |
| Meeting Cancelled by University | "Meeting cancelled by [University]" | Reason + "Browse other universities" CTA |
| Reminder 24h | "Tomorrow: Meeting with [University] 🔔" | Date/time, join link, prep checklist |
| Reminder 1h | "Starting in 1 hour: [University] meeting ⏰" | Join link prominently |
| Reminder 10min | "Your meeting starts in 10 minutes! 🚀" | JOIN button (big, clickable) |
| Meeting Completed | "How was your meeting with [University]?" | Star rating widget + notes field |

---

### TO UNIVERSITY REP:

| Trigger | Subject | Key Content |
|---------|---------|-------------|
| New booking request | "New meeting request from [Student Name]" | Student profile snapshot + questions + Accept/Decline buttons |
| Student cancels | "Meeting cancelled by [Student Name]" | Which meeting, reason, time lost |
| Reschedule proposed by Student | "Student proposes new time" | New proposed time + Accept/Suggest Another |
| Reminder 24h | "Tomorrow: Meeting with [Student Name] 🔔" | Student summary + join link |
| Reminder 1h | "Starting in 1 hour: [Student] meeting ⏰" | Join link |
| Reminder 10min | "Meeting starts in 10 minutes" | JOIN button |
| Meeting Completed | "Post-meeting: Add notes for [Student Name]" | Notes field + follow-up templates |

---

### TO ADMIN (jaydeep@edumeetup.com):

| Trigger | Subject | Content |
|---------|---------|---------|
| Daily 6pm | "[DAILY] Meeting Summary" | Total booked/confirmed/cancelled/completed today |
| No-show detected | "[ALERT] No-show: [Student] + [University]" | Meeting details for follow-up |
| Late cancellation | "[ALERT] Late cancel by [Student/University]" | Details for tracking |

---

## SECTION 7: AUTOMATED BACKEND WORKFLOWS

> Schedule these as recurring backend jobs

---

### Workflow 1: Send Reminders (run every 15 minutes)

```
Search Meeting Requests where:
  status = Confirmed
  confirmed_datetime is between NOW and NOW + 24h 10min

For each result:

  IF confirmed_datetime between NOW+23h50m and NOW+24h10m
     AND reminder_24h_sent = no:
       → Send 24h reminder to student + rep
       → Set reminder_24h_sent = yes

  IF confirmed_datetime between NOW+50m and NOW+70m
     AND reminder_1h_sent = no:
       → Send 1h reminder to student + rep
       → Set reminder_1h_sent = yes

  IF confirmed_datetime between NOW-1m and NOW+11m
     AND reminder_10min_sent = no:
       → Send 10min reminder to student + rep
       → Set reminder_10min_sent = yes
```

---

### Workflow 2: Mark Completed (run every 15 minutes)

```
Search Meeting Requests where:
  status = Confirmed
  confirmed_datetime + duration_minutes + 15min < NOW

For each result:
  → Update status = Completed
  → Send feedback request to student
  → Send post-meeting notes prompt to university rep
```

---

### Workflow 3: Flag No Shows (run every 15 minutes)

```
Search Meeting Requests where:
  status = Confirmed
  confirmed_datetime + 15min < NOW
  (meeting should have started 15 min ago but still Confirmed)

For each result:
  → Update status = No Show
  → Log in Notification Log
  → Send alert to admin
```

---

### Workflow 4: Daily Admin Summary (run daily at 6pm)

```
Count Meeting Requests where created_at = today → New bookings
Count Meeting Requests where status changed to Confirmed today → Confirmed
Count Meeting Requests where status = Cancelled AND cancelled_at = today → Cancellations
Count Meeting Requests where status = Completed AND last_updated = today → Completed
Count Meeting Requests where status = No Show AND last_updated = today → No Shows

Send email to jaydeep@edumeetup.com with these stats
```

---

## SECTION 8: DESIGN SPECIFICATIONS

### Meeting Booking Flow (4 steps):
- Progress indicator at top: Step 1 of 4 with step names
- Each step is a separate screen (not all on one page)
- Back button always available
- Data from previous steps preserved when going back
- No data saved until final Confirm click

### Status Badge Colors:
```
PENDING         → Yellow  #F59E0B  "Awaiting Confirmation"
CONFIRMED       → Green   #10B981  "Confirmed ✅"
RESCHEDULE      → Blue    #3B82F6  "New Time Proposed"
CANCELLED       → Red     #EF4444  "Cancelled"
COMPLETED       → Gray    #6B7280  "Completed"
NO SHOW         → Dark    #374151  "No Show"
```

### JOIN Button States:
```
> 10 min before start   → Gray,    disabled,  shows "Joins in [countdown]"
= 10 min before start   → Green,   active,    shows "Join Meeting ▶"
During meeting          → Green,   active,    shows "Join Now ▶ (In Progress)"
After meeting end       → Gray,    disabled,  shows "Meeting Ended"
```

### Time Display Rule (always show both):
```
Student pages → Student's timezone PRIMARY, rep timezone in brackets
University pages → Rep's timezone PRIMARY, student timezone in brackets
Example: "3:00 PM IST (9:30 AM EST)"
```

### Mobile Optimizations:
- Booking steps: full screen on mobile, no sidebars
- Meeting cards: vertically stacked, large touch targets
- JOIN button: full width, minimum 56px height
- Calendar view: week view default on mobile (not month)
- Time slot picker: scrollable horizontal list on mobile

---

## SECTION 9: QUALITY GUARDRAILS

> Implement these checks to maintain platform quality

**Student-side limits:**
- Max 2 active Pending Meeting Requests at any time (prevent spam)
- Profile must be complete before booking
- Email must be verified before booking
- Phone verification recommended (shown as badge on student profile)

**University-side filters (optional per university):**
- Set eligible_degree_levels in Availability (e.g., Grad only)
- Set eligible_countries (e.g., only students from India, USA)
- Students outside filter → "This university is currently only accepting meetings from [criteria]. Check back later."

**Anti-spam:**
- Students cannot rebook same university within 24 hours of a cancelled meeting
- Universities cannot decline same student twice without admin review

---

## SECTION 10: IMPLEMENTATION ORDER

> Build in this exact sequence for smoothest development

```
PHASE A — Foundation (build first):
  1. Create all 4 new data types
  2. Create option sets (status values, meeting purposes, video providers)
  3. Build Availability setup page (university)
  4. Test: university can save availability slots

PHASE B — Core Booking (build second):
  5. Build 4-step booking flow (student)
  6. Build Meeting Request creation workflow
  7. Test: student can book, record created correctly

PHASE C — University Response (build third):
  8. Build University Meetings Dashboard (Requests tab)
  9. Build Accept / Decline / Propose New Time workflows
  10. Build video link generation (start with External Link first, then Zoom/Meet)
  11. Test: university can respond, status updates correctly

PHASE D — Notifications (build fourth):
  12. Build all email templates (9 student + 8 university + 3 admin)
  13. Connect email triggers to each status change
  14. Test: emails send correctly on each trigger

PHASE E — Dashboards & Polish (build fifth):
  15. Build Student Meetings Dashboard (all tabs)
  16. Build JOIN button with countdown logic
  17. Build Calendar view for university
  18. Build cancel/reschedule flows for both parties
  19. Build reminder backend workflows (every 15 min)

PHASE F — Automation (build last):
  20. Build Completed/No-Show auto-detection workflows
  21. Build Daily Admin Summary workflow
  22. Test complete end-to-end flow
  23. Mobile responsiveness check
```

---

## SECTION 11: TEST SCENARIOS (run all before going live)

```
✅ Student books → status = Pending → university gets email
✅ University accepts → status = Confirmed → both get confirmation + video link
✅ Student joins 10 min before → JOIN button activates
✅ Meeting ends → status auto = Completed → feedback emails sent
✅ Student cancels 5 hours before → status = Cancelled, is_late_cancel = no
✅ Student cancels 1 hour before → is_late_cancel = yes (logged)
✅ University proposes new time → student gets email → accepts → status = Confirmed
✅ No one joins → 15 min after start → status = No Show → admin alerted
✅ 24h reminder sent → reminder_24h_sent = yes → not sent again
✅ Student tries booking with incomplete profile → redirected to onboarding
✅ Student tries booking 3rd meeting while 2 pending → blocked with message
✅ External link copied correctly to Meeting Request on Confirm
✅ Time zones display correctly for student (their TZ) and rep (their TZ)
✅ Daily admin summary email arrives at 6pm with correct counts
✅ Mobile: complete booking flow works on iPhone Safari + Android Chrome
```

---

**THAT IS THE COMPLETE MEETING SYSTEM.**

**Build PHASE A first, test it, then move to B, C, D, E, F in order.**
**Do not build all phases at once — build and test incrementally.**
