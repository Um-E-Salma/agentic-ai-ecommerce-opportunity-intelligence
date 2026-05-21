import { IGeminiReasoningService } from "../services/GeminiReasoningService";
import { DataSourceAdapter } from "../adapters/DataSourceAdapter";
import { ProfitCalculatorService } from "../services/ProfitCalculatorService";

import { DataSourceManager } from "../adapters/DataSourceManager";

export class PurchaseDecisionAgent {
    constructor(
        private reasoningService: IGeminiReasoningService,
        private dataAdapter: DataSourceManager
    ) { }

    async run(insights: any) {
        console.log(`[PurchaseDecisionAgent] Running with search intent: ${insights.searchIntent?.mainIntent || 'None'}`);

        const opportunities = [];

        // 1. Discover products using search intent
        console.log(`[PurchaseDecisionAgent] Searching products dynamically...`);
        let products = [];
        if (insights.searchIntent) {
            products = await this.dataAdapter.searchProductsWithIntent(insights.searchIntent);
        } else {
            console.log(`[PurchaseDecisionAgent] No search intent found. Searching by trend signals...`);
            // Fallback to trend signals
            for (const signal of insights.trendSignals) {
                const results = await this.dataAdapter.searchTrends(signal.keyword);
                products.push(...results);
            }
        }

        console.log(`[PurchaseDecisionAgent] Found ${products.length} potential product candidates.`);

        for (const product of products.slice(0, 5)) { // Limit to top 5
            // 1.5. Evaluate Shopify Product with Gemini if applicable
            let aiDecision;
            if (product.sourceMode === "shopify_dev" || product.sourceMode === "real_shopify" || product.sourceMode === "real_ebay") {
                console.log(`[PurchaseDecisionAgent] Evaluating Shopify product with Gemini: ${product.title}`);
                aiDecision = await this.reasoningService.evaluateShopifyProduct(insights.searchIntent, [product]);
                if (aiDecision.decision === "SKIP") {
                    console.log(`[PurchaseDecisionAgent] Gemini skipped product: ${product.title}`);
                    continue;
                }
            }

            // 2. Marketplace comparison
            console.log(`[PurchaseDecisionAgent] Comparing marketplace prices for ${product.title}`);
            const comparisons = await this.dataAdapter.searchMarketplaceComparisons(product);

            if (comparisons.length > 0) {
                const comparison = comparisons[0]; // Use best match

                // 3. Profit calculation
                const calculations = ProfitCalculatorService.calculate({
                    sourcePrice: product.sourcePrice,
                    sourceShipping: product.shippingCost,
                    estimatedSellingPrice: comparison.price,
                    matchScore: comparison.matchScore
                });

                // 4. Final decision reasoning
                // 4. Final decision reasoning (if not already done by Shopify evaluation)
                const finalDecision = await this.reasoningService.makeFinalDecision(product, calculations);

                // Combine AI decisions
                const finalStatus = (aiDecision?.decision === "USE_SHOPIFY_PRODUCT" || finalDecision.decision === "STRONG_CANDIDATE") ? "APPROVED" : "REVIEW";

                opportunities.push({
                    product,
                    comparison,
                    calculations,
                    aiDecision: finalDecision, // keep original structure for UI
                    status: finalStatus
                });
            }
        }

        return opportunities;
    }
}
