-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "universityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "country" TEXT,
    "currentStatus" TEXT,
    "yearOfPassing" INTEGER,
    "fieldOfInterest" TEXT,
    "preferredCountries" TEXT,
    "preferredDegree" TEXT,
    "budgetRange" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionName" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedDate" TIMESTAMP(3),
    "logo" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL',
    "defaultDuration" INTEGER NOT NULL DEFAULT 30,
    "dailyCapPerRep" INTEGER NOT NULL DEFAULT 8,
    "minLeadTimeHours" INTEGER NOT NULL DEFAULT 12,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 15,
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "blackoutDates" TEXT[],

    CONSTRAINT "UniversityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programName" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "tuitionFee" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "intakeDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "repUserId" TEXT NOT NULL,
    "repName" TEXT NOT NULL,
    "repTimezone" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "slotStartTime" TEXT NOT NULL,
    "slotEndTime" TEXT NOT NULL,
    "meetingDurationOptions" INTEGER[],
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "minLeadTimeHours" INTEGER NOT NULL DEFAULT 12,
    "dailyCap" INTEGER NOT NULL DEFAULT 8,
    "audioOnlyAllowed" BOOLEAN NOT NULL DEFAULT true,
    "videoProvider" TEXT NOT NULL,
    "externalLink" TEXT,
    "eligibleDegreeLevels" TEXT[],
    "eligibleCountries" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "blackoutDates" TEXT[],

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "repId" TEXT NOT NULL,
    "programId" TEXT,
    "meetingPurpose" TEXT NOT NULL,
    "studentQuestions" TEXT,
    "uploadedDoc" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "audioOnlyRequested" BOOLEAN NOT NULL DEFAULT false,
    "proposedDatetime" TIMESTAMP(3) NOT NULL,
    "studentTimezone" TEXT NOT NULL,
    "repTimezone" TEXT NOT NULL,
    "confirmedDatetime" TIMESTAMP(3),
    "videoProvider" TEXT NOT NULL,
    "videoLink" TEXT,
    "meetingLink" TEXT,
    "meetingIdCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rescheduleProposedBy" TEXT,
    "rescheduleProposedDatetime" TIMESTAMP(3),
    "rescheduleReason" TEXT,
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "isLateCancel" BOOLEAN NOT NULL DEFAULT false,
    "universityNotes" TEXT,
    "studentNotes" TEXT,
    "studentRating" INTEGER,
    "universityRating" INTEGER,
    "followUpTemplateSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
    "reminder10minSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MeetingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingHold" (
    "id" TEXT NOT NULL,
    "repUserId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "notes" TEXT,
    "bookmarkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "convertedToMeeting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "meetingRequestId" TEXT,
    "notificationType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "contentPreview" TEXT,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetingAuditLog" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "byUserId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "MeetingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityProfile_userId_key" ON "UniversityProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_studentId_key" ON "EventRegistration"("eventId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "MeetingRequest_meetingIdCode_key" ON "MeetingRequest"("meetingIdCode");

-- CreateIndex
CREATE UNIQUE INDEX "BookingHold_repUserId_startTime_key" ON "BookingHold"("repUserId", "startTime");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityProfile" ADD CONSTRAINT "UniversityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_repUserId_fkey" FOREIGN KEY ("repUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_repId_fkey" FOREIGN KEY ("repId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingRequest" ADD CONSTRAINT "MeetingRequest_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "UniversityProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_meetingRequestId_fkey" FOREIGN KEY ("meetingRequestId") REFERENCES "MeetingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAuditLog" ADD CONSTRAINT "MeetingAuditLog_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "MeetingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetingAuditLog" ADD CONSTRAINT "MeetingAuditLog_byUserId_fkey" FOREIGN KEY ("byUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

