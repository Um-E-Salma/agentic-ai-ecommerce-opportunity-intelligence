import { PrismaClient } from "@prisma/client";
import { IGeminiReasoningService } from "./GeminiReasoningService";
import { CampaignSafetyGate, SafetyGateResult } from "./CampaignSafetyGate";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export class AnalyticsStrategyService {
    private reasoningService: IGeminiReasoningService;

    constructor(reasoningService: IGeminiReasoningService) {
        this.reasoningService = reasoningService;
    }

    private async logAction(action: string, context?: any, message?: string) {
        await prisma.strategyActionLog.create({
            data: {
                action,
                context: context ? JSON.stringify(context) : null,
                message: message ?? null
            }
        });
    }

    /**
     * Seeds demo leads if none exist.
     */
    async seedDemoLeads() {
        const count = await prisma.lead.count();
        if (count === 0) {
            await prisma.lead.createMany({
                data: [
                    { name: "Demo User 1", email: "demo1@example.com", source: "SEED", consentStatus: "DEMO_ONLY" },
                    { name: "Demo User 2", email: "demo2@example.com", source: "SEED", consentStatus: "DEMO_ONLY" },
                    { name: "Demo User 3", email: "demo3@example.com", source: "SEED", consentStatus: "DEMO_ONLY" },
                    { name: "Demo User 4", email: "demo4@example.com", source: "SEED", consentStatus: "DEMO_ONLY" },
                    { name: "Demo User 5", email: "demo5@example.com", source: "SEED", consentStatus: "DEMO_ONLY" },
                ]
            });
        }
    }

    /**
     * Parse a time window string into days.
     */
    private parseWindow(windowStr?: string): number {
        if (!windowStr) return 7;
        const match = windowStr.match(/^(\d+)d$/i);
        if (match) {
            return parseInt(match[1] as string, 10);
        }
        return 7; // Default 7 days
    }

    /**
     * Get data sufficiency based on days analyzed.
     */
    private getDataSufficiency(daysAnalyzed: number) {
        if (daysAnalyzed <= 2) return { analysisStatus: "INSUFFICIENT_DATA", confidenceLevel: "LOW" };
        if (daysAnalyzed <= 6) return { analysisStatus: "PRELIMINARY_ANALYSIS", confidenceLevel: "MEDIUM" };
        if (daysAnalyzed <= 13) return { analysisStatus: "FULL_ANALYSIS", confidenceLevel: "GOOD" };
        return { analysisStatus: "STRONG_TREND_ANALYSIS", confidenceLevel: "HIGH" };
    }

    /**
     * Compute deterministic Business Health Score (0-100).
     */
    private calculateBusinessHealthScore(metrics: any): number {
        let score = 0;
        
        // Opportunity base (max 15)
        score += Math.min(15, (metrics.totalOpportunities * 3));
        
        // Strong candidate ratio (max 15)
        if (metrics.totalOpportunities > 0) {
            const ratio = metrics.strongCandidates / metrics.totalOpportunities;
            score += Math.min(15, (ratio * 15 * 2));
        }

        // Purchase completion (max 15)
        if (metrics.approvedCandidates > 0) {
            const purchaseRatio = metrics.purchasedCandidates / metrics.approvedCandidates;
            score += Math.min(15, (purchaseRatio * 15));
        }

        // ROI (max 15, caps at 20%)
        if (metrics.averageRoi > 0) {
            score += Math.min(15, (metrics.averageRoi / 20) * 15);
        }

        // Listing Quality (max 15, caps at 60 avg)
        if (metrics.averageQualityScore > 0) {
            score += Math.min(15, (metrics.averageQualityScore / 60) * 15);
        }

        // Optimization applied (max 10)
        score += Math.min(10, (metrics.optimizedListings * 5));

        // Campaign activity (max 15)
        score += Math.min(15, (metrics.totalCampaigns * 5));

        return Math.min(100, Math.round(score));
    }

    /**
     * Detect trend based on basic metrics comparison if possible, or fallback to heuristics.
     */
    private detectTrend(metrics: any, daysAnalyzed: number): string {
        if (daysAnalyzed < 3) return "INSUFFICIENT_DATA";
        
        // Simple heuristic for trend: 
        // If they have high ROI and good purchase rate, they are GROWING.
        // If they have low ROI or lots of rejected/skipped, DECLINING.
        // Otherwise STABLE.
        if (metrics.averageRoi > 15 && metrics.strongCandidates > metrics.skippedCandidates) {
            return "GROWING";
        } else if (metrics.averageRoi < 5 || metrics.skippedCandidates > (metrics.strongCandidates * 2)) {
            return "DECLINING";
        }
        
        return "STABLE";
    }

    /**
     * Analyzes business strategy over a time window.
     */
    async analyzeStrategy(window: string, customStart?: string, customEnd?: string) {
        await this.logAction("STRATEGY_ANALYSIS_REQUESTED", { window, customStart, customEnd });

        let endDate = new Date();
        let startDate = new Date();
        let daysAnalyzed = this.parseWindow(window);

        if (customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
            daysAnalyzed = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        } else {
            startDate.setDate(endDate.getDate() - daysAnalyzed);
        }

        const dateFilter = {
            gte: startDate,
            lte: endDate
        };

        // Gather metrics
        const opportunities = await prisma.productOpportunity.findMany({ where: { createdAt: dateFilter } });
        const purchaseCandidates = await prisma.purchaseCandidate.findMany({ where: { createdAt: dateFilter } });
        const demoListings = await prisma.demoListing.findMany({ where: { createdAt: dateFilter } });
        const optimizations = await prisma.listingOptimization.findMany({ where: { createdAt: dateFilter } });
        const campaigns = await prisma.campaign.findMany({ where: { createdAt: dateFilter } });

        // Extract numbers
        const metrics = {
            totalOpportunities: opportunities.length,
            strongCandidates: opportunities.filter(o => o.aiDecision === "STRONG_CANDIDATE").length,
            skippedCandidates: opportunities.filter(o => o.aiDecision === "SKIP").length,
            totalPurchaseCandidates: purchaseCandidates.length,
            approvedCandidates: purchaseCandidates.filter(c => c.status === "APPROVED_TO_BUY" || c.status === "OPENED_FOR_MANUAL_PURCHASE" || c.status === "PURCHASED_MANUALLY").length,
            purchasedCandidates: purchaseCandidates.filter(c => c.status === "PURCHASED_MANUALLY").length,
            totalDemoListings: demoListings.length,
            optimizedListings: optimizations.filter(o => o.status === "APPLIED").length,
            totalCampaigns: campaigns.length,
            averageRoi: opportunities.length > 0 ? opportunities.reduce((acc, o) => acc + o.roiPercent, 0) / opportunities.length : 0,
            totalProjectedProfit: demoListings.reduce((acc, l) => acc + (l.expectedProfit || 0), 0),
            averageQualityScore: demoListings.filter(l => l.latestQualityScore).length > 0 
                ? demoListings.filter(l => l.latestQualityScore).reduce((acc, l) => acc + l.latestQualityScore!, 0) / demoListings.filter(l => l.latestQualityScore).length 
                : 0,
            topCategory: "All Categories", // Simplification for now
            bestListingId: demoListings.length > 0 ? demoListings.sort((a, b) => (b.latestQualityScore || 0) - (a.latestQualityScore || 0))[0]?.id || null : null,
            totalEventsInWindow: opportunities.length + purchaseCandidates.length + demoListings.length + optimizations.length + campaigns.length
        };

        const { analysisStatus, confidenceLevel } = this.getDataSufficiency(daysAnalyzed);
        await this.logAction("DATA_SUFFICIENCY_CHECKED", { analysisStatus, confidenceLevel });

        const healthScore = this.calculateBusinessHealthScore(metrics);
        await this.logAction("HEALTH_SCORE_CALCULATED", { healthScore });

        const trendStatus = this.detectTrend(metrics, daysAnalyzed);

        const snapshot = await prisma.businessStrategySnapshot.create({
            data: {
                trendStatus,
                analysisStatus,
                confidenceLevel,
                businessHealthScore: healthScore,
                dataStartDate: startDate,
                dataEndDate: endDate,
                daysAnalyzed,
                totalEventsInWindow: metrics.totalEventsInWindow,
                totalProjectedProfit: metrics.totalProjectedProfit,
                averageRoi: metrics.averageRoi,
                topCategory: metrics.topCategory,
                bestListingId: metrics.bestListingId,
                keyInsights: JSON.stringify([
                    `Analyzed ${daysAnalyzed} days of data.`,
                    `Found ${metrics.totalOpportunities} opportunities with average ROI of ${metrics.averageRoi.toFixed(1)}%.`,
                    `Generated ${metrics.totalDemoListings} listings.`
                ]),
                recommendedNextAction: "Use AI to generate campaign strategy.",
                riskWarnings: JSON.stringify(analysisStatus === "INSUFFICIENT_DATA" ? ["Not enough data to make strong recommendations."] : [])
            }
        });

        return { snapshot, metrics };
    }

    /**
     * Run Gemini AI campaign strategy reasoning and validate it with CampaignSafetyGate.
     */
    async generateCampaignDraft(snapshotId: string, metricsContext: any, windowStr: string) {
        await this.logAction("GEMINI_CAMPAIGN_REASONING_REQUESTED", { snapshotId });

        const snapshot = await prisma.businessStrategySnapshot.findUnique({ where: { id: snapshotId } });
        if (!snapshot) throw new Error("Snapshot not found");

        // Prepare full context for Gemini
        const analyticsContext = {
            analysisStatus: snapshot.analysisStatus,
            confidenceLevel: snapshot.confidenceLevel,
            trendStatus: snapshot.trendStatus,
            businessHealthScore: snapshot.businessHealthScore,
            averageRoi: snapshot.averageRoi,
            totalProjectedProfit: snapshot.totalProjectedProfit,
            daysAnalyzed: snapshot.daysAnalyzed,
            bestListingId: snapshot.bestListingId,
            ...metricsContext
        };

        const strategyOutput = await this.reasoningService.recommendCampaignStrategy(analyticsContext);
        await this.logAction("CAMPAIGN_RECOMMENDATION_GENERATED", strategyOutput);

        // Run through safety gate
        const safetyResult = CampaignSafetyGate.validate(strategyOutput, analyticsContext);
        await this.logAction("SAFETY_GATE_CHECKED", { passed: safetyResult.passed, action: safetyResult.action, modifications: safetyResult.modifications });

        if (!safetyResult.passed || safetyResult.action === "BLOCKED") {
            await this.logAction("UNSAFE_RECOMMENDATION_BLOCKED", { blockedReasons: safetyResult.blockedReasons });
            throw new Error(`Campaign blocked by Safety Gate: ${safetyResult.blockedReasons.join(", ")}`);
        }

        const validStrat = safetyResult.validatedStrategy;

        // Ensure demo leads exist
        await this.seedDemoLeads();

        // Create campaign
        if (validStrat.shouldCreateCampaign || validStrat.campaignType === "COLLECT_MORE_DATA") {
            const campaign = await prisma.campaign.create({
                data: {
                    name: validStrat.campaignName,
                    campaignType: validStrat.campaignType,
                    listingId: validStrat.selectedListingId,
                    channel: validStrat.recommendedChannel,
                    targetSegment: validStrat.targetSegment,
                    subject: validStrat.subject,
                    body: validStrat.messageBody,
                    discountPercent: validStrat.discountPercent,
                    status: "DRAFT",
                    complianceNote: JSON.stringify(validStrat.safetyNotes),
                    confidenceLevel: validStrat.confidence < 0.3 ? "LOW" : validStrat.confidence < 0.6 ? "MEDIUM" : validStrat.confidence < 0.8 ? "GOOD" : "HIGH",
                    riskLevel: validStrat.riskLevel,
                    analysisWindow: windowStr,
                    geminiReason: validStrat.reason,
                    safetyGateResult: safetyResult.action,
                    safetyGateNotes: JSON.stringify(safetyResult.modifications)
                }
            });
            
            // If it's just a data collection recommendation, we can consider it simulated already or just a draft.
            // We'll leave it as DRAFT for the user to view.
            await this.logAction("CAMPAIGN_DRAFT_CREATED", { campaignId: campaign.id });
            return { campaign, safetyResult };
        }

        return { campaign: null, safetyResult };
    }

    /**
     * Simulate a campaign execution.
     */
    async simulateCampaign(campaignId: string) {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (!campaign) throw new Error("Campaign not found");

        if (campaign.status !== "DRAFT") throw new Error(`Cannot simulate campaign in status ${campaign.status}`);

        // Re-calculate expected impact dynamically based on discount and confidence
        // For simulation, we create a slight variation of the original intent.
        const baseReach = 100 + Math.floor(Math.random() * 500); // Simulated audience
        const clickRate = campaign.discountPercent ? 0.05 + (campaign.discountPercent / 200) : 0.05;
        const convRate = campaign.discountPercent ? 0.1 + (campaign.discountPercent / 100) : 0.1;
        
        const clicks = Math.round(baseReach * clickRate);
        const conversions = Math.round(clicks * convRate);
        
        // Mock revenue: Assume $50 average order value
        const aov = 50 * (1 - (campaign.discountPercent || 0) / 100);
        const revenue = conversions * aov;
        // Mock profit: Assume 40% margin before discount
        const profit = revenue * (0.4 - ((campaign.discountPercent || 0) / 100));

        const result = await prisma.campaignSimulationResult.create({
            data: {
                campaignId: campaign.id,
                expectedReach: baseReach,
                projectedClicks: clicks,
                projectedConversions: conversions,
                projectedRevenue: Math.max(0, revenue),
                projectedProfit: Math.max(0, profit),
                beforeState: JSON.stringify({ status: "DRAFT", metrics: "No data" }),
                afterState: JSON.stringify({ status: "SIMULATED", reason: "Simulated safely." })
            }
        });

        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: "SIMULATED" }
        });

        await this.logAction("CAMPAIGN_SIMULATION_EXECUTED", { campaignId: campaign.id, resultId: result.id });
        await this.logAction("DASHBOARD_OUTCOME_UPDATED", { campaignId: campaign.id });

        return result;
    }
}
