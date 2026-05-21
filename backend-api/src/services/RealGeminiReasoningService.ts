import {
  IGeminiReasoningService,
  InputUnderstandingOutput,
  TrendResearchOutput,
  ProductMatchOutput,
  FinalDecisionOutput,
  ListingRecommendationOutput,
  CampaignRecommendationOutput,
  ListingOptimizationOutput,
  CampaignStrategyOutput,
  SearchIntentOutput,
  ShopifyProductDecisionOutput,
  AgentTrendAnalysisOutput,
  AgentProductRankingOutput,
  AgentComparisonEvalOutput
} from "./GeminiReasoningService";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class RealGeminiReasoningService implements IGeminiReasoningService {
  private ai: GoogleGenerativeAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for RealGeminiReasoningService");
    }
    this.ai = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }

  private async callGemini(prompt: string, schema: any, retries = 2): Promise<any> {
    const modelInst = this.ai.getGenerativeModel({ model: this.model });

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await modelInst.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
          }
        });
        const text = result.response.text();
        return JSON.parse(text);
      } catch (err: any) {
        const isTransient = err.message?.includes('503') ||
          err.message?.includes('overloaded') ||
          err.message?.includes('UNAVAILABLE');
        if (isTransient && attempt < retries) {
          const delay = 1500 * (attempt + 1);
          console.warn(`[Gemini] Transient error (attempt ${attempt + 1}). Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
  }

  private async callGeminiSafe(prompt: string, schema: any, fallback: any): Promise<any> {
    try {
      return await this.callGemini(prompt, schema);
    } catch (err: any) {
      console.error(`[Gemini] All retries failed: ${err.message}. Using fallback.`);
      return fallback;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  EXISTING METHODS (unchanged)
  // ══════════════════════════════════════════════════════════════════════

  async extractSearchIntent(input: string): Promise<SearchIntentOutput> {
    const prompt = `Analyze this unstructured user input and extract search intent for finding matching products. Return JSON.
        Input: "${input}"
        
        Desired Schema:
        {
          "mainIntent": "string",
          "categorySignals": ["string"],
          "productKeywords": ["string"],
          "synonyms": ["string"],
          "searchQueries": ["string"],
          "confidence": 0.0,
          "reason": "string"
        }`;
    const fallback: SearchIntentOutput = {
      mainIntent: input.trim(),
      categorySignals: [input.trim()],
      productKeywords: input.trim().split(/\s+/).slice(0, 5),
      synonyms: [],
      searchQueries: [input.trim()],
      confidence: 0.5,
      reason: "Gemini unavailable – fallback intent from raw input."
    };
    return this.callGeminiSafe(prompt, null, fallback);
  }

  async evaluateShopifyProduct(intent: SearchIntentOutput, products: any[]): Promise<ShopifyProductDecisionOutput> {
    const prompt = `You are an expert e-commerce AI agent. Evaluate the following products against the user's search intent.
        Determine which products best match the intent and decide whether to use them.
        
        Search Intent:
        ${JSON.stringify(intent, null, 2)}
        
        Product Candidates:
        ${JSON.stringify(products.slice(0, 10), null, 2)}
        
        Desired Schema:
        {
          "selectedProductIds": ["string"],
          "decision": "USE_SHOPIFY_PRODUCT" | "USE_FALLBACK" | "REVIEW" | "SKIP",
          "confidence": 0.0,
          "reason": "string",
          "warnings": ["string"],
          "recommendedAction": "NOTIFY" | "REVIEW" | "SKIP"
        }`;
    return this.callGemini(prompt, null);
  }

  async understandInput(content: string): Promise<InputUnderstandingOutput> {
    const prompt = `Analyze this unstructured market input and extract trend signals, categories, and risks. Return JSON matching the schema.
        Input: "${content}"
        
        Desired Schema:
        {
          "summary": "string",
          "keyFacts": ["string"],
          "trendSignals": [
            {
              "category": "string",
              "keyword": "string",
              "signal": "string",
              "confidence": 0.0,
              "evidence": "string"
            }
          ],
          "risks": ["string"],
          "recommendedResearchQueries": ["string"]
        }`;

    return this.callGemini(prompt, null);
  }

  async researchTrend(category: string, keyword: string): Promise<TrendResearchOutput> {
    const prompt = `Research the trend for category "${category}" and keyword "${keyword}". Return JSON matching the schema.
        
        Desired Schema:
        {
          "category": "string",
          "keyword": "string",
          "trendScore": 0.0,
          "demandLevel": "LOW" | "MEDIUM" | "HIGH",
          "evidence": ["string"],
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "reason": "string"
        }`;

    return this.callGemini(prompt, null);
  }

  async matchProduct(product: any, marketplaceData: any): Promise<ProductMatchOutput> {
    const prompt = `Analyze the match between this source product and marketplace data. Return JSON matching the schema.
        Product: ${JSON.stringify(product)}
        Marketplace Data: ${JSON.stringify(marketplaceData)}
        
        Desired Schema:
        {
          "isComparable": true,
          "matchScore": 0.0,
          "confidence": 0.0,
          "bestComparableListingId": "string",
          "estimatedSellingPrice": 0.0,
          "reason": "string",
          "warnings": ["string"]
        }`;

    return this.callGemini(prompt, null);
  }

  async makeFinalDecision(product: any, calculations: any): Promise<FinalDecisionOutput> {
    const prompt = `Make a final decision on this product based on calculations. Return JSON matching the schema.
        Product: ${JSON.stringify(product)}
        Calculations: ${JSON.stringify(calculations)}
        
        Desired Schema:
        {
          "decision": "STRONG_CANDIDATE" | "REVIEW" | "SKIP",
          "confidence": 0.0,
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "profitGate": "PASS" | "REVIEW" | "FAIL",
          "reason": "string",
          "warnings": ["string"],
          "recommendedAction": "string",
          "simulatedActions": ["string"]
        }`;

    return this.callGemini(prompt, null);
  }

  async recommendListing(product: any): Promise<ListingRecommendationOutput> {
    const prompt = `Recommend a listing for this product. Return JSON matching the schema.
        Product: ${JSON.stringify(product)}
        
        Desired Schema:
        {
          "recommendedPlatform": "eBay Sandbox" | "Shopify Development Store" | "WooCommerce Test Store",
          "title": "string",
          "description": "string",
          "tags": ["string"],
          "recommendedPrice": 0.0,
          "expectedProfit": 0.0,
          "reason": "string"
        }`;

    return this.callGemini(prompt, null);
  }

  async recommendCampaign(opportunities: any[]): Promise<CampaignRecommendationOutput> {
    const prompt = `Recommend a campaign for these opportunities. Return JSON matching the schema.
        Opportunities: ${JSON.stringify(opportunities)}
        
        Desired Schema:
        {
          "campaignName": "string",
          "targetSegment": "demo or opted-in leads only",
          "emailSubject": "string",
          "emailBody": "string",
          "discountRecommendation": "string",
          "complianceNote": "Only send to opted-in/test leads."
        }`;

    return this.callGemini(prompt, null);
  }

  async optimizeListingData(listing: any): Promise<ListingOptimizationOutput> {
    const prompt = `
        You are an expert e-commerce SEO listing optimizer.
        Analyze this listing and rewrite the title and description to maximize conversion rate and search visibility.
        Also suggest exactly 5 high-traffic tags.

        Listing Title: ${listing.title}
        Listing Description: ${listing.description}
        Category: ${listing.category}
        Price: ${listing.price}

        Return ONLY a JSON object with this EXACT schema:
        {
          "optimizedTitle": "string",
          "optimizedDescription": "string (use markdown bullets for features)",
          "optimizedTags": ["string"],
          "improvementSummary": "string (briefly explain what you changed)",
          "warnings": ["string (e.g., if brand name is missing)"]
        }
        `;
    const result = await this.callGemini(prompt, null);
    return result as ListingOptimizationOutput;
  }

  async recommendCampaignStrategy(analyticsContext: any): Promise<CampaignStrategyOutput> {
    const prompt = `
        You are an expert E-Commerce Campaign Strategy AI.
        Your job is to analyze the following business metrics and recommend a safe, effective campaign strategy.

        BUSINESS METRICS CONTEXT:
        ${JSON.stringify(analyticsContext, null, 2)}

        SAFETY RULES (NON-NEGOTIABLE):
        1. Target segment must ALWAYS be "demo_or_opted_in_leads".
        2. Channel must be "email", "whatsapp_mock", or "in_app".
        3. Discount percent must be a realistic number (0 to 50). Do not use aggressive discounts if data is insufficient.
        4. If analysisStatus is INSUFFICIENT_DATA, you MUST recommend campaignType="COLLECT_MORE_DATA" and shouldCreateCampaign=false.
        5. You are operating in a sandbox environment; no real money will be spent.

        Return ONLY a JSON object matching this EXACT schema:
        {
          "shouldCreateCampaign": boolean,
          "campaignType": "DISCOUNT" | "PROMOTION" | "A_B_TEST" | "BUNDLE" | "PAUSE_PRODUCT" | "COLLECT_MORE_DATA",
          "selectedListingId": "string or null",
          "recommendedChannel": "email" | "whatsapp_mock" | "in_app",
          "targetSegment": "demo_or_opted_in_leads",
          "discountPercent": number,
          "riskLevel": "LOW" | "MEDIUM" | "HIGH",
          "confidence": number (0.0 to 1.0),
          "reason": "string (explain your reasoning based on the metrics)",
          "campaignName": "string",
          "subject": "string",
          "messageBody": "string",
          "expectedImpact": {
            "expectedReach": number,
            "projectedClicks": number,
            "projectedConversions": number,
            "projectedRevenue": number,
            "projectedProfit": number
          },
          "safetyNotes": ["string"]
        }
        `;
    const result = await this.callGemini(prompt, null);
    return result as CampaignStrategyOutput;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  NEW: Agentic AI Methods — Gemini as the decision-making brain
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Agent analyzes raw scraped trend data from eBay/Shopify and decides
   * if a keyword/category is truly trending, demand level, risk, etc.
   */
  async analyzeTrendData(query: string, rawScrapedData: any[]): Promise<AgentTrendAnalysisOutput> {
    const prompt = `
You are an expert e-commerce market research AI agent. You have been given REAL scraped data from eBay and Shopify stores about the keyword/category "${query}".

Your job is to ANALYZE this raw data and determine:
1. Is this keyword/category actually trending right now?
2. What is the real demand level (LOW / MEDIUM / HIGH)?
3. What is the risk level for reselling products in this category?
4. What is your confidence in this assessment?
5. What evidence supports your conclusion?

RAW SCRAPED DATA FROM LIVE MARKETPLACES:
${JSON.stringify(rawScrapedData, null, 2)}

ANALYSIS GUIDELINES:
- eBay data with totalResults > 5000 suggests HIGH demand
- eBay data with totalResults 1000-5000 suggests MEDIUM demand
- eBay data with totalResults < 1000 suggests LOW demand
- Multiple Shopify stores carrying similar products = validated market
- Wide price ranges may indicate fragmented market (higher risk)
- If data from both eBay AND Shopify confirms demand, confidence should be HIGH
- Consider price points: very cheap items (<$5) have thin margins
- Consider competition: too many listings may mean oversaturation

Return ONLY a JSON object with this schema:
{
  "trends": [
    {
      "keyword": "string",
      "category": "string", 
      "isTrending": boolean,
      "trendScore": number (0.0 to 1.0),
      "demandLevel": "LOW" | "MEDIUM" | "HIGH",
      "confidence": number (0.0 to 1.0),
      "signal": "string (one-line summary)",
      "evidence": "string (detailed evidence from the data)",
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "reasoning": "string (your full analytical reasoning)"
    }
  ],
  "overallSummary": "string (executive summary of your trend analysis)"
}`;

    const fallback: AgentTrendAnalysisOutput = {
      trends: [{
        keyword: query,
        category: query,
        isTrending: rawScrapedData.length > 0,
        trendScore: 0.5,
        demandLevel: "MEDIUM",
        confidence: 0.4,
        signal: `Fallback: ${rawScrapedData.length} data sources found`,
        evidence: "Gemini unavailable – basic fallback analysis",
        riskLevel: "MEDIUM",
        reasoning: "Could not perform deep analysis – Gemini API unavailable."
      }],
      overallSummary: "Fallback trend analysis due to Gemini unavailability."
    };

    return this.callGeminiSafe(prompt, null, fallback);
  }

  /**
   * Agent evaluates and ranks raw scraped products against the user's 
   * search intent. Decides which products have the best resale potential.
   */
  async rankAndSelectProducts(intent: SearchIntentOutput, rawProducts: any[]): Promise<AgentProductRankingOutput> {
    // Limit products sent to Gemini to avoid token overflow
    const productsForAnalysis = rawProducts.slice(0, 15).map((p, i) => ({
      index: i,
      title: p.title,
      price: p.sourcePrice || p.price,
      brand: p.brand || p.vendor || "",
      category: p.category || p.productType || "",
      sourcePlatform: p.sourcePlatform || "",
      condition: p.condition || "",
      shippingCost: p.shippingCost || 0,
    }));

    const prompt = `
You are an expert e-commerce resale AI agent. You have scraped REAL products from eBay and Shopify stores.

Your job is to RANK these products by how well they match the user's search intent AND their resale potential.

USER'S SEARCH INTENT:
${JSON.stringify(intent, null, 2)}

REAL SCRAPED PRODUCTS (use "index" to reference each):
${JSON.stringify(productsForAnalysis, null, 2)}

RANKING CRITERIA (in order of importance):
1. Relevance to user's intent (title, category, keywords match)
2. Resale potential (is there a margin opportunity?)
3. Price point attractiveness (not too cheap, not too expensive)
4. Brand recognition (branded items often resell better)
5. Condition (NEW items preferred)
6. Source reliability (consider the platform)

Return ONLY a JSON object with this schema:
{
  "rankedProducts": [
    {
      "productIndex": number (index from the products list above),
      "matchScore": number (0.0 to 1.0),
      "matchReason": "string (why this product ranks here)",
      "isRecommended": boolean (true if you recommend pursuing this),
      "resalePotential": "LOW" | "MEDIUM" | "HIGH"
    }
  ],
  "overallAnalysis": "string (summary of your product selection reasoning)"
}

IMPORTANT: Only include products that are at least somewhat relevant. Sort by matchScore descending.`;

    const fallback: AgentProductRankingOutput = {
      rankedProducts: rawProducts.slice(0, 5).map((_, i) => ({
        productIndex: i,
        matchScore: parseFloat((0.7 - i * 0.1).toFixed(2)),
        matchReason: "Fallback ranking",
        isRecommended: i < 3,
        resalePotential: "MEDIUM" as const
      })),
      overallAnalysis: "Fallback ranking – Gemini unavailable."
    };

    return this.callGeminiSafe(prompt, null, fallback);
  }

  /**
   * Agent evaluates raw eBay comparison listings against a source product.
   * Decides which comparison is the best match and if the prices are realistic.
   */
  async evaluateMarketplaceMatch(sourceProduct: any, rawComparisons: any[]): Promise<AgentComparisonEvalOutput> {
    const sourceInfo = {
      title: sourceProduct.title,
      price: sourceProduct.sourcePrice || sourceProduct.price,
      brand: sourceProduct.brand || "",
      category: sourceProduct.category || "",
      condition: sourceProduct.condition || "",
    };

    const comparisonsForAnalysis = rawComparisons.slice(0, 8).map((c, i) => ({
      index: i,
      listingTitle: c.listingTitle,
      price: c.price,
      soldStatus: c.soldStatus || "UNKNOWN",
    }));

    const prompt = `
You are an expert e-commerce pricing AI agent. You need to evaluate if these eBay marketplace listings are valid price comparisons for a source product.

SOURCE PRODUCT (what we want to resell):
${JSON.stringify(sourceInfo, null, 2)}

REAL EBAY LISTINGS FOUND (potential comparisons):
${JSON.stringify(comparisonsForAnalysis, null, 2)}

EVALUATION CRITERIA:
1. Title similarity – does the eBay listing match the source product?
2. Price realism – is the eBay price reasonable for this type of product?
3. Sold vs Active – sold listings are more reliable price indicators
4. Condition match – similar condition items are better comparisons
5. Watch for misleading matches (e.g., accessories vs main product, different sizes)

Return ONLY a JSON object with this schema:
{
  "evaluatedComparisons": [
    {
      "comparisonIndex": number (index from comparisons list),
      "isValidMatch": boolean (true if this is a legitimate comparison),
      "matchScore": number (0.0 to 1.0, how well it matches the source),
      "confidence": number (0.0 to 1.0, how confident you are),
      "reasoning": "string (why this is/isn't a good comparison)"
    }
  ],
  "bestComparisonIndex": number (index of the single best comparison, -1 if none valid),
  "overallAnalysis": "string (summary: are these good comparisons? is the pricing realistic?)"
}`;

    const fallback: AgentComparisonEvalOutput = {
      evaluatedComparisons: rawComparisons.slice(0, 5).map((_, i) => ({
        comparisonIndex: i,
        isValidMatch: i < 2,
        matchScore: parseFloat((0.7 - i * 0.1).toFixed(2)),
        confidence: 0.5,
        reasoning: "Fallback evaluation"
      })),
      bestComparisonIndex: rawComparisons.length > 0 ? 0 : -1,
      overallAnalysis: "Fallback comparison – Gemini unavailable."
    };

    return this.callGeminiSafe(prompt, null, fallback);
  }
}