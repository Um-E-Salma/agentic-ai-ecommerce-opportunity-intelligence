import { SearchIntentOutput } from "./GeminiReasoningService";

export class ShopifyProductMatchingService {
    static matchProducts(intent: SearchIntentOutput, shopifyProducts: any[]) {
        const results = shopifyProducts.map(product => {
            let score = 0;
            const reasons: string[] = [];

            const title = (product.title || "").toLowerCase();
            const desc = (product.description || "").toLowerCase();
            const type = (product.category || "").toLowerCase();
            const vendor = (product.brand || "").toLowerCase();
            const tags = product.tags ? product.tags.map((t: string) => t.toLowerCase()) : [];
            const handle = (product.handle || "").toLowerCase();

            const combinedKeywords = [...(intent.productKeywords || []), ...(intent.synonyms || [])];
            const lowerKeywords = combinedKeywords.map(k => k.toLowerCase());

            // 1. Keyword match in title (Highest weight)
            let titleMatches = 0;
            for (const kw of lowerKeywords) {
                if (title.includes(kw)) titleMatches++;
            }
            if (titleMatches > 0) {
                const titleScore = Math.min((titleMatches / lowerKeywords.length) * 0.4, 0.4);
                score += titleScore;
                reasons.push(`Title matches ${titleMatches} keywords`);
            }

            // 2. Keyword match in tags or type (Medium weight)
            let tagMatches = 0;
            for (const kw of lowerKeywords) {
                if (tags.includes(kw) || type.includes(kw) || handle.includes(kw.replace(/\s+/g, '-'))) {
                    tagMatches++;
                }
            }
            if (tagMatches > 0) {
                score += 0.2;
                reasons.push(`Matched in tags/type/handle`);
            }

            // 3. Keyword match in description (Low weight)
            let descMatches = 0;
            for (const kw of lowerKeywords) {
                if (desc.includes(kw)) descMatches++;
            }
            if (descMatches > 0) {
                score += 0.15;
                reasons.push(`Description matches keywords`);
            }

            // 4. Category signal match
            if (intent.categorySignals && intent.categorySignals.length > 0) {
                const lowerCatSignals = intent.categorySignals.map(c => c.toLowerCase());
                if (lowerCatSignals.some(c => type.includes(c) || title.includes(c))) {
                    score += 0.15;
                    reasons.push(`Category signal matches`);
                }
            }

            // 5. Inventory check (Must have some stock)
            if (product.inventoryQuantity && product.inventoryQuantity > 0) {
                score += 0.1; // Bonus for being in stock
                reasons.push(`In stock`);
            }

            // Normalize score
            score = Math.min(score, 1.0);

            return {
                product,
                matchScore: score,
                matchReason: reasons.join(", ") || "No specific match reasons",
                usedSearchTerms: combinedKeywords
            };
        });

        // Sort by score descending
        return results.sort((a, b) => b.matchScore - a.matchScore);
    }
}
