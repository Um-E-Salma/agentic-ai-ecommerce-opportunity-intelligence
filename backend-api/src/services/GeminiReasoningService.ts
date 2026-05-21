export interface InputUnderstandingOutput {
    summary: string;
    keyFacts: string[];
    trendSignals: Array<{
        category: string;
        keyword: string;
        signal: string;
        confidence: number;
        evidence: string;
    }>;
    risks: string[];
    recommendedResearchQueries: string[];
}

export interface SearchIntentOutput {
    mainIntent: string;
    categorySignals: string[];
    productKeywords: string[];
    synonyms: string[];
    searchQueries: string[];
    confidence: number;
    reason: string;
}

export interface ShopifyProductDecisionOutput {
    selectedProductIds: string[];
    decision: "USE_SHOPIFY_PRODUCT" | "USE_FALLBACK" | "REVIEW" | "SKIP";
    confidence: number;
    reason: string;
    warnings: string[];
    recommendedAction: "NOTIFY" | "REVIEW" | "SKIP";
}

export interface TrendResearchOutput {
    category: string;
    keyword: string;
    trendScore: number;
    demandLevel: "LOW" | "MEDIUM" | "HIGH";
    evidence: string[];
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    reason: string;
}

export interface ProductMatchOutput {
    isComparable: boolean;
    matchScore: number;
    confidence: number;
    bestComparableListingId?: string;
    estimatedSellingPrice: number;
    reason: string;
    warnings: string[];
}

export interface FinalDecisionOutput {
    decision: "STRONG_CANDIDATE" | "REVIEW" | "SKIP";
    confidence: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    profitGate: "PASS" | "REVIEW" | "FAIL";
    reason: string;
    warnings: string[];
    recommendedAction: string;
    simulatedActions: string[];
}

export interface ListingRecommendationOutput {
    recommendedPlatform: "eBay Sandbox" | "Shopify Development Store" | "WooCommerce Test Store";
    title: string;
    description: string;
    tags: string[];
    recommendedPrice: number;
    expectedProfit: number;
    reason: string;
}

export interface CampaignRecommendationOutput {
    campaignName: string;
    targetSegment: string;
    emailSubject: string;
    emailBody: string;
    discountRecommendation: string;
    complianceNote: string;
}

export interface ListingOptimizationOutput {
    optimizedTitle: string;
    optimizedDescription: string;
    optimizedTags: string[];
    improvementSummary: string;
    warnings: string[];
}

export interface CampaignStrategyOutput {
    shouldCreateCampaign: boolean;
    campaignType: "DISCOUNT" | "PROMOTION" | "A_B_TEST" | "BUNDLE" | "PAUSE_PRODUCT" | "COLLECT_MORE_DATA";
    selectedListingId: string | null;
    recommendedChannel: "email" | "whatsapp_mock" | "in_app";
    targetSegment: "demo_or_opted_in_leads";
    discountPercent: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    confidence: number;
    reason: string;
    campaignName: string;
    subject: string;
    messageBody: string;
    expectedImpact: {
        expectedReach: number;
        projectedClicks: number;
        projectedConversions: number;
        projectedRevenue: number;
        projectedProfit: number;
    };
    safetyNotes: string[];
}

// ══════════════════════════════════════════════════════════════════════════
//  NEW: Agentic AI Output Types
// ══════════════════════════════════════════════════════════════════════════

export interface AgentTrendAnalysisOutput {
    trends: Array<{
        keyword: string;
        category: string;
        isTrending: boolean;
        trendScore: number;
        demandLevel: "LOW" | "MEDIUM" | "HIGH";
        confidence: number;
        signal: string;
        evidence: string;
        riskLevel: "LOW" | "MEDIUM" | "HIGH";
        reasoning: string;
    }>;
    overallSummary: string;
}

export interface AgentProductRankingOutput {
    rankedProducts: Array<{
        productIndex: number;
        matchScore: number;
        matchReason: string;
        isRecommended: boolean;
        resalePotential: "LOW" | "MEDIUM" | "HIGH";
    }>;
    overallAnalysis: string;
}

export interface AgentComparisonEvalOutput {
    evaluatedComparisons: Array<{
        comparisonIndex: number;
        isValidMatch: boolean;
        matchScore: number;
        confidence: number;
        reasoning: string;
    }>;
    bestComparisonIndex: number;
    overallAnalysis: string;
}

// ══════════════════════════════════════════════════════════════════════════
//  Interface
// ══════════════════════════════════════════════════════════════════════════

