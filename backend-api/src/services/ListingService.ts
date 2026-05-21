import { PrismaClient } from "@prisma/client";
import { PlatformService } from "./PlatformService";
import { ResaleListingAgent } from "../agents/ResaleListingAgent";
import { IGeminiReasoningService, MockGeminiReasoningService } from "./GeminiReasoningService";
import { RealGeminiReasoningService } from "./RealGeminiReasoningService";

export class ListingService {
    private prisma: PrismaClient;
    private platformService: PlatformService;
    private reasoningService: IGeminiReasoningService;

    constructor() {
        this.prisma = new PrismaClient();
        this.platformService = new PlatformService();
        
        const useMockAI = process.env.USE_MOCK_AI === "true" || !process.env.GEMINI_API_KEY;
        this.reasoningService = useMockAI ? new MockGeminiReasoningService() : new RealGeminiReasoningService();
    }

    async generateRecommendation(candidateId: string) {
        const candidate = await this.prisma.purchaseCandidate.findUnique({
            where: { id: candidateId },
            include: { opportunity: true }
        });

        if (!candidate || !candidate.opportunity) {
            throw new Error("Candidate or Opportunity not found");
        }

        const recommendation = await this.reasoningService.recommendListing(candidate.opportunity);

        if (!recommendation) throw new Error("Failed to generate listing recommendation");

        return await this.prisma.listingRecommendation.create({
            data: {
                opportunityId: candidate.opportunityId,
                recommendedPlatform: recommendation.recommendedPlatform || "Multiple",
                title: recommendation.title || "Draft",
                description: recommendation.description || "",
                tags: JSON.stringify(recommendation.tags || []),
                recommendedPrice: recommendation.recommendedPrice || 0,
                expectedProfit: recommendation.expectedProfit || 0,
                status: "DRAFT"
            }
        });
    }

    async createDemoListing(data: { candidateId: string; platform: string; title: string; description: string; price: number; tags?: string; category?: string }) {
        const candidate = await this.prisma.purchaseCandidate.findUnique({
            where: { id: data.candidateId },
            include: { opportunity: true }
        });

        if (!candidate) throw new Error("Candidate not found");

        let adapter = this.platformService.getAdapter(data.platform);
        let actualPlatform = data.platform;

        // Fallback to mock if requested platform is not configured
        if (!adapter.isConfigured() || process.env.LISTING_MODE === 'mock') {
            adapter = this.platformService.getAdapter("mock");
            actualPlatform = "mock";
        }

        let listingRecord = await this.prisma.demoListing.create({
            data: {
                opportunityId: candidate.opportunityId,
                candidateId: candidate.id,
                platform: actualPlatform,
                title: data.title,
                description: data.description,
                tags: data.tags ?? null,
                category: data.category ?? null,
                recommendedPrice: data.price,
                expectedProfit: candidate.projectedProfit,
                status: "PENDING"
            }
        });

        try {
            const result = await adapter.createSandboxListing(data);
            
            const newStatus = actualPlatform === "mock" ? "MOCK_LISTING_CREATED" : "SANDBOX_LISTING_CREATED";

            listingRecord = await this.prisma.demoListing.update({
                where: { id: listingRecord.id },
                data: {
                    externalListingId: result.externalId ?? null,
                    listingUrl: result.url ?? null,
                    status: newStatus
                }
            });

            await this.logAction(listingRecord.id, "CREATE_LISTING", "PENDING", newStatus, result.message ?? undefined);

            // Log to AgentTraceLog for run tracking if opportunity belongs to a run
            if (candidate.opportunity?.runId) {
                await this.prisma.agentTraceLog.create({
                    data: {
                        runId: candidate.opportunity.runId,
                        agentName: "SandboxIntegrationService",
                        stepName: `Created ${actualPlatform} listing for candidate ${candidate.id.substring(0,6)}`,
                        stepType: "LISTING_FLOW",
                        status: "SUCCESS",
                        outputSummary: result.message ?? null
                    }
                });
            }

            return listingRecord;
        } catch (error: any) {
            listingRecord = await this.prisma.demoListing.update({
                where: { id: listingRecord.id },
                data: {
                    status: "FAILED",
                    errorMessage: error.message
                }
            });
            await this.logAction(listingRecord.id, "CREATE_LISTING", "PENDING", "FAILED", error.message);
            throw error;
        }
    }

    async getDemoListings() {
        return await this.prisma.demoListing.findMany({
            orderBy: { createdAt: 'desc' },
            include: { candidate: { include: { opportunity: true } } }
        });
    }

    private async logAction(listingId: string, action: string, statusBefore: string, statusAfter: string, message?: string) {
        return await this.prisma.listingActionLog.create({
            data: { listingId, action, statusBefore, statusAfter, message: message ?? null }
        });
    }
}
