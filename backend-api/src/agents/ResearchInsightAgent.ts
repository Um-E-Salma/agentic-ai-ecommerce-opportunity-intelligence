import { IGeminiReasoningService } from "../services/GeminiReasoningService";
import { DataSourceAdapter } from "../adapters/DataSourceAdapter";

export class ResearchInsightAgent {
    constructor(
        private reasoningService: IGeminiReasoningService,
        private dataAdapter: DataSourceAdapter
    ) {}

    async run(input: string) {
        console.log(`[ResearchInsightAgent] Running with input: "${input.substring(0, 50)}..."`);
        
        // 1. Understand input using Gemini
        const understanding = await this.reasoningService.understandInput(input);
        console.log(`[ResearchInsightAgent] Understanding complete. Found ${understanding.trendSignals.length} trend signals.`);

        // 2. Extract search intent dynamically
        console.log(`[ResearchInsightAgent] Extracting dynamic search intent...`);
        const searchIntent = await this.reasoningService.extractSearchIntent(input);
        console.log(`[ResearchInsightAgent] Search intent extracted: ${searchIntent.mainIntent}`);


        // 2. Research trends using Data Adapter
        const researchResults = [];
        for (const signal of understanding.trendSignals) {
            console.log(`[ResearchInsightAgent] Researching trend for ${signal.keyword} in ${signal.category}`);
            const research = await this.dataAdapter.searchTrends(signal.keyword);
            researchResults.push({
                signal,
                research
            });
        }

        return {
            summary: understanding.summary,
            keyFacts: understanding.keyFacts,
            trendSignals: understanding.trendSignals,
            risks: understanding.risks,
            researchResults,
            searchIntent
        };
    }
}
