import { DataSourceAdapter } from "./DataSourceAdapter";
import { MockFallbackAdapter } from "./MockFallbackAdapter";
import { RealEbayScraperAdapter } from "./RealEbayScraperAdapter";
import { RealShopifyScraperAdapter } from "./RealShopifyScraperAdapter";
import { IGeminiReasoningService, SearchIntentOutput } from "../services/GeminiReasoningService";

/**
 * DataSourceManager – Agentic AI Data Pipeline
 * ═══════════════════════════════════════════════════════════════════════
 * Scrapers (eBay, Shopify) are TOOLS that fetch raw data.
 * Gemini is the BRAIN that analyzes, ranks, and decides everything.
 * Mock adapter is the FALLBACK when real sources fail.
 */
export class DataSourceManager implements DataSourceAdapter {
    name = "DataSourceManager";
    mode: "actual" | "fallback" | "placeholder" = "auto" as any;

    private mockAdapter: MockFallbackAdapter;
    private ebayAdapter: RealEbayScraperAdapter;
    private shopifyAdapter: RealShopifyScraperAdapter;
    private reasoningService: IGeminiReasoningService;
    private useRealScraping: boolean;

    constructor(reasoningService: IGeminiReasoningService) {
        this.mockAdapter = new MockFallbackAdapter();
        this.ebayAdapter = new RealEbayScraperAdapter();
        this.shopifyAdapter = new RealShopifyScraperAdapter();
        this.reasoningService = reasoningService;

        // Toggle: set USE_REAL_SCRAPING=false in .env to revert to mock
        this.useRealScraping = process.env.USE_REAL_SCRAPING !== "false";
        console.log(`[DataSourceManager] Mode: ${this.useRealScraping ? "AGENTIC (real scraping + Gemini analysis)" : "MOCK FALLBACK"}`);
    }

