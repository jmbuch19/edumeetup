| File / Action | Auth Guard |
|---|---|
| app\api\admin\suspicious-students\route.ts | requireAdmin() |
| app\api\admin-login-link\route.ts | ADMIN_SECRET (env) |
| app\api\auth\[...nextauth]\route.ts | NONE |
| app\api\chat\route.ts | auth() |
| app\api\cron\complete-meetings\route.ts | NONE |
| app\api\cron\fair-auto-complete\route.ts | NONE |
| app\api\cron\fair-auto-live\route.ts | NONE |
| app\api\cron\fair-morning-scanner-reminder\route.ts | NONE |
| app\api\cron\fair-partial-profile-nudge\route.ts | NONE |
| app\api\cron\fair-reminder-24h\route.ts | NONE |
| app\api\cron\fair-university-followup-nudge\route.ts | NONE |
| app\api\cron\process-deletions\route.ts | NONE |
| app\api\cron\reminders\route.ts | NONE |
| app\api\cron\session-reminders\route.ts | NONE |
| app\api\cron\triggers\route.ts | NONE |
| app\api\cv\upload\route.ts | auth() |
| app\api\cv\[studentId]\route.ts | auth() |
| app\api\dev-login\route.ts | DEV_ONLY |
| app\api\my-data\consent\route.ts | auth() |
| app\api\my-data\delete\route.ts | auth() |
| app\api\my-data\route.ts | auth() |
| app\api\refresh-university-domains\route.ts | NONE |
| app\api\seed\route.ts | ADMIN_SECRET (env) |
| app\api\sentry-test\route.ts | NONE |
| app\api\setup-admin\route.ts | ADMIN_SECRET (env) |
| app\api\student\interest\route.ts | requireUser() |
| app\api\student\meeting-request\route.ts | requireUser() |
| app\api\student\question\route.ts | requireUser() |
| app\api\student-chat\route.ts | auth() |
| app\api\uni-docs\replace\route.ts | auth() |
| app\api\uni-docs\upload\route.ts | auth() |
| app\api\uni-docs\[docId]\route.ts | auth() |
| app\api\upload\logo\route.ts | auth() |
| app\api\validate-university-email\route.ts | NONE |
| app\actions.ts : registerStudent() | NONE |
| app\actions.ts : loginUniversity() | NONE |
| app\actions.ts : registerUniversity() | NONE |
| app\actions.ts : expressInterest() | requireUser() |
| app\actions.ts : expressInterestBulk() | requireUser() |
| app\actions.ts : createProgram() | requireUser() |
| app\actions.ts : updateProgram() | requireUser() |
| app\actions.ts : verifyUniversity() | requireRole() |
| app\actions.ts : login() | NONE |
| app\actions.ts : logout() | NONE |
| app\actions.ts : registerUniversityWithPrograms() | NONE |
| app\actions.ts : deleteProgram() | requireUser() |
| app\actions.ts : updateUniversityProfile() | requireUser() |
| app\actions.ts : submitPublicInquiry() | NONE |
| app\actions.ts : submitPdoRegistration() | NONE |
| app\actions.ts : createSupportTicket() | requireUser() |
| app\actions.ts : createMeeting() | requireUser() |
| app\actions.ts : updateRSVP() | requireUser() |
| app\actions.ts : markNotificationAsRead() | requireUser() |
| app\actions.ts : updateStudentProfile() | requireUser() |
| app\actions.ts : cancelMeeting() | requireUser() |
| app\actions.ts : updateMeeting() | requireUser() |
| app\actions.ts : getUniversityMeetings() | auth() |
| app\actions.ts : updateMeetingStatus() | auth() |
| app\actions.ts : getStudentMeetings() | auth() |
| app\actions.ts : updateAvailability() | NONE |
| app\actions.ts : getAvailableSlots() | NONE |
| app\actions.ts : holdSlot() | NONE |
| app\actions.ts : createMeetingRequest() | requireUser() |
| app\actions.ts : proposeReschedule() | requireUser() |
| app\actions.ts : getAvailability() | requireUser() |
| app\actions.ts : cancelMeetingByStudent() | requireUser() |
| app\actions.ts : getLiveUniversitySuggestion() | NONE |
| app\university\availability\actions.ts : saveAvailabilityProfile() | requireUniversity() -> auth() |
| app\university\availability\actions.ts : saveAllAvailabilityProfiles() | requireUniversity() -> auth() |
| app\university\availability\actions.ts : getAvailabilityProfiles() | requireUniversity() -> auth() |
| app\university\dashboard\actions.ts : getUniversityMetrics() | auth() |
| app\university\documents\actions.ts : deleteUniversityDocument() | requireUniversity() -> auth() |
| app\university\documents\actions.ts : replaceUniversityDocument() | requireUniversity() -> auth() |
| app\university\engagement\actions.ts : getSegmentCount() | auth() |
| app\university\engagement\actions.ts : getUniversityCampaignStats() | auth() |
| app\university\engagement\actions.ts : sendUniversityNotification() | auth() |
| app\university\fairs\actions.ts : getUniversityOutreach() | auth() |
| app\university\fairs\actions.ts : respondToOutreach() | auth() |
| app\university\fairs\actions.ts : confirmFairParticipation() | auth() |
| app\university\fairs\actions.ts : declineFairInvitation() | auth() |
| app\university\meetings\actions.ts : exportMeetingsToCSV() | auth() |
| app\university\messages\actions.ts : getUniversityQuota() | NONE |
| app\university\messages\actions.ts : sendUniversityDirectMessage() | getUniversityOrThrow() -> auth() |
| app\university\messages\actions.ts : markConversationReadByUniversity() | getUniversityOrThrow() -> auth() |
| app\university\messages\actions.ts : getUniversityConversations() | getUniversityOrThrow() -> auth() |
| app\university\messages\actions.ts : getUniversityConversationThread() | getUniversityOrThrow() -> auth() |
| app\university\proctor\actions.ts : submitProctorRequest() | auth() |
| app\university\proctor\actions.ts : getMyProctorRequests() | auth() |
| app\university\reps\actions.ts : getUniversityReps() | auth() |
| app\university\reps\actions.ts : createRep() | auth() |
| app\university\reps\actions.ts : toggleRepStatus() | auth() |
| app\university\settings\actions.ts : updateUniversitySettings() | auth() |
| app\university\settings\actions.ts : saveUniversityNotificationPrefs() | auth() |
| app\university\settings\logo-actions.ts : updateUniversityLogo() | requireUniversity() -> auth() |
| app\university\settings\logo-actions.ts : removeUniversityLogo() | requireUniversity() -> auth() |
