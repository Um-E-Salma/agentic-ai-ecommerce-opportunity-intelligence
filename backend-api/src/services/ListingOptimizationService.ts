import { PrismaClient, DemoListing } from "@prisma/client";
import { IGeminiReasoningService } from "./GeminiReasoningService";

export interface QualityScoreResult {
    overallScore: number;
    titleScore: number;
    descriptionScore: number;
    tagScore: number;
    priceScore: number;
    profitSafetyScore: number;
    improvementTips: string[];
}

export class ListingOptimizationService {
    constructor(
        private prisma: PrismaClient,
        private reasoningService: IGeminiReasoningService
    ) {}

    calculateQualityScore(listing: any): QualityScoreResult {
        let titleScore = 0;
        let descriptionScore = 0;
        let tagScore = 0;
        let priceScore = 0;
        let profitSafetyScore = 0;
        const improvementTips: string[] = [];

        // Title logic
        if (listing.title && listing.title.length > 50) titleScore = 20;
        else if (listing.title && listing.title.length > 20) { titleScore = 10; improvementTips.push("Lengthen title with more keywords."); }
        else improvementTips.push("Title is too short or missing.");

        // Description logic
        if (listing.description && listing.description.length > 150) descriptionScore = 20;
        else if (listing.description && listing.description.length > 50) { descriptionScore = 10; improvementTips.push("Add more details to description."); }
        else improvementTips.push("Description is too short.");

        // Tag logic
        let tagsArr: string[] = [];
        try { tagsArr = listing.tags ? JSON.parse(listing.tags) : []; } catch { tagsArr = []; }
        if (tagsArr.length >= 3) tagScore = 20;
        else if (tagsArr.length > 0) { tagScore = 10; improvementTips.push("Add more tags."); }
        else improvementTips.push("No tags found.");

        // Price logic
        if (listing.recommendedPrice && listing.recommendedPrice > 0) priceScore = 20;
        else improvementTips.push("Price must be set.");

        // Profit logic
        if (listing.expectedProfit && listing.expectedProfit > 2.0) profitSafetyScore = 20;
        else if (listing.expectedProfit && listing.expectedProfit > 0) { profitSafetyScore = 10; improvementTips.push("Profit margin is very tight."); }
        else improvementTips.push("Listing is not profitable.");

        const overallScore = titleScore + descriptionScore + tagScore + priceScore + profitSafetyScore;

        return {
            overallScore,
            titleScore,
            descriptionScore,
            tagScore,
            priceScore,
            profitSafetyScore,
            improvementTips
        };
    }

    async generatePricingOptions(listingId: string) {
        const listing = await this.prisma.demoListing.findUnique({ where: { id: listingId } });
        if (!listing) throw new Error("Listing not found");

        const basePrice = listing.recommendedPrice;
        const baseProfit = listing.expectedProfit;
        
        // Delete old recommendations
        await this.prisma.pricingRecommendation.deleteMany({ where: { listingId } });

        const options = [
            {
                strategy: "AGGRESSIVE",
                price: basePrice * 0.9,
                expectedProfit: baseProfit - (basePrice * 0.1),
                roiPercent: ((baseProfit - (basePrice * 0.1)) / (basePrice * 0.9)) * 100,
                marginPercent: ((baseProfit - (basePrice * 0.1)) / (basePrice * 0.9)) * 100,
                riskLevel: "HIGH",
                reason: "Fastest moving, lowest margin."
            },
            {
                strategy: "BALANCED",
                price: basePrice,
                expectedProfit: baseProfit,
                roiPercent: (baseProfit / basePrice) * 100,
                marginPercent: (baseProfit / basePrice) * 100,
                riskLevel: "LOW",
                reason: "Recommended based on deterministic models."
            },
            {
                strategy: "PREMIUM",
                price: basePrice * 1.2,
                expectedProfit: baseProfit + (basePrice * 0.2),
                roiPercent: ((baseProfit + (basePrice * 0.2)) / (basePrice * 1.2)) * 100,
                marginPercent: ((baseProfit + (basePrice * 0.2)) / (basePrice * 1.2)) * 100,
                riskLevel: "MEDIUM",
                reason: "Maximized profit, slower turnover."
            }
        ];

        for (const opt of options) {
            await this.prisma.pricingRecommendation.create({
                data: {
                    listingId,
                    ...opt
                }
            });
        }

        await this.logAction(listingId, "GENERATE_PRICING", "Generated 3 pricing options");

        return await this.prisma.pricingRecommendation.findMany({ where: { listingId } });
    }

