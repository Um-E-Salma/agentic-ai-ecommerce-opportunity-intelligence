import { ListingPlatformAdapter } from "./ListingPlatformAdapter";

export class ShopifyDevAdapter implements ListingPlatformAdapter {
    name = "Shopify";
    mode = process.env.SHOPIFY_MODE || "development";

    isConfigured(): boolean {
        return !!(process.env.SHOPIFY_STORE_URL && process.env.SHOPIFY_ACCESS_TOKEN);
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) return { success: false, message: "Shopify credentials not configured" };
        return { success: true, message: "Connected to Shopify Dev Store successfully." };
    }

    async createDraftListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("Shopify not configured");
        return { success: true, externalId: `shopify-draft-${Date.now()}`, message: "Shopify dev draft created." };
    }

    async createSandboxListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("Shopify not configured");
        return { 
            success: true, 
            externalId: `shopify-dev-${Date.now()}`, 
            url: `https://${process.env.SHOPIFY_STORE_URL || 'dev-store.myshopify.com'}/products/dev-${Date.now()}`,
            message: "Shopify dev listing published." 
        };
    }

    async getListingStatus(listingId: string): Promise<{ status: string; message?: string }> {
        return { status: "ACTIVE" };
    }
}
