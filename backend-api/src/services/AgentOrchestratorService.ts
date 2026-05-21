import { PrismaClient } from "@prisma/client";
import { ResearchInsightAgent } from "../agents/ResearchInsightAgent";
import { PurchaseDecisionAgent } from "../agents/PurchaseDecisionAgent";
import { ResaleListingAgent } from "../agents/ResaleListingAgent";
import { AnalyticsCampaignAgent } from "../agents/AnalyticsCampaignAgent";
import { IGeminiReasoningService, MockGeminiReasoningService } from "./GeminiReasoningService";
import { RealGeminiReasoningService } from "./RealGeminiReasoningService";
import { DataSourceManager } from "../adapters/DataSourceManager";
import { NotificationService } from "./NotificationService";

export class AgentOrchestratorService {
    private prisma: PrismaClient;
    private reasoningService: IGeminiReasoningService;
    private dataAdapter: DataSourceManager;
    private notificationService: NotificationService;

    constructor() {
        this.prisma = new PrismaClient();

        // Use real or mock based on env
        const useMockAI = process.env.USE_MOCK_AI === "true" || !process.env.GEMINI_API_KEY;
        this.reasoningService = useMockAI ? new MockGeminiReasoningService() : new RealGeminiReasoningService();

        // Pass reasoning service to DataSourceManager so it can use Gemini
        // for intelligent analysis of scraped data (agentic approach)
        this.dataAdapter = new DataSourceManager(this.makeFallbackAwareService());

        // Notification service for auto-alerts
        this.notificationService = new NotificationService(this.prisma);
    }

    /** Wrap reasoning service in quota-aware fallback: if real Gemini hits quota, auto-switch to mock */
    private getReasoningService(): IGeminiReasoningService {
        return this.reasoningService;
    }

    private makeFallbackAwareService(): IGeminiReasoningService {
        const real = this.reasoningService;
        if (real instanceof MockGeminiReasoningService) return real;
        const mock = new MockGeminiReasoningService();
        // Proxy every method: if real throws quota/503, fall back to mock
        const handler: ProxyHandler<IGeminiReasoningService> = {
            get(target, prop) {
                const fn = (target as any)[prop];
                if (typeof fn !== 'function') return fn;
                return async (...args: any[]) => {
                    try {
                        return await fn.apply(target, args);
                    } catch (err: any) {
                        const isQuota = err.message?.includes('429') ||
                            err.message?.includes('quota') ||
                            err.message?.includes('RESOURCE_EXHAUSTED') ||
                            err.message?.includes('503') ||
                            err.message?.includes('overloaded');
                        if (isQuota) {
                            console.warn(`[Orchestrator] Gemini quota/503 – using mock fallback for ${String(prop)}`);
                            return (mock as any)[prop](...args);
                        }
                        throw err;
                    }
                };
            }
        };
        return new Proxy(real, handler);
    }