    async optimizeListing(listingId: string) {
        const listing = await this.prisma.demoListing.findUnique({ where: { id: listingId } });
        if (!listing) throw new Error("Listing not found");

        const oldScore = this.calculateQualityScore(listing);
        const optimizationData = await this.reasoningService.optimizeListingData(listing);

        const pseudoNewListing = {
            ...listing,
            title: optimizationData.optimizedTitle,
            description: optimizationData.optimizedDescription,
            tags: JSON.stringify(optimizationData.optimizedTags)
        };

        const newScore = this.calculateQualityScore(pseudoNewListing);

        const optimization = await this.prisma.listingOptimization.create({
            data: {
                listingId,
                originalTitle: listing.title,
                optimizedTitle: optimizationData.optimizedTitle,
                originalDescription: listing.description,
                optimizedDescription: optimizationData.optimizedDescription,
                originalTags: listing.tags,
                optimizedTags: JSON.stringify(optimizationData.optimizedTags),
                originalPrice: listing.recommendedPrice,
                optimizedPrice: listing.recommendedPrice, // Pricing handled separately
                oldQualityScore: oldScore.overallScore,
                newQualityScore: newScore.overallScore,
                improvementSummary: optimizationData.improvementSummary,
                warnings: JSON.stringify(optimizationData.warnings),
                status: "DRAFT"
            }
        });

        await this.logAction(listingId, "OPTIMIZE_LISTING", "Generated optimization draft");
        
        // Also generate pricing options automatically when optimizing
        await this.generatePricingOptions(listingId);

        return optimization;
    }

    async applyOptimization(listingId: string, optimizationId: string, selectedPricingStrategy: string = "BALANCED") {
        const optimization = await this.prisma.listingOptimization.findUnique({ where: { id: optimizationId } });
        if (!optimization) throw new Error("Optimization not found");

        const priceRec = await this.prisma.pricingRecommendation.findFirst({
            where: { listingId, strategy: selectedPricingStrategy }
        });

        const newPrice = priceRec ? priceRec.price : optimization.optimizedPrice;
        const newProfit = priceRec ? priceRec.expectedProfit : 0; // Or keep original

        const listing = await this.prisma.demoListing.update({
            where: { id: listingId },
            data: {
                title: optimization.optimizedTitle,
                description: optimization.optimizedDescription,
                tags: optimization.optimizedTags,
                recommendedPrice: newPrice,
                ...(priceRec && { expectedProfit: newProfit }),
                latestQualityScore: optimization.newQualityScore
            }
        });

        await this.prisma.listingOptimization.update({
            where: { id: optimizationId },
            data: { status: "APPLIED" }
        });

        await this.logAction(listingId, "APPLY_OPTIMIZATION", `Applied optimization with ${selectedPricingStrategy} pricing`);

        return listing;
    }

    async revertOptimization(listingId: string, optimizationId: string) {
        const optimization = await this.prisma.listingOptimization.findUnique({ where: { id: optimizationId } });
        if (!optimization) throw new Error("Optimization not found");

        const listing = await this.prisma.demoListing.update({
            where: { id: listingId },
            data: {
                title: optimization.originalTitle,
                description: optimization.originalDescription,
                tags: optimization.originalTags,
                recommendedPrice: optimization.originalPrice,
                latestQualityScore: optimization.oldQualityScore
            }
        });

        await this.prisma.listingOptimization.update({
            where: { id: optimizationId },
            data: { status: "REVERTED" }
        });

        await this.logAction(listingId, "REVERT_OPTIMIZATION", "Reverted to original listing");

        return listing;
    }

    async getOptimizations(listingId: string) {
        return await this.prisma.listingOptimization.findMany({
            where: { listingId },
            orderBy: { createdAt: 'desc' }
        });
    }

    private async logAction(listingId: string, action: string, message: string) {
        // Safe trace log using ListingActionLog (no FK to AgentRun required)
        console.log(`[ListingOptimizationService] ${listingId} - ${action}: ${message}`);
        try {
            await this.prisma.listingActionLog.create({
                data: {
                    listingId,
                    action,
                    statusBefore: "N/A",
                    statusAfter: "N/A",
                    message
                }
            });
        } catch (err) {
            console.error("Trace log failed", err);
        }
    }
}
