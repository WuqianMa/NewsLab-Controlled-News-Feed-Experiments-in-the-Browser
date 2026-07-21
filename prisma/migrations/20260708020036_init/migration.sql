-- CreateTable
CREATE TABLE "Researcher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researcherId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "assignmentMethod" TEXT NOT NULL DEFAULT 'balanced',
    "targetSampleSize" INTEGER,
    "welcomeContent" TEXT NOT NULL DEFAULT '',
    "consentVersion" INTEGER NOT NULL DEFAULT 1,
    "completionContent" TEXT NOT NULL DEFAULT '',
    "completionRedirectUrl" TEXT,
    "completionCode" TEXT,
    "surveyJson" JSONB,
    "resumeWindowHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experiment_researcherId_fkey" FOREIGN KEY ("researcherId") REFERENCES "Researcher" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "contentSetId" TEXT,
    "feedLayout" TEXT NOT NULL DEFAULT 'vertical',
    "feedOrder" TEXT NOT NULL DEFAULT 'fixed',
    "maxItems" INTEGER,
    "timeLimitSeconds" INTEGER,
    "showSourceLabels" BOOLEAN NOT NULL DEFAULT true,
    "showEngagementCounts" BOOLEAN NOT NULL DEFAULT true,
    "showActionBar" BOOLEAN NOT NULL DEFAULT true,
    "customCssClass" TEXT,
    "weight" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Condition_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Condition_contentSetId_fkey" FOREIGN KEY ("contentSetId") REFERENCES "ContentSet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentSet_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "snippet" TEXT NOT NULL DEFAULT '',
    "sourceName" TEXT NOT NULL,
    "sourceLogoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFiller" BOOLEAN NOT NULL DEFAULT false,
    "sourceItemId" TEXT,
    "variantType" TEXT,
    "generationLogId" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" DATETIME,
    "approvedById" TEXT,
    "fakeLikes" INTEGER,
    "fakeComments" INTEGER,
    "fakeViews" INTEGER,
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentItem_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "ContentItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_generationLogId_fkey" FOREIGN KEY ("generationLogId") REFERENCES "GenerationLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentItem_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Researcher" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentSetItem" (
    "contentSetId" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    PRIMARY KEY ("contentSetId", "contentItemId"),
    CONSTRAINT "ContentSetItem_contentSetId_fkey" FOREIGN KEY ("contentSetId") REFERENCES "ContentSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentSetItem_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceItemId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateVariables" JSONB NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "llmTemperature" REAL NOT NULL,
    "rawRequest" TEXT NOT NULL,
    "rawResponse" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "experimentId" TEXT NOT NULL,
    "conditionId" TEXT NOT NULL,
    "externalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'consented',
    "consentVersion" INTEGER NOT NULL,
    "consentedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedItemOrder" JSONB NOT NULL,
    "isPilot" BOOLEAN NOT NULL DEFAULT false,
    "isPreview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Participant_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Participant_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "lastCheckpoint" JSONB,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    CONSTRAINT "Session_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "tabId" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL,
    "payload" JSONB,
    "clientTimestamp" BIGINT NOT NULL,
    "serverReceivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionPrompt" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SurveyResponse_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Researcher_email_key" ON "Researcher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_slug_key" ON "Experiment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ContentItem_generationLogId_key" ON "ContentItem"("generationLogId");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_experimentId_externalId_key" ON "Participant"("experimentId", "externalId");

-- CreateIndex
CREATE INDEX "Event_sessionId_clientTimestamp_idx" ON "Event"("sessionId", "clientTimestamp");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyResponse_participantId_questionId_key" ON "SurveyResponse"("participantId", "questionId");
