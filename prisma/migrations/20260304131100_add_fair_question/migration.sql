-- Fair Event Q&A
-- Adds FairQuestion table for students and universities to ask questions
-- about fair events, with optional admin answers.

CREATE TABLE "FairQuestion" (
    "id"          TEXT NOT NULL,
    "fairEventId" TEXT NOT NULL,
    "askerRole"   TEXT NOT NULL,
    "askerId"     TEXT NOT NULL,
    "question"    TEXT NOT NULL,
    "answer"      TEXT,
    "answeredAt"  TIMESTAMP(3),
    "isPublic"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FairQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FairQuestion_fairEventId_idx" ON "FairQuestion"("fairEventId");
CREATE INDEX "FairQuestion_askerId_idx" ON "FairQuestion"("askerId");

ALTER TABLE "FairQuestion" ADD CONSTRAINT "FairQuestion_fairEventId_fkey"
    FOREIGN KEY ("fairEventId") REFERENCES "FairEvent"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
