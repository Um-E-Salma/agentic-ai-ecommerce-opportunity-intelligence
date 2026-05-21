import { IGeminiReasoningService } from "../services/GeminiReasoningService";

export class ResaleListingAgent {
    constructor(
        private reasoningService: IGeminiReasoningService
    ) {}

    async run(opportunities: any[]) {
        console.log(`[ResaleListingAgent] Running with ${opportunities.length} opportunities.`);
        
        const recommendations = [];

        for (const op of opportunities) {
            if (op.status === "APPROVED" || op.status === "REVIEW") {
                console.log(`[ResaleListingAgent] Recommending listing for ${op.product.title}`);
                const recommendation = await this.reasoningService.recommendListing(op.product);
                recommendations.push({
                    opportunityId: op.product.id,
                    recommendation
                });
            }
        }

        return recommendations;
    }
}