    isConfigured(): boolean {
        return true;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchTrends
    //  1. Scrapers fetch raw eBay/Shopify data (TOOLS)
    //  2. Gemini ANALYZES the raw data and decides if trending (BRAIN)
    // ══════════════════════════════════════════════════════════════════════
    async searchTrends(query: string): Promise<any[]> {
        if (!this.useRealScraping) {
            return this.mockAdapter.searchTrends(query);
        }

        console.log(`[DataSourceManager] 🔍 Agent searching trends for "${query}"...`);

        // ── Step 1: Scrapers fetch raw data (tools) ──────────────────────
        const rawScrapedData: any[] = [];

        try {
            const ebayRaw = await this.ebayAdapter.searchTrends(query);
            rawScrapedData.push(...ebayRaw);
            console.log(`[DataSourceManager] eBay tool returned ${ebayRaw.length} raw data points`);
        } catch (err: any) {
            console.error(`[DataSourceManager] eBay tool failed: ${err.message}`);
        }

        try {
            const shopifyRaw = await this.shopifyAdapter.searchTrends(query);
            rawScrapedData.push(...shopifyRaw);
            console.log(`[DataSourceManager] Shopify tool returned ${shopifyRaw.length} raw data points`);
        } catch (err: any) {
            console.error(`[DataSourceManager] Shopify tool failed: ${err.message}`);
        }

        if (rawScrapedData.length === 0) {
            console.log(`[DataSourceManager] No raw data from tools – falling back to mock`);
            return this.mockAdapter.searchTrends(query);
        }

        // ── Step 2: Gemini ANALYZES the raw data (brain) ─────────────────
        console.log(`[DataSourceManager] 🧠 Agent (Gemini) analyzing ${rawScrapedData.length} raw data sources...`);

        try {
            const analysis = await this.reasoningService.analyzeTrendData(query, rawScrapedData);

            // Convert Gemini's analysis into the trend format expected by agents
            const trends = analysis.trends.map((t, i) => ({
                id: `agent-trend-${Date.now()}-${i}`,
                category: t.category,
                keyword: t.keyword,
                signal: t.signal,
                confidence: t.confidence,
                evidence: t.evidence,
                riskLevel: t.riskLevel,
                demandLevel: t.demandLevel,
                trendScore: t.trendScore,
                isTrending: t.isTrending,
                reasoning: t.reasoning,
                source: "Agentic AI (Gemini + Real Data)",
            }));

            console.log(`[DataSourceManager] ✅ Agent trend analysis complete: ${trends.length} trends identified`);
            console.log(`[DataSourceManager] 📊 Summary: ${analysis.overallSummary}`);

            return trends;
        } catch (err: any) {
            console.error(`[DataSourceManager] Gemini analysis failed: ${err.message} – using mock`);
            return this.mockAdapter.searchTrends(query);
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchProducts  (legacy – without intent)
    // ══════════════════════════════════════════════════════════════════════
    async searchProducts(query: string): Promise<any[]> {
        if (!this.useRealScraping) {
            return this.mockAdapter.searchProducts(query);
        }

        // Collect raw products from real sources
        const shopifyProducts = await this.shopifyAdapter.searchProducts(query);
        const ebayProducts = await this.ebayAdapter.searchProducts(query);
        const combined = [...shopifyProducts, ...ebayProducts];

        if (combined.length > 0) return combined;
        return this.mockAdapter.searchProducts(query);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchProductsWithIntent  –  FULLY AGENTIC product discovery
    //  1. Scrapers fetch raw products from real eBay + Shopify (TOOLS)
    //  2. Gemini RANKS & SELECTS the best products (BRAIN)
    // ══════════════════════════════════════════════════════════════════════
    async searchProductsWithIntent(intent: SearchIntentOutput): Promise<any[]> {
        console.log(`[DataSourceManager] 🔍 Agent product search for: "${intent.mainIntent}"`);

        if (!this.useRealScraping) {
            console.log("[DataSourceManager] Mock mode – using demo fallback.");
            const fallbackQuery = (intent.productKeywords?.length > 0)
                ? intent.productKeywords[0]
                : intent.mainIntent;
            const mockProducts = await this.mockAdapter.searchProducts(fallbackQuery || "");
            return mockProducts.map(p => ({
                ...p,
                matchScore: 0.5,
                matchReason: "Fallback Demo Data",
                usedSearchTerms: [fallbackQuery],
                sourceMode: "fallback_demo"
            }));
        }

        // ── Step 1: Build search queries from AI intent ──────────────────
        const queries: string[] = [];
        if (intent.searchQueries?.length > 0) queries.push(...intent.searchQueries.slice(0, 3));
        if (intent.productKeywords?.length > 0) queries.push(intent.productKeywords.join(" "));
        if (queries.length === 0) queries.push(intent.mainIntent);
        const uniqueQueries = [...new Set(queries)];

        // ── Step 2: Scrapers fetch raw products (tools) ──────────────────
        const allRawProducts: any[] = [];

        console.log("[DataSourceManager] 🛒 Shopify tool searching...");
        for (const q of uniqueQueries.slice(0, 2)) {
            try {
                const products = await this.shopifyAdapter.searchProducts(q);
                allRawProducts.push(...products.map(p => ({ ...p, sourceMode: "real_shopify" })));
            } catch (err: any) {
                console.error(`[DataSourceManager] Shopify tool error: ${err.message}`);
            }
        }

        console.log("[DataSourceManager] 🛒 eBay tool searching...");
        for (const q of uniqueQueries.slice(0, 2)) {
            try {
                const products = await this.ebayAdapter.searchProducts(q);
                allRawProducts.push(...products.map(p => ({ ...p, sourceMode: "real_ebay" })));
            } catch (err: any) {
                console.error(`[DataSourceManager] eBay tool error: ${err.message}`);
            }
        }

        console.log(`[DataSourceManager] Tools returned ${allRawProducts.length} raw products total`);

        if (allRawProducts.length === 0) {
            console.log("[DataSourceManager] No real products – falling back to mock.");
            const fallbackQuery = (intent.productKeywords?.length > 0) ? intent.productKeywords[0] : intent.mainIntent;
            const mockProducts = await this.mockAdapter.searchProducts(fallbackQuery || "");
            return mockProducts.map(p => ({
                ...p,
                matchScore: 0.5,
                matchReason: "Fallback Demo Data",
                usedSearchTerms: [fallbackQuery],
                sourceMode: "fallback_demo"
            }));
        }

        // ── Step 3: Gemini RANKS & SELECTS products (brain) ──────────────
        console.log(`[DataSourceManager] 🧠 Agent (Gemini) ranking ${allRawProducts.length} products...`);

        try {
            const ranking = await this.reasoningService.rankAndSelectProducts(intent, allRawProducts);

            // Map Gemini's ranking back to full product objects
            const rankedProducts = ranking.rankedProducts
                .filter(r => r.isRecommended && r.productIndex < allRawProducts.length)
                .map(r => {
                    const product = allRawProducts[r.productIndex];
                    return {
                        ...product,
                        matchScore: r.matchScore,
                        matchReason: r.matchReason,
                        resalePotential: r.resalePotential,
                        usedSearchTerms: uniqueQueries,
                        // sourceMode already set above
                    };
                });

            // If Gemini recommended nothing, take top 3 raw products
            if (rankedProducts.length === 0) {
                console.log("[DataSourceManager] Gemini recommended 0 products – using top 3 raw");
                return allRawProducts.slice(0, 3).map(p => ({
                    ...p,
                    matchScore: 0.5,
                    matchReason: "Agent selected (no strong match found)",
                    usedSearchTerms: uniqueQueries,
                }));
            }

            console.log(`[DataSourceManager] ✅ Agent selected ${rankedProducts.length} products`);
            console.log(`[DataSourceManager] 📊 ${ranking.overallAnalysis}`);

            return rankedProducts.slice(0, 10);
        } catch (err: any) {
            console.error(`[DataSourceManager] Gemini ranking failed: ${err.message} – using raw products`);
            return allRawProducts.slice(0, 5).map(p => ({
                ...p,
                matchScore: 0.5,
                matchReason: "Fallback: Gemini unavailable",
                usedSearchTerms: uniqueQueries,
            }));
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  getProductDetails
    // ══════════════════════════════════════════════════════════════════════
    async getProductDetails(id: string): Promise<any> {
        if (id.startsWith("shopify-")) {
            const p = await this.shopifyAdapter.getProductDetails(id);
            if (p) return p;
        }
        return this.mockAdapter.getProductDetails(id);
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchMarketplaceComparisons  –  FULLY AGENTIC comparison
    //  1. Scraper fetches raw eBay listings (TOOL)
    //  2. Gemini EVALUATES which comparisons are valid (BRAIN)
    // ══════════════════════════════════════════════════════════════════════
    async searchMarketplaceComparisons(product: any): Promise<any[]> {
        if (!this.useRealScraping) {
            // Legacy mock path
            if (product.sourceMode === 'shopify_dev' || product.sourcePlatform?.includes('Shopify')) {
                const sourcePrice = product.sourcePrice || product.price || 0;
                const markup = 1.6 + Math.random() * 0.4;
                const estimatedEbayPrice = parseFloat((sourcePrice * markup).toFixed(2));
                return [{
                    sourceProductId: product.sourceProductId || product.id,
                    marketplace: "eBay",
                    listingTitle: `${product.title} (eBay Estimate)`,
                    listingUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.title)}`,
                    price: estimatedEbayPrice,
                    matchScore: 0.75,
                    confidence: 0.70
                }];
            }
            return this.mockAdapter.searchMarketplaceComparisons(product);
        }

        console.log(`[DataSourceManager] 🔍 Agent comparing marketplace for "${product.title}"`);

        // ── Step 1: Scraper fetches raw eBay comparisons (tool) ──────────
        let rawComparisons: any[] = [];
        try {
            rawComparisons = await this.ebayAdapter.searchMarketplaceComparisons(product);
            console.log(`[DataSourceManager] eBay tool returned ${rawComparisons.length} raw comparisons`);
        } catch (err: any) {
            console.error(`[DataSourceManager] eBay comparison tool failed: ${err.message}`);
        }

        if (rawComparisons.length === 0) {
            console.log(`[DataSourceManager] No real comparisons – synthesizing estimate`);
            const sourcePrice = product.sourcePrice || product.price || 0;
            const markup = 1.5 + Math.random() * 0.5;
            return [{
                sourceProductId: product.sourceProductId || product.id,
                marketplace: "eBay",
                listingTitle: `${product.title} (Estimated)`,
                listingUrl: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.title)}`,
                price: parseFloat((sourcePrice * markup).toFixed(2)),
                matchScore: 0.55,
                confidence: 0.50
            }];
        }

        // ── Step 2: Gemini EVALUATES comparisons (brain) ─────────────────
        console.log(`[DataSourceManager] 🧠 Agent (Gemini) evaluating ${rawComparisons.length} comparisons...`);

        try {
            const evaluation = await this.reasoningService.evaluateMarketplaceMatch(product, rawComparisons);

            // Map Gemini's evaluation back to comparison objects
            const evaluatedComparisons = evaluation.evaluatedComparisons
                .filter(e => e.isValidMatch && e.comparisonIndex < rawComparisons.length)
                .map(e => {
                    const raw = rawComparisons[e.comparisonIndex];
                    return {
                        ...raw,
                        matchScore: e.matchScore,
                        confidence: e.confidence,
                        aiReasoning: e.reasoning,
                        estimatedDemand: "MEDIUM",
                        sellerRating: "N/A",
                    };
                });

            // If Gemini found no valid matches, use best raw comparison
            if (evaluatedComparisons.length === 0 && rawComparisons.length > 0) {
                console.log("[DataSourceManager] Gemini found no valid match – using best raw comparison");
                return [{
                    ...rawComparisons[0],
                    matchScore: 0.50,
                    confidence: 0.45,
                    estimatedDemand: "MEDIUM",
                    sellerRating: "N/A",
                }];
            }

            // Sort by match score and return
            evaluatedComparisons.sort((a, b) => b.matchScore - a.matchScore);

            console.log(`[DataSourceManager] ✅ Agent validated ${evaluatedComparisons.length} comparisons`);
            console.log(`[DataSourceManager] 📊 ${evaluation.overallAnalysis}`);

            return evaluatedComparisons;
        } catch (err: any) {
            console.error(`[DataSourceManager] Gemini evaluation failed: ${err.message} – using raw comparisons`);
            return rawComparisons.slice(0, 3).map(c => ({
                ...c,
                matchScore: 0.60,
                confidence: 0.55,
                estimatedDemand: "MEDIUM",
                sellerRating: "N/A",
            }));
        }
    }
}