    async runWorkflow(inputId: string) {
        console.log(`[AgentOrchestratorService] Starting workflow for input: ${inputId}`);

        // 1. Fetch input
        const input = await this.prisma.unstructuredInput.findUnique({
            where: { id: inputId }
        });

        if (!input) {
            throw new Error(`Input not found: ${inputId}`);
        }

        // 2. Create Agent Run record
        const run = await this.prisma.agentRun.create({
            data: {
                inputId: input.id,
                status: "RUNNING"
            }
        });

        const traceLogs = [];

        try {
            // 3. Initialize Agents with quota-safe reasoning service
            const safeReasoning = this.makeFallbackAwareService();
            const researchAgent = new ResearchInsightAgent(safeReasoning, this.dataAdapter);
            const decisionAgent = new PurchaseDecisionAgent(safeReasoning, this.dataAdapter);
            const listingAgent = new ResaleListingAgent(safeReasoning);
            const analyticsAgent = new AnalyticsCampaignAgent(safeReasoning);

            // --- Step 1: Research ---
            traceLogs.push(await this.logStep(run.id, "ResearchInsightAgent", "Starting research..."));
            const insights = await researchAgent.run(input.content);
            traceLogs.push(await this.logStep(run.id, "ResearchInsightAgent", "Completed research.", JSON.stringify(insights)));

            // --- Step 2: Decision ---
            traceLogs.push(await this.logStep(run.id, "PurchaseDecisionAgent", "Starting decision analysis..."));
            const opportunities = await decisionAgent.run(insights);
            traceLogs.push(await this.logStep(run.id, "PurchaseDecisionAgent", "Completed decision analysis.", JSON.stringify(opportunities)));

            // --- Persist ProductOpportunity records & collect DB IDs ---
            const savedOpportunities: Array<{ dbRecord: any; rawOp: any }> = [];

            for (const op of opportunities) {
                const dbRecord = await this.prisma.productOpportunity.create({
                    data: {
                        runId: run.id,
                        sourceProductId: op.product.sourceProductId || op.product.id,
                        title: op.product.title,
                        brand: op.product.brand ?? null,
                        category: op.product.category,
                        sourcePlatform: op.product.sourcePlatform || "Wholesale Supplier",
                        sourceUrl: op.product.sourceUrl ?? null,
                        imageUrl: op.product.imageUrl ?? null,
                        sourcePrice: op.product.sourcePrice,
                        shippingCost: op.product.shippingCost,
                        condition: op.product.condition ?? null,
                        availability: op.product.availability ?? null,
                        currency: op.product.currency || "USD",
                        estimatedSellingPrice: op.comparison.price,
                        marketplace: op.comparison.marketplace || "eBay",
                        marketplaceListingTitle: op.comparison.listingTitle ?? null,
                        marketplaceListingUrl: op.comparison.listingUrl ?? null,
                        matchScore: op.comparison.matchScore,
                        comparisonConfidence: op.comparison.confidence,
                        totalCost: op.calculations.totalCost,
                        totalFees: op.calculations.totalFees,
                        netProfit: op.calculations.netProfit,
                        roiPercent: op.calculations.roiPercent,
                        marginPercent: op.calculations.marginPercent,
                        profitGate: op.calculations.profitGate,
                        aiDecision: op.aiDecision?.decision || "REVIEW",
                        aiConfidence: op.aiDecision?.confidence || 0,
                        riskLevel: op.aiDecision?.riskLevel || "MEDIUM",
                        aiReason: op.aiDecision?.reason ?? null,
                        warnings: JSON.stringify(op.aiDecision?.warnings || []),
                        recommendedAction: op.aiDecision?.recommendedAction ?? null,
                        status: op.status,
                        matchReason: op.product.matchReason,
                        usedSearchTerms: JSON.stringify(op.product.usedSearchTerms || []),
                        sourceMode: op.product.sourceMode
                    }
                });

                savedOpportunities.push({ dbRecord, rawOp: op });
            }

            // ══════════════════════════════════════════════════════════════
            //  AGENTIC AUTO-ACTIONS: Notifications + Purchase + Listing
            // ══════════════════════════════════════════════════════════════

            traceLogs.push(await this.logStep(run.id, "AgentAutoActions", "Starting auto-actions for profitable opportunities..."));

            for (const { dbRecord, rawOp } of savedOpportunities) {
                // Only auto-act on profitable (APPROVED) opportunities
                if (rawOp.status !== "APPROVED") continue;

                console.log(`[Orchestrator] 🤖 Auto-processing: "${dbRecord.title}" (profit: $${dbRecord.netProfit?.toFixed(2)})`);

                // ── Auto 1: Create Purchase Candidate ────────────────────
                let candidate;
                try {
                    candidate = await this.prisma.purchaseCandidate.create({
                        data: {
                            opportunityId: dbRecord.id,
                            status: "APPROVED_TO_BUY",
                            sourceUrl: dbRecord.sourceUrl || "",
                            projectedProfit: dbRecord.netProfit,
                            roiPercent: dbRecord.roiPercent,
                            approvedAt: new Date()
                        }
                    });
                    console.log(`[Orchestrator] ✅ Auto-created purchase candidate: ${candidate.id}`);
                    traceLogs.push(await this.logStep(run.id, "AgentAutoActions", `Auto-created purchase candidate for "${dbRecord.title}"`));
                } catch (err: any) {
                    console.error(`[Orchestrator] ❌ Failed to create purchase candidate: ${err.message}`);
                }

                // ── Auto 2: Send Notifications (Email + Telegram + WhatsApp) ──
                try {
                    const channels = ['email', 'telegram', 'whatsapp_mock'];
                    const notifResults = await this.notificationService.sendNotifications(dbRecord.id, channels);
                    const sentChannels = notifResults.filter((r: any) => r.success).map((r: any) => r.channel);
                    console.log(`[Orchestrator] 📧 Auto-notifications sent: ${sentChannels.join(', ') || 'none'}`);
                    traceLogs.push(await this.logStep(run.id, "AgentAutoActions", `Auto-sent notifications: ${sentChannels.join(', ') || 'none configured'}`));
                } catch (err: any) {
                    console.error(`[Orchestrator] ❌ Auto-notification failed: ${err.message}`);
                    traceLogs.push(await this.logStep(run.id, "AgentAutoActions", `Notification error: ${err.message}`));
                }

                // ── Auto 3: Generate Listing Draft + Create DemoListing ──
                try {
                    const recommendation = await safeReasoning.recommendListing(rawOp.product);

                    // Save listing recommendation
                    await this.prisma.listingRecommendation.create({
                        data: {
                            opportunityId: dbRecord.id,
                            recommendedPlatform: recommendation.recommendedPlatform || "Multiple",
                            title: recommendation.title || dbRecord.title,
                            description: recommendation.description || "",
                            tags: JSON.stringify(recommendation.tags || []),
                            recommendedPrice: recommendation.recommendedPrice || dbRecord.estimatedSellingPrice,
                            expectedProfit: recommendation.expectedProfit || dbRecord.netProfit,
                            status: "DRAFT"
                        }
                    });

                    // Auto-create DemoListing so user can see it + optimize it
                    await this.prisma.demoListing.create({
                        data: {
                            opportunityId: dbRecord.id,
                            candidateId: candidate?.id ?? null,
                            platform: "mock",
                            title: recommendation.title || dbRecord.title,
                            description: recommendation.description || `Listing for ${dbRecord.title}`,
                            tags: JSON.stringify(recommendation.tags || []),
                            category: dbRecord.category || "General",
                            recommendedPrice: recommendation.recommendedPrice || dbRecord.estimatedSellingPrice,
                            expectedProfit: recommendation.expectedProfit || dbRecord.netProfit,
                            status: "MOCK_LISTING_CREATED"
                        }
                    });

                    console.log(`[Orchestrator] 📝 Auto-created listing draft for "${dbRecord.title}"`);
                    traceLogs.push(await this.logStep(run.id, "AgentAutoActions", `Auto-created listing for "${dbRecord.title}"`));
                } catch (err: any) {
                    console.error(`[Orchestrator] ❌ Auto-listing failed: ${err.message}`);
                    traceLogs.push(await this.logStep(run.id, "AgentAutoActions", `Listing error: ${err.message}`));
                }
            }

            traceLogs.push(await this.logStep(run.id, "AgentAutoActions", "Completed all auto-actions."));

            // --- Step 3: Listing ---
            traceLogs.push(await this.logStep(run.id, "ResaleListingAgent", "Starting listing recommendations..."));
            const listings = await listingAgent.run(opportunities);
            traceLogs.push(await this.logStep(run.id, "ResaleListingAgent", "Completed listing recommendations.", JSON.stringify(listings)));

            // --- Step 4: Analytics ---
            traceLogs.push(await this.logStep(run.id, "AnalyticsCampaignAgent", "Starting analytics and campaign planning..."));
            const analytics = await analyticsAgent.run(opportunities);
            traceLogs.push(await this.logStep(run.id, "AnalyticsCampaignAgent", "Completed analytics.", JSON.stringify(analytics)));

            // 4. Update Agent Run record to completed
            await this.prisma.agentRun.update({
                where: { id: run.id },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date()
                }
            });

            return {
                runId: run.id,
                insights,
                opportunities,
                listings,
                analytics,
                traceLogs
            };

        } catch (error: any) {
            console.error(`[AgentOrchestratorService] Workflow failed:`, error);

            await this.prisma.agentRun.update({
                where: { id: run.id },
                data: {
                    status: "FAILED",
                    notes: error.message
                }
            });

            throw error;
        }
    }

    private async logStep(runId: string, agentName: string, stepName: string, outputSummary?: string) {
        return await this.prisma.agentTraceLog.create({
            data: {
                runId,
                agentName,
                stepName,
                stepType: "INFO",
                outputSummary: outputSummary ?? null,
                status: "SUCCESS"
            }
        });
    }
}