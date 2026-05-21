import { DataSourceAdapter } from "./DataSourceAdapter";
import * as cheerio from "cheerio";

// ── Stealth headers to avoid bot detection ──────────────────────────────
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
];

function getStealthHeaders(): Record<string, string> {
    return {
        "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)] as string,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    };
}

function delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * RealEbayScraperAdapter
 * ─────────────────────────────────────────────────────────────────────
 * This is a RAW DATA TOOL for the agentic AI.
 * It only fetches and parses eBay pages – all analysis, scoring,
 * and decision-making is done by Gemini through DataSourceManager.
 */
export class RealEbayScraperAdapter implements DataSourceAdapter {
    name = "RealEbayScraper";
    mode: "actual" | "fallback" | "placeholder" = "actual";

    private ebayDomain: string;

    constructor() {
        const country = (process.env.EBAY_SCRAPE_COUNTRY || "US").toUpperCase();
        const domainMap: Record<string, string> = {
            US: "www.ebay.com",
            UK: "www.ebay.co.uk",
            DE: "www.ebay.de",
            AU: "www.ebay.com.au",
            CA: "www.ebay.ca",
        };
        this.ebayDomain = domainMap[country] || "www.ebay.com";
    }

    isConfigured(): boolean {
        return true;
    }

    // ── Fetch HTML with stealth headers ──────────────────────────────────
    private async fetchPage(url: string): Promise<string> {
        console.log(`[RealEbayScraper] Fetching: ${url}`);
        const res = await fetch(url, {
            method: "GET",
            headers: getStealthHeaders(),
            redirect: "follow",
        });
        if (!res.ok) {
            throw new Error(`eBay HTTP ${res.status} for ${url}`);
        }
        return res.text();
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchTrends – Returns RAW scraped data for Gemini to analyze
    // ══════════════════════════════════════════════════════════════════════
    async searchTrends(query: string): Promise<any[]> {
        if (!query) return [];

        try {
            const url = `https://${this.ebayDomain}/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=12&_ipg=60`;
            const html = await this.fetchPage(url);
            const $ = cheerio.load(html);

            // Extract result count
            const resultsCountText = $(".srp-controls__count-heading").text().trim();
            const totalResults = parseInt(resultsCountText.replace(/[^0-9]/g, ""), 10) || 0;

            // Extract sample items with prices
            const sampleItems: any[] = [];
            $(".s-item").each((i, el) => {
                if (i >= 15) return false;
                const title = $(el).find(".s-item__title").text().trim();
                if (!title || title.toLowerCase() === "shop on ebay") return;

                const priceText = $(el).find(".s-item__price").first().text().trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
                const shippingText = $(el).find(".s-item__shipping, .s-item__freeXDays").text().trim();

                if (price > 0) {
                    sampleItems.push({ title, price, shipping: shippingText });
                }
            });

            const prices = sampleItems.map(i => i.price);
            const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

            console.log(`[RealEbayScraper] Raw trend data for "${query}": ${totalResults} results, ${sampleItems.length} samples`);

            // Return RAW data – Gemini will analyze this
            return [{
                source: "eBay",
                query,
                totalResults,
                sampleItems,
                priceStats: {
                    min: prices.length > 0 ? Math.min(...prices) : 0,
                    max: prices.length > 0 ? Math.max(...prices) : 0,
                    avg: parseFloat(avgPrice.toFixed(2)),
                    count: prices.length
                },
                scrapedAt: new Date().toISOString()
            }];
        } catch (err: any) {
            console.error(`[RealEbayScraper] searchTrends failed: ${err.message}`);
            return [];
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchProducts – Returns RAW product listings for Gemini to rank
    // ══════════════════════════════════════════════════════════════════════
    async searchProducts(query: string): Promise<any[]> {
        if (!query) return [];

        try {
            const url = `https://${this.ebayDomain}/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=12&LH_BIN=1&_ipg=60`;
            const html = await this.fetchPage(url);
            const $ = cheerio.load(html);

            const products: any[] = [];

            $(".s-item").each((i, el) => {
                if (i >= 20) return false;

                const title = $(el).find(".s-item__title").text().trim();
                if (!title || title.toLowerCase() === "shop on ebay") return;

                const priceText = $(el).find(".s-item__price").first().text().trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
                const link = $(el).find(".s-item__link").attr("href") || "";
                const imageUrl = $(el).find(".s-item__image img").attr("src") || null;

                const shippingText = $(el).find(".s-item__shipping, .s-item__freeXDays").text().trim();
                let shippingCost = 0;
                if (!shippingText.toLowerCase().includes("free")) {
                    const shipNum = parseFloat(shippingText.replace(/[^0-9.]/g, ""));
                    if (!isNaN(shipNum)) shippingCost = shipNum;
                }

                const conditionText = $(el).find(".SECONDARY_INFO").text().trim() || "Not specified";

                if (price > 0) {
                    products.push({
                        id: `ebay-${Date.now()}-${i}`,
                        sourceProductId: `ebay-${Date.now()}-${i}`,
                        title,
                        brand: "",
                        category: query,
                        sourcePlatform: "eBay",
                        sourceUrl: link,
                        imageUrl,
                        sourcePrice: price,
                        shippingCost,
                        condition: conditionText.toUpperCase().includes("NEW") ? "NEW" : conditionText,
                        availability: "IN_STOCK",
                        currency: "USD",
                        fetchedAt: new Date().toISOString(),
                    });
                }
            });

            console.log(`[RealEbayScraper] Raw products for "${query}": ${products.length} items`);
            return products;
        } catch (err: any) {
            console.error(`[RealEbayScraper] searchProducts failed: ${err.message}`);
            return [];
        }
    }

    async getProductDetails(id: string): Promise<any> {
        return null;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchMarketplaceComparisons – RAW sold/active eBay listings
    // ══════════════════════════════════════════════════════════════════════
    async searchMarketplaceComparisons(product: any): Promise<any[]> {
        const searchQuery = product.title || "";
        if (!searchQuery) return [];

        try {
            await delay(500 + Math.random() * 500);

            // Try sold listings first (best for real market price)
            const soldUrl = `https://${this.ebayDomain}/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_Complete=1&LH_Sold=1&_sop=12&_ipg=30`;
            const html = await this.fetchPage(soldUrl);
            const $ = cheerio.load(html);

            const comparisons: any[] = [];

            $(".s-item").each((i, el) => {
                if (i >= 8) return false;
                const title = $(el).find(".s-item__title").text().trim();
                if (!title || title.toLowerCase() === "shop on ebay") return;

                const priceText = $(el).find(".s-item__price").first().text().trim();
                const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
                const link = $(el).find(".s-item__link").attr("href") || "";

                if (price > 0) {
                    comparisons.push({
                        sourceProductId: product.sourceProductId || product.id,
                        marketplace: "eBay",
                        listingTitle: title,
                        listingUrl: link,
                        price,
                        soldStatus: "COMPLETED",
                    });
                }
            });

            // If no sold listings, try active BIN
            if (comparisons.length === 0) {
                console.log(`[RealEbayScraper] No sold listings – trying active for "${searchQuery}"`);
                const activeUrl = `https://${this.ebayDomain}/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&LH_BIN=1&_sop=12&_ipg=20`;
                const activeHtml = await this.fetchPage(activeUrl);
                const $a = cheerio.load(activeHtml);

                $a(".s-item").each((i, el) => {
                    if (i >= 8) return false;
                    const title = $a(el).find(".s-item__title").text().trim();
                    if (!title || title.toLowerCase() === "shop on ebay") return;
                    const priceText = $a(el).find(".s-item__price").first().text().trim();
                    const price = parseFloat(priceText.replace(/[^0-9.]/g, "")) || 0;
                    const link = $a(el).find(".s-item__link").attr("href") || "";

                    if (price > 0) {
                        comparisons.push({
                            sourceProductId: product.sourceProductId || product.id,
                            marketplace: "eBay",
                            listingTitle: title,
                            listingUrl: link,
                            price,
                            soldStatus: "ACTIVE",
                        });
                    }
                });
            }

            console.log(`[RealEbayScraper] Raw comparisons for "${searchQuery}": ${comparisons.length}`);
            return comparisons;
        } catch (err: any) {
            console.error(`[RealEbayScraper] searchMarketplaceComparisons failed: ${err.message}`);
            return [];
        }
    }
}