export interface IGeminiReasoningService {
    // ── Existing methods ──────────────────────────────────────────────
    understandInput(content: string): Promise<InputUnderstandingOutput>;
    researchTrend(category: string, keyword: string): Promise<TrendResearchOutput>;
    matchProduct(product: any, marketplaceData: any): Promise<ProductMatchOutput>;
    makeFinalDecision(product: any, calculations: any): Promise<FinalDecisionOutput>;
    recommendListing(product: any): Promise<ListingRecommendationOutput>;
    recommendCampaign(opportunities: any[]): Promise<CampaignRecommendationOutput>;
    optimizeListingData(listing: any): Promise<ListingOptimizationOutput>;
    recommendCampaignStrategy(analyticsContext: any): Promise<CampaignStrategyOutput>;
    extractSearchIntent(input: string): Promise<SearchIntentOutput>;
    evaluateShopifyProduct(intent: SearchIntentOutput, products: any[]): Promise<ShopifyProductDecisionOutput>;

    // ── NEW: Agentic AI methods ───────────────────────────────────────
    analyzeTrendData(query: string, rawScrapedData: any[]): Promise<AgentTrendAnalysisOutput>;
    rankAndSelectProducts(intent: SearchIntentOutput, rawProducts: any[]): Promise<AgentProductRankingOutput>;
    evaluateMarketplaceMatch(sourceProduct: any, rawComparisons: any[]): Promise<AgentComparisonEvalOutput>;
}

// ══════════════════════════════════════════════════════════════════════════
//  Mock Implementation
// ══════════════════════════════════════════════════════════════════════════

export class MockGeminiReasoningService implements IGeminiReasoningService {

    // ── Existing mock methods (unchanged) ────────────────────────────

    async understandInput(content: string): Promise<InputUnderstandingOutput> {
        return {
            summary: "Mock summary of the input text.",
            keyFacts: ["Fact 1", "Fact 2"],
            trendSignals: [
                {
                    category: "Home organization",
                    keyword: "Home organization",
                    signal: "High interest",
                    confidence: 0.9,
                    evidence: "Mock evidence"
                }
            ],
            risks: ["Risk 1"],
            recommendedResearchQueries: ["Query 1"]
        };
    }

    async extractSearchIntent(input: string): Promise<SearchIntentOutput> {
        const words = input.trim().split(/\s+/).filter(Boolean).slice(0, 8);
        return {
            mainIntent: input.trim(),
            categorySignals: words.slice(0, 2),
            productKeywords: words,
            synonyms: [],
            searchQueries: [input.trim()],
            confidence: 0.8,
            reason: "Mock search intent derived from user input."
        };
    }

    async evaluateShopifyProduct(intent: SearchIntentOutput, products: any[]): Promise<ShopifyProductDecisionOutput> {
        return {
            selectedProductIds: products.length > 0 ? [products[0].id || products[0].sourceProductId] : [],
            decision: products.length > 0 ? "USE_SHOPIFY_PRODUCT" : "USE_FALLBACK",
            confidence: 0.85,
            reason: "Mock decision based on Shopify product evaluation.",
            warnings: [],
            recommendedAction: products.length > 0 ? "NOTIFY" : "SKIP"
        };
    }

    async researchTrend(category: string, keyword: string): Promise<TrendResearchOutput> {
        return {
            category,
            keyword,
            trendScore: 0.85,
            demandLevel: "HIGH",
            evidence: ["Mock evidence 1"],
            riskLevel: "LOW",
            reason: "Mock reason for trend."
        };
    }

    async matchProduct(product: any, marketplaceData: any): Promise<ProductMatchOutput> {
        return {
            isComparable: true,
            matchScore: 0.85,
            confidence: 0.9,
            estimatedSellingPrice: product.sourcePrice * 2,
            reason: "Mock reason for match.",
            warnings: []
        };
    }

    async makeFinalDecision(product: any, calculations: any): Promise<FinalDecisionOutput> {
        return {
            decision: calculations.decision,
            confidence: 0.9,
            riskLevel: "LOW",
            profitGate: calculations.profitGate,
            reason: "Mock reason for decision.",
            warnings: [],
            recommendedAction: "Proceed to simulated purchase candidate.",
            simulatedActions: ["CREATE_PURCHASE_CANDIDATE", "GENERATE_NOTIFICATION"]
        };
    }

    async recommendListing(product: any): Promise<ListingRecommendationOutput> {
        return {
            recommendedPlatform: "eBay Sandbox",
            title: `Mock Listing for ${product.title}`,
            description: "Mock description.",
            tags: ["mock", "test"],
            recommendedPrice: product.sourcePrice * 2,
            expectedProfit: product.sourcePrice,
            reason: "Mock reason for listing."
        };
    }

