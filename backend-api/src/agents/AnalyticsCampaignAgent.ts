import { IGeminiReasoningService } from "../services/GeminiReasoningService";

export class AnalyticsCampaignAgent {
    constructor(
        private reasoningService: IGeminiReasoningService
    ) { }

    async run(opportunities: any[]) {
        console.log(`[AnalyticsCampaignAgent] Running with ${opportunities.length} opportunities.`);

        // 1. Analyze performance with null-safe access
        const summary = {
            totalAnalyzed: opportunities.length,
            strongCandidates: opportunities.filter(o => o.aiDecision?.decision === "STRONG_CANDIDATE").length,
            reviewCandidates: opportunities.filter(o => o.aiDecision?.decision === "REVIEW").length,
            skipped: opportunities.filter(o => o.aiDecision?.decision === "SKIP").length
        };

        // 2. Recommend campaign if there are strong candidates
        let campaignRecommendation = null;
        if (summary.strongCandidates > 0) {
            console.log(`[AnalyticsCampaignAgent] Recommending campaign for strong candidates.`);
            try {
                campaignRecommendation = await this.reasoningService.recommendCampaign(opportunities);
            } catch (err: any) {
                console.error(`[AnalyticsCampaignAgent] Campaign recommendation failed: ${err.message}`);
            }
        }

        return {
            summary,
            campaignRecommendation
        };
    }
}