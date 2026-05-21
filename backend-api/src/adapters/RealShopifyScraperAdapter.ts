import { DataSourceAdapter } from "./DataSourceAdapter";

// ── Default real Shopify stores to search ────────────────────────────────
const DEFAULT_SHOPIFY_STORES = [
    "allbirds.com",
    "gymshark.com",
    "fashionnova.com",
    "colourpop.com",
    "bombas.com",
    "ruggable.com",
    "puravidabracelets.com",
    "chubbiesshorts.com",
    "skinnymixes.com",
    "brooklinen.com",
];

const STEALTH_HEADERS: Record<string, string> = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    Accept: "application/json, text/html, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
};

function delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * RealShopifyScraperAdapter
 * ─────────────────────────────────────────────────────────────────────
 * RAW DATA TOOL for the agentic AI.
 * Fetches products from real public Shopify stores using their
 * public JSON endpoints. All analysis is done by Gemini.
 */
export class RealShopifyScraperAdapter implements DataSourceAdapter {
    name = "RealShopifyScraper";
    mode: "actual" | "fallback" | "placeholder" = "actual";

    private stores: string[];

    constructor() {
        const envStores = process.env.SHOPIFY_PUBLIC_STORES;
        if (envStores) {
            this.stores = envStores.split(",").map((s) => s.trim()).filter(Boolean);
        } else {
            this.stores = DEFAULT_SHOPIFY_STORES;
        }
    }

    isConfigured(): boolean {
        return this.stores.length > 0;
    }

    // ── Fetch JSON from a public Shopify endpoint ────────────────────────
    private async fetchStoreJson(storeHost: string, path: string): Promise<any | null> {
        let host = storeHost.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const url = `https://${host}${path}`;

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: STEALTH_HEADERS,
                redirect: "follow",
                signal: AbortSignal.timeout(10000),
            });

            if (!res.ok) {
                console.warn(`[RealShopifyScraper] ${host} HTTP ${res.status} for ${path}`);
                return null;
            }

            return res.json();
        } catch (err: any) {
            console.warn(`[RealShopifyScraper] Failed ${url}: ${err.message}`);
            return null;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchTrends – RAW product availability data from Shopify stores
    // ══════════════════════════════════════════════════════════════════════
    async searchTrends(query: string): Promise<any[]> {
        if (!query) return [];

        const rawResults: any[] = [];
        const storesToCheck = this.stores.slice(0, 5);

        for (const store of storesToCheck) {
            try {
                await delay(300 + Math.random() * 300);
                const data = await this.fetchStoreJson(
                    store,
                    `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`
                );

                if (!data) continue;

                const products = data?.resources?.results?.products || [];
                if (products.length > 0) {
                    // Return RAW data – Gemini will analyze
                    rawResults.push({
                        source: `Shopify (${store})`,
                        store,
                        query,
                        productsFound: products.length,
                        sampleProducts: products.slice(0, 5).map((p: any) => ({
                            title: p.title,
                            price: p.price ? (parseFloat(String(p.price)) / 100) : 0,
                            vendor: p.vendor || "",
                            type: p.product_type || p.type || "",
                        })),
                        scrapedAt: new Date().toISOString()
                    });
                }
            } catch (err: any) {
                console.warn(`[RealShopifyScraper] Trend check failed for ${store}: ${err.message}`);
            }
        }

        console.log(`[RealShopifyScraper] Raw trend data for "${query}": ${rawResults.length} stores responded`);
        return rawResults;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  searchProducts – RAW products from multiple real Shopify stores
    // ══════════════════════════════════════════════════════════════════════
    async searchProducts(query: string): Promise<any[]> {
        if (!query) return [];

        const allProducts: any[] = [];
        const storesToSearch = this.stores.slice(0, 6);

        for (const store of storesToSearch) {
            try {
                await delay(300 + Math.random() * 400);

                let products: any[] = [];

                // Try suggest endpoint first
                const suggestData = await this.fetchStoreJson(
                    store,
                    `/search/suggest.json?q=${encodeURIComponent(query)}&resources[type]=product&resources[limit]=10`
                );

                if (suggestData?.resources?.results?.products?.length > 0) {
                    products = suggestData.resources.results.products;
                } else {
                    // Fallback: products.json with local filtering
                    const productsData = await this.fetchStoreJson(store, `/products.json?limit=30`);
                    if (productsData?.products) {
                        const q = query.toLowerCase();
                        products = productsData.products.filter((p: any) => {
                            const haystack = `${p.title} ${p.product_type} ${p.vendor} ${p.tags || ""}`.toLowerCase();
                            return q.split(/\s+/).some((kw: string) => haystack.includes(kw));
                        });
                    }
                }

                for (const p of products.slice(0, 5)) {
                    allProducts.push(this.mapShopifyProduct(p, store));
                }
            } catch (err: any) {
                console.warn(`[RealShopifyScraper] searchProducts failed for ${store}: ${err.message}`);
            }
        }

        console.log(`[RealShopifyScraper] Raw products for "${query}": ${allProducts.length} total`);
        return allProducts;
    }

    async getProductDetails(id: string): Promise<any> {
        const parts = id.includes("::") ? id.split("::") : [this.stores[0], id];
        const store = (parts[0] || this.stores[0]) as string;
        const handle = (parts[1] || id) as string;
        const data = await this.fetchStoreJson(store, `/products/${handle}.json`);
        if (data?.product) return this.mapShopifyProduct(data.product, store);
        return null;
    }

    async searchMarketplaceComparisons(_product: any): Promise<any[]> {
        return []; // Shopify is not a comparison marketplace
    }

    // ── Map Shopify JSON → normalised product ────────────────────────────
    private mapShopifyProduct(p: any, storeHost: string): any {
        const price = p.price
            ? parseFloat(typeof p.price === "number" ? p.price : String(p.price).replace(/[^0-9.]/g, "")) / 100
            : p.variants?.[0]?.price
                ? parseFloat(p.variants[0].price)
                : 0;

        const compareAtPrice = p.compare_at_price
            ? parseFloat(typeof p.compare_at_price === "number" ? p.compare_at_price : String(p.compare_at_price).replace(/[^0-9.]/g, "")) / 100
            : p.variants?.[0]?.compare_at_price
                ? parseFloat(p.variants[0].compare_at_price)
                : null;

        const imageUrl = p.image || p.featured_image || p.images?.[0]?.src || null;
        const handle = p.handle || p.url?.replace("/products/", "") || "";
        const host = storeHost.replace(/^https?:\/\//, "").replace(/\/+$/, "");

        return {
            id: `shopify-${host}-${p.id || handle}`,
            sourceProductId: `shopify-${host}-${p.id || handle}`,
            title: p.title || "",
            description: (p.body || p.body_html || "").replace(/<[^>]+>/g, "").trim(),
            imageUrl,
            price,
            sourcePrice: price,
            compareAtPrice,
            handle,
            productUrl: `https://${host}/products/${handle}`,
            sourceUrl: `https://${host}/products/${handle}`,
            vendor: p.vendor || "",
            brand: p.vendor || "",
            productType: p.product_type || p.type || "",
            category: p.product_type || p.type || "General",
            tags: typeof p.tags === "string" ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : (p.tags || []),
            shippingCost: 0,
            sourcePlatform: `Shopify (${host})`,
            condition: "NEW",
            availability: "IN_STOCK",
            currency: "USD",
            fetchedAt: new Date().toISOString(),
        };
    }
}