    async recommendCampaign(opportunities: any[]): Promise<CampaignRecommendationOutput> {
        return {
            campaignName: "Mock Campaign",
            targetSegment: "demo or opted-in leads only",
            emailSubject: "Mock Subject",
            emailBody: "Mock Body",
            discountRecommendation: "10% off",
            complianceNote: "Only send to opted-in/test leads."
        };
    }

    async optimizeListingData(listing: any): Promise<ListingOptimizationOutput> {
        return {
            optimizedTitle: `Optimized: ${listing.title}`,
            optimizedDescription: `✨ Enhanced SEO Description ✨\n\n${listing.description}\n\n- Improved visibility\n- Better conversion rate`,
            optimizedTags: (listing.tags ? JSON.parse(listing.tags) : []).concat(["trending", "optimized", "premium"]),
            improvementSummary: "Improved title clarity, added structured bullet points to the description, and included high-converting SEO tags.",
            warnings: []
        };
    }

    async recommendCampaignStrategy(analyticsContext: any): Promise<CampaignStrategyOutput> {
        if (analyticsContext.analysisStatus === "INSUFFICIENT_DATA") {
            return {
                shouldCreateCampaign: false,
                campaignType: "COLLECT_MORE_DATA",
                selectedListingId: null,
                recommendedChannel: "in_app",
                targetSegment: "demo_or_opted_in_leads",
                discountPercent: 0,
                riskLevel: "LOW",
                confidence: 0.1,
                reason: "Insufficient data to recommend a strong campaign strategy.",
                campaignName: "Data Collection Phase",
                subject: "N/A",
                messageBody: "Please wait for more data to be collected.",
                expectedImpact: { expectedReach: 0, projectedClicks: 0, projectedConversions: 0, projectedRevenue: 0, projectedProfit: 0 },
                safetyNotes: ["No action taken due to insufficient data."]
            };
        }
        return {
            shouldCreateCampaign: true,
            campaignType: "DISCOUNT",
            selectedListingId: analyticsContext.bestListingId || "mock-listing-id",
            recommendedChannel: "email",
            targetSegment: "demo_or_opted_in_leads",
            discountPercent: 15,
            riskLevel: "LOW",
            confidence: 0.85,
            reason: "Mock strategy generated for demo purposes based on growing trends.",
            campaignName: "Mock Growth Campaign",
            subject: "Special 15% Off Your Favorite Items!",
            messageBody: "Hi there! We noticed you might like our top products. Use code MOCK15 for 15% off your next purchase.",
            expectedImpact: { expectedReach: 1500, projectedClicks: 300, projectedConversions: 45, projectedRevenue: 2250, projectedProfit: 800 },
            safetyNotes: ["Mock campaign generated safely."]
        };
    }

    // ══════════════════════════════════════════════════════════════════
    //  NEW: Agentic AI mock methods
    // ══════════════════════════════════════════════════════════════════

    async analyzeTrendData(query: string, rawScrapedData: any[]): Promise<AgentTrendAnalysisOutput> {
        return {
            trends: [{
                keyword: query,
                category: query,
                isTrending: true,
                trendScore: 0.80,
                demandLevel: "MEDIUM",
                confidence: 0.75,
                signal: `Mock: ${rawScrapedData.length} data sources analyzed`,
                evidence: `Mock trend analysis for "${query}"`,
                riskLevel: "LOW",
                reasoning: "Mock agentic reasoning – no real Gemini analysis performed."
            }],
            overallSummary: `Mock agentic trend summary for "${query}"`
        };
    }

    async rankAndSelectProducts(intent: SearchIntentOutput, rawProducts: any[]): Promise<AgentProductRankingOutput> {
        return {
            rankedProducts: rawProducts.slice(0, 5).map((_, i) => ({
                productIndex: i,
                matchScore: parseFloat((0.9 - i * 0.1).toFixed(2)),
                matchReason: `Mock rank #${i + 1} for "${intent.mainIntent}"`,
                isRecommended: i < 3,
                resalePotential: i < 2 ? "HIGH" : "MEDIUM"
            })),
            overallAnalysis: `Mock: ranked ${rawProducts.length} products for "${intent.mainIntent}"`
        };
    }

    async evaluateMarketplaceMatch(sourceProduct: any, rawComparisons: any[]): Promise<AgentComparisonEvalOutput> {
        return {
            evaluatedComparisons: rawComparisons.slice(0, 5).map((_, i) => ({
                comparisonIndex: i,
                isValidMatch: i < 3,
                matchScore: parseFloat((0.85 - i * 0.1).toFixed(2)),
                confidence: parseFloat((0.80 - i * 0.05).toFixed(2)),
                reasoning: `Mock: comparison #${i + 1} evaluated`
            })),
            bestComparisonIndex: 0,
            overallAnalysis: `Mock marketplace evaluation for "${sourceProduct.title}"`
        };
    }
}