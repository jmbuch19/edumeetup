# Walkthrough - University Acquisition & Trust Layer

I have successfully implemented the "University Acquisition & Trust Layer" sprint. This sprint focused on making the platform institutional-grade for universities, adding essential management tools, data visibility, and an event system.

## Features Implemented

### 1. University Settings & Profile
- **Page**: `/university/settings`
- **Features**: 
  - Manage public profile (Logo, Website, Description).
  - Configure Meeting Rules (Duration, Buffer, Lead Time, Daily Caps).
  - Toggle "Publicly Listed" status.
  - Choose between "Manual" and "Automatic" approval modes for meetings.

### 2. Representative Management
- **Page**: `/university/reps`
- **Features**:
  - link additional users to the University account as "Representatives".
  - invite/create reps with email/password.
  - Suspend/Activate rep access.

### 3. Operational Metrics
- **Page**: `/university/dashboard` (Enhanced)
- **Features**:
  - Real-time metrics card showing:
    - Pending Requests
    - Meetings Today
    - Meetings this Week
    - Cancellation Rate (30d)
    - No-Show Rate (30d)

### 4. Data Exports
- **Action**: CSV Download on `/university/meetings`
- **Features**:
  - Exports meeting data including student details, status, timestamps, and purpose.
  - Useful for offline analysis and CRM import.

### 5. Event Mode MVP
- **Pages**:
  - Public List: `/events`
  - Event Details: `/events/[id]`
  - Management: `/university/events`
  - Create Event: `/university/events/new`
- **Features**:
  - Universities can publish Virtual, Physical, or Hybrid events.
  - Students can view details and register (one-click).
  - Track registration counts.

### 6. Admin Overview
- **Page**: `/admin/overview`
- **Features**:
  - Super Admin view of total universities, students, and meetings.
  - Leaderboard of top universities by meeting volume.

### 7. Quality Assurance & Testing
- **Automated Verification**: Run `npm run build` to check for type safety.
- **Seed Data**: Populated the database with:
  - 1 University (Admin)
  - 1 Representative
  - 1 Student (Alice)
  - 1 Event
  - 1 Meeting Request
- **How to Reset/Seed DB**:
  ```bash
  npx prisma db seed
  ```

## Verification

### Automated Tests
Run the following commands to verify:
```bash
npx prisma db push
npx prisma db seed # Populate test data
npm run dev
```

### Manual Verification Steps
1. **Mock Users**:
   - **University Admin**: `admin@techuni.edu` / `password123`
   - **Rep**: `rep1@techuni.edu` / `password123`
   - **Student**: `alice@student.com` / `password123`

2. **Test Flow**:
   - Log in as `alice@student.com`.
   - Go to `/events` and register for "Tech Uni Open Day".
   - Go to `/university/meetings` (as Admin) and confirm Alice's request.
1. **University Admin**:
   - Log in as University.
   - Go to Settings -> Update meeting rules.
   - Go to Reps -> Add a new rep.
   - Go to Events -> Create a new public event.
   - Go to Dashboard -> Verify metrics appear.
   - Go to Meetings -> Click "Export CSV".

2. **Student**:
   - Go to `/events` -> See the new event.
   - Click Details -> Register.
   - Verify success message.

3. **Super Admin**:
   - Go to `/admin/overview` -> Check platform stats.
