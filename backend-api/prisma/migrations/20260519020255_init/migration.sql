-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UnstructuredInput" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "urls" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inputId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "selectedCategories" TEXT,
    "sourceMode" TEXT,
    "notes" TEXT,
    CONSTRAINT "AgentRun_inputId_fkey" FOREIGN KEY ("inputId") REFERENCES "UnstructuredInput" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "decision" TEXT,
    "toolUsed" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "logs" TEXT,
    CONSTRAINT "AgentTask_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentHandoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "payloadSummary" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentHandoff_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExtractedInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "evidence" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtractedInsight_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImpactAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "businessImpact" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "affectedCategory" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpactAnalysis_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "ExtractedInsight" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductOpportunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "category" TEXT NOT NULL,
    "sourcePlatform" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "imageUrl" TEXT,
    "sourcePrice" REAL NOT NULL,
    "shippingCost" REAL NOT NULL,
    "condition" TEXT,
    "availability" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "estimatedSellingPrice" REAL NOT NULL,
    "marketplace" TEXT NOT NULL,
    "marketplaceListingTitle" TEXT,
    "marketplaceListingUrl" TEXT,
    "matchScore" REAL NOT NULL,
    "comparisonConfidence" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "totalFees" REAL NOT NULL,
    "netProfit" REAL NOT NULL,
    "roiPercent" REAL NOT NULL,
    "marginPercent" REAL NOT NULL,
    "profitGate" TEXT NOT NULL,
    "aiDecision" TEXT NOT NULL,
    "aiConfidence" REAL NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "aiReason" TEXT,
    "warnings" TEXT,
    "recommendedAction" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductOpportunity_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendedAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expectedOutcome" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendedAction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SimulatedAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "logs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SimulatedAction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseCandidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "projectedProfit" REAL NOT NULL,
    "roiPercent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseCandidate_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDraft_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ListingRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "opportunityId" TEXT NOT NULL,
    "recommendedPlatform" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT,
    "recommendedPrice" REAL NOT NULL,
    "expectedProfit" REAL NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListingRecommendation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ProductOpportunity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "opportunityId" TEXT,
    "campaignName" TEXT NOT NULL,
    "targetSegment" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "discountRecommendation" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignDraft_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentTraceLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "stepType" TEXT NOT NULL,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "toolUsed" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentTraceLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "totalInputsAnalyzed" INTEGER NOT NULL,
    "insightsExtracted" INTEGER NOT NULL,
    "opportunitiesFound" INTEGER NOT NULL,
    "strongCandidates" INTEGER NOT NULL,
    "reviewCandidates" INTEGER NOT NULL,
    "skippedProducts" INTEGER NOT NULL,
    "projectedProfit" REAL NOT NULL,
    "averageRoi" REAL NOT NULL,
    "bestCategory" TEXT,
    "trendStatus" TEXT,
    "recommendedNextAction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "minRoiForReview" REAL NOT NULL DEFAULT 5.0,
    "minRoiForStrongCandidate" REAL NOT NULL DEFAULT 20.0,
    "minNetProfit" REAL NOT NULL DEFAULT 5.0,
    "minMatchScore" REAL NOT NULL DEFAULT 0.75,
    "marketplaceFeePercent" REAL NOT NULL DEFAULT 13.25,
    "paymentFeePercent" REAL NOT NULL DEFAULT 2.9,
    "fixedTransactionFee" REAL NOT NULL DEFAULT 0.30,
    "packagingCost" REAL NOT NULL DEFAULT 1.00,
    "returnReserve" REAL NOT NULL DEFAULT 2.00,
    "estimatedShippingToBuyer" REAL NOT NULL DEFAULT 5.00,
    "riskTolerance" TEXT NOT NULL DEFAULT 'MEDIUM',
    "geminiModel" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    "dataSourceMode" TEXT NOT NULL DEFAULT 'actual_with_fallback',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
