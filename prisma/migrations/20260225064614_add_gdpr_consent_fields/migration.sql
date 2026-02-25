-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'UNIVERSITY', 'UNIVERSITY_REP', 'ADMIN');

-- CreateEnum
CREATE TYPE "FieldCategory" AS ENUM ('Computer Science', 'Engineering', 'Business', 'Data Science', 'Health Sciences', 'Social Sciences', 'Arts & Humanities', 'Law', 'Architecture', 'Others');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('STUDENT', 'UNIVERSITY');

-- CreateEnum
CREATE TYPE "AdvisoryStatus" AS ENUM ('NEW', 'ASSIGNED', 'SCHEDULED', 'COMPLETED', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "VideoProvider" AS ENUM ('GOOGLE_MEET', 'ZOOM', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'RESCHEDULE_PROPOSED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MeetingPurpose" AS ENUM ('ADMISSION_QUERY', 'PROGRAM_FIT', 'SCHOLARSHIP_INFO', 'DOCUMENT_HELP', 'APPLICATION_STATUS', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "consentMarketing" BOOLEAN NOT NULL DEFAULT true,
    "consentAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "consentWithdrawnAt" TIMESTAMP(3),
    "deletionRequestedAt" TIMESTAMP(3),
    "deletionScheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "universityId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "whatsappNumber" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "country" TEXT DEFAULT 'India',
    "ipAddress" TEXT,
    "ipCity" TEXT,
    "ipRegion" TEXT,
    "ipCountry" TEXT,
    "ipPincode" TEXT,
    "ipLatitude" TEXT,
    "ipLongitude" TEXT,
    "ipIsp" TEXT,
    "cityMismatch" BOOLEAN NOT NULL DEFAULT false,
    "pincodeMismatch" BOOLEAN NOT NULL DEFAULT false,
    "fullName" TEXT,
    "gender" TEXT,
    "ageGroup" TEXT,
    "currentStatus" TEXT,
    "fieldOfInterest" TEXT,
    "preferredCountries" TEXT,
    "preferredDegree" TEXT,
    "budgetRange" TEXT,
    "englishTestType" TEXT,
    "englishScore" TEXT,
    "greScore" TEXT,
    "gmatScore" TEXT,
    "preferredIntake" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "profileVersion" INTEGER NOT NULL DEFAULT 1,
    "cvUrl" TEXT,
    "cvFileName" TEXT,
    "cvUploadedAt" TIMESTAMP(3),
    "cvSizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileChangeLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changedFields" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "website" TEXT,
    "accreditationNo" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByAdmin" TEXT,
    "verificationDocUrl" TEXT,
    "docUploadDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "contactEmail" TEXT,
    "logo" TEXT,
    "brandColor" TEXT DEFAULT '#2563eb',
    "about" TEXT,
    "foundedYear" INTEGER,
    "campusSize" TEXT,
    "totalStudents" INTEGER,
    "internationalStudents" INTEGER,
    "repName" TEXT,
    "repDesignation" TEXT,
    "repEmail" TEXT,
    "contactPhone" TEXT,
    "scholarshipsAvailable" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "certAuthority" BOOLEAN NOT NULL DEFAULT false,
    "certLegitimacy" BOOLEAN NOT NULL DEFAULT false,
    "certPurpose" BOOLEAN NOT NULL DEFAULT false,
    "certAccountability" BOOLEAN NOT NULL DEFAULT false,
    "certTimestamp" TIMESTAMP(3),
    "certIp" TEXT,
    "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "defaultDuration" INTEGER NOT NULL DEFAULT 15,
    "dailyCapPerRep" INTEGER NOT NULL DEFAULT 10,
    "minLeadTimeHours" INTEGER NOT NULL DEFAULT 24,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "universityNameFromEmail" TEXT,
    "countryFromEmail" TEXT,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityDocument" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "fieldCategory" TEXT NOT NULL,
    "durationMonths" INTEGER,
    "tuitionFee" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "stemDesignated" BOOLEAN NOT NULL DEFAULT false,
    "englishTests" TEXT[],
    "minEnglishScore" DOUBLE PRECISION,
    "intakes" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INTERESTED',
    "studentMessage" TEXT,
    "universityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisoryRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "targetDegree" TEXT,
    "fieldOfInterest" TEXT,
    "targetCountry" TEXT,
    "budgetRange" TEXT,
    "englishScore" TEXT,
    "greGmatScore" TEXT,
    "preferredTime" TEXT,
    "targetIntake" TEXT,
    "openQuestion" TEXT,
    "status" "AdvisoryStatus" NOT NULL DEFAULT 'NEW',
    "adviserId" TEXT,
    "internalNotes" TEXT,
    "sessionLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AdvisoryRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicInquiry" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "phone" TEXT,
    "orgName" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "institutionType" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactDesignation" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "preferredDateStart" TIMESTAMP(3) NOT NULL,
    "preferredDateEnd" TIMESTAMP(3) NOT NULL,
    "expectedStudentCount" TEXT NOT NULL,
    "preferredCountries" JSONB NOT NULL,
    "fieldsOfStudy" JSONB NOT NULL,
    "additionalRequirements" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostRequestOutreach" (
    "id" TEXT NOT NULL,
    "hostRequestId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseNote" TEXT,

    CONSTRAINT "HostRequestOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityProfile" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "meetingDurationOptions" INTEGER[],
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "minLeadTimeHours" INTEGER NOT NULL DEFAULT 12,
    "dailyCap" INTEGER NOT NULL DEFAULT 8,
    "videoProvider" "VideoProvider" NOT NULL DEFAULT 'GOOGLE_MEET',
    "externalLink" TEXT,
    "eligibleDegreeLevels" TEXT[],
    "eligibleCountries" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "universityId" TEXT NOT NULL,
    "repId" TEXT,
    "programId" TEXT,
    "title" TEXT,
    "agenda" TEXT,
    "meetingType" TEXT,
    "joinUrl" TEXT,
    "purpose" "MeetingPurpose" NOT NULL,
    "studentQuestions" TEXT,
    "uploadedDocUrl" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "studentTimezone" TEXT NOT NULL,
    "repTimezone" TEXT NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'PENDING',
    "videoProvider" "VideoProvider" NOT NULL,
    "videoLink" TEXT,
    "meetingCode" TEXT NOT NULL,
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "isLateCancel" BOOLEAN NOT NULL DEFAULT false,
    "rescheduleProposedBy" TEXT,
    "rescheduleProposedTime" TIMESTAMP(3),
    "universityNotes" TEXT,
    "studentNotes" TEXT,
    "studentRating" INTEGER,
    "universityRating" INTEGER,
    "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminder10minSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingParticipant" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "participantUserId" TEXT NOT NULL,
    "participantType" TEXT NOT NULL DEFAULT 'STUDENT',
    "rsvpStatus" TEXT NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingNotification" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "contentPreview" TEXT,

    CONSTRAINT "MeetingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "meetingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemReport" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "path" TEXT,
    "screenshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotMisses" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotMisses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNotification" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityNotification" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "announcementType" TEXT NOT NULL DEFAULT 'GENERAL',
    "filters" JSONB,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "sentById" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredContent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "universityId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "sponsorType" TEXT NOT NULL DEFAULT 'UNIVERSITY',
    "mobileImageUrl" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "placement" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" BOOLEAN NOT NULL,
    "newValue" BOOLEAN NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE INDEX "ProfileChangeLog_studentId_idx" ON "ProfileChangeLog"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "University_userId_key" ON "University"("userId");

-- CreateIndex
CREATE INDEX "University_isVerified_idx" ON "University"("isVerified");

-- CreateIndex
CREATE INDEX "UniversityDocument_universityId_idx" ON "UniversityDocument"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_studentId_universityId_programId_key" ON "Interest"("studentId", "universityId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "HostRequest_referenceNumber_key" ON "HostRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "HostRequestOutreach_hostRequestId_idx" ON "HostRequestOutreach"("hostRequestId");

-- CreateIndex
CREATE INDEX "HostRequestOutreach_universityId_idx" ON "HostRequestOutreach"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "HostRequestOutreach_hostRequestId_universityId_key" ON "HostRequestOutreach"("hostRequestId", "universityId");

-- CreateIndex
CREATE INDEX "AvailabilityProfile_universityId_idx" ON "AvailabilityProfile"("universityId");

-- CreateIndex
CREATE INDEX "AvailabilityProfile_repId_idx" ON "AvailabilityProfile"("repId");

-- CreateIndex
CREATE INDEX "Meeting_studentId_idx" ON "Meeting"("studentId");

-- CreateIndex
CREATE INDEX "Meeting_universityId_idx" ON "Meeting"("universityId");

-- CreateIndex
CREATE INDEX "Meeting_repId_idx" ON "Meeting"("repId");

-- CreateIndex
CREATE INDEX "Meeting_status_idx" ON "Meeting"("status");

-- CreateIndex
CREATE INDEX "MeetingParticipant_participantUserId_idx" ON "MeetingParticipant"("participantUserId");

-- CreateIndex
CREATE INDEX "MeetingParticipant_meetingId_idx" ON "MeetingParticipant"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingParticipant_meetingId_participantUserId_key" ON "MeetingParticipant"("meetingId", "participantUserId");

-- CreateIndex
CREATE INDEX "MeetingNotification_meetingId_idx" ON "MeetingNotification"("meetingId");

-- CreateIndex
CREATE INDEX "MeetingNotification_recipientId_idx" ON "MeetingNotification"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "AvailabilitySlot_meetingId_key" ON "AvailabilitySlot"("meetingId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_universityId_idx" ON "AvailabilitySlot"("universityId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_repId_idx" ON "AvailabilitySlot"("repId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_studentId_universityId_key" ON "Bookmark"("studentId", "universityId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_studentId_key" ON "EventRegistration"("eventId", "studentId");

-- CreateIndex
CREATE INDEX "SystemLog_type_idx" ON "SystemLog"("type");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "BotMisses_createdAt_idx" ON "BotMisses"("createdAt");

-- CreateIndex
CREATE INDEX "StudentNotification_studentId_idx" ON "StudentNotification"("studentId");

-- CreateIndex
CREATE INDEX "UniversityNotification_universityId_idx" ON "UniversityNotification"("universityId");

-- CreateIndex
CREATE INDEX "AdminAnnouncement_sentById_idx" ON "AdminAnnouncement"("sentById");

-- CreateIndex
CREATE INDEX "SponsoredContent_universityId_idx" ON "SponsoredContent"("universityId");

-- CreateIndex
CREATE INDEX "SponsoredContent_isActive_idx" ON "SponsoredContent"("isActive");

-- CreateIndex
CREATE INDEX "ConsentHistory_userId_idx" ON "ConsentHistory"("userId");

-- CreateIndex
CREATE INDEX "ConsentHistory_changedAt_idx" ON "ConsentHistory"("changedAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileChangeLog" ADD CONSTRAINT "ProfileChangeLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityDocument" ADD CONSTRAINT "UniversityDocument_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisoryRequest" ADD CONSTRAINT "AdvisoryRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisoryRequest" ADD CONSTRAINT "AdvisoryRequest_adviserId_fkey" FOREIGN KEY ("adviserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostRequestOutreach" ADD CONSTRAINT "HostRequestOutreach_hostRequestId_fkey" FOREIGN KEY ("hostRequestId") REFERENCES "HostRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostRequestOutreach" ADD CONSTRAINT "HostRequestOutreach_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityProfile" ADD CONSTRAINT "AvailabilityProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityProfile" ADD CONSTRAINT "AvailabilityProfile_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingParticipant" ADD CONSTRAINT "MeetingParticipant_participantUserId_fkey" FOREIGN KEY ("participantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNotification" ADD CONSTRAINT "MeetingNotification_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingNotification" ADD CONSTRAINT "MeetingNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemReport" ADD CONSTRAINT "SystemReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNotification" ADD CONSTRAINT "StudentNotification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityNotification" ADD CONSTRAINT "UniversityNotification_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAnnouncement" ADD CONSTRAINT "AdminAnnouncement_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredContent" ADD CONSTRAINT "SponsoredContent_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentHistory" ADD CONSTRAINT "ConsentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
