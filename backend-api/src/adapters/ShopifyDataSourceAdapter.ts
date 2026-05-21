import { DataSourceAdapter } from "./DataSourceAdapter";

export class ShopifyDataSourceAdapter implements DataSourceAdapter {
    name = "ShopifyDevStore";
    mode: "actual" | "fallback" | "placeholder" = "actual";

    isConfigured(): boolean {
        return !!(process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN);
    }

    /** Normalize store URL to bare hostname, no protocol, no trailing slash */
    private getStoreHost(): string {
        let url = (process.env.SHOPIFY_STORE_URL || "").trim();
        if (url.startsWith("https://")) url = url.slice(8);
        if (url.startsWith("http://"))  url = url.slice(7);
        if (url.endsWith("/"))          url = url.slice(0, -1);
        return url;
    }

    private async fetchRawProducts(): Promise<any[]> {
        const hasUrl   = !!process.env.SHOPIFY_STORE_URL;
        const hasToken = !!process.env.SHOPIFY_ACCESS_TOKEN;
        console.log(`[ShopifyDataSourceAdapter] SHOPIFY_STORE_URL exists: ${hasUrl}`);
        console.log(`[ShopifyDataSourceAdapter] SHOPIFY_ACCESS_TOKEN exists: ${hasToken}`);

        if (!hasUrl || !hasToken) {
            console.log("[ShopifyDataSourceAdapter] Not configured – skipping fetch.");
            return [];
        }

        const host   = this.getStoreHost();
        const apiUrl = `https://${host}/admin/api/2024-01/products.json?limit=50`;
        console.log(`[ShopifyDataSourceAdapter] Request URL: ${apiUrl}`);

        let res: Response;
        try {
            res = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN as string,
                    "Content-Type": "application/json"
                }
            });
        } catch (netErr: any) {
            console.error(`[ShopifyDataSourceAdapter] Network error: ${netErr.message}`);
            return [];
        }

        console.log(`[ShopifyDataSourceAdapter] HTTP Status: ${res.status}`);

        if (res.status === 401 || res.status === 403) {
            console.error("[ShopifyDataSourceAdapter] Invalid token or missing read_products scope. Reinstall Shopify app after adding read_products scope.");
            return [];
        }

        if (!res.ok) {
            console.error(`[ShopifyDataSourceAdapter] Shopify API error: ${res.status} ${res.statusText}`);
            return [];
        }

        let json: any;
        try {
            json = await res.json();
        } catch (parseErr: any) {
            console.error(`[ShopifyDataSourceAdapter] JSON parse error: ${parseErr.message}`);
            return [];
        }

        const raw = json?.products ?? [];
        console.log(`[ShopifyDataSourceAdapter] Raw Shopify product count: ${raw.length}`);
        return raw;
    }

    private mapProduct(p: any): any {
        const host = this.getStoreHost();
        const price = p.variants?.[0]?.price;
        const compareAtPrice = p.variants?.[0]?.compare_at_price;
        const inventory = p.variants?.[0]?.inventory_quantity ?? 0;

        const tags: string[] = p.tags
            ? p.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
            : [];

        return {
            id:                 String(p.id ?? ""),
            sourceProductId:    String(p.id ?? ""),
            title:              p.title          ?? "",
            description:        (p.body_html ?? "").replace(/<[^>]+>/g, "").trim(),
            imageUrl:           p.image?.src ?? p.images?.[0]?.src ?? null,
            price:              price != null ? parseFloat(price) : 0,
            sourcePrice:        price != null ? parseFloat(price) : 0,
            compareAtPrice:     compareAtPrice != null ? parseFloat(compareAtPrice) : null,
            inventoryQuantity:  inventory,
            handle:             p.handle         ?? "",
            productUrl:         `https://${host}/products/${p.handle}`,
            sourceUrl:          `https://${host}/products/${p.handle}`,
            status:             p.status         ?? "active",
            vendor:             p.vendor         ?? "",
            brand:              p.vendor         ?? "",
            productType:        p.product_type   ?? "",
            category:           p.product_type   ?? "Uncategorized",
            tags,
            shippingCost:       0,
            sourcePlatform:     "Shopify Dev Store"
        };
    }

    // ---- DataSourceAdapter interface ----

    async searchTrends(_query: string): Promise<any[]> {
        return [];
    }

    async searchProducts(query: string): Promise<any[]> {
        console.log(`[ShopifyDataSourceAdapter] searchProducts called. query='${query}'`);

        const raw     = await this.fetchRawProducts();
        const mapped  = raw.map(p => this.mapProduct(p));
        console.log(`[ShopifyDataSourceAdapter] Normalized product count: ${mapped.length}`);
        console.log(`[ShopifyDataSourceAdapter] Query provided: ${query ? "Yes" : "No"}`);

        if (!query) {
            return mapped;
        }

        // Typo correction
        let q = query.toLowerCase()
            .replace(/jewlery|jwelerry|jewelery|jewellery/g, "jewelry");

        const keywords = q.split(/\s+/).filter(Boolean);

        const filtered = mapped.filter(p => {
            const haystack = [
                p.title, p.description, p.category, p.productType, p.vendor,
                ...p.tags
            ].join(" ").toLowerCase();
            return keywords.every(kw => haystack.includes(kw));
        });

        console.log(`[ShopifyDataSourceAdapter] Filtered product count: ${filtered.length}`);
        if (filtered.length === 0) {
            console.log(`[ShopifyDataSourceAdapter] [] – query '${query}' matched 0 of ${mapped.length} products.`);
        }
        return filtered;
    }

    async getProductDetails(id: string): Promise<any> {
        const raw   = await this.fetchRawProducts();
        const found = raw.find(p => String(p.id) === id);
        return found ? this.mapProduct(found) : null;
    }

    async searchMarketplaceComparisons(_product: any): Promise<any[]> {
        return [];
    }
}
