import { ListingPlatformAdapter } from "./ListingPlatformAdapter";

export class WooCommerceTestAdapter implements ListingPlatformAdapter {
    name = "WooCommerce";
    mode = process.env.WOOCOMMERCE_MODE || "test";

    isConfigured(): boolean {
        return !!(process.env.WOOCOMMERCE_STORE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET);
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) return { success: false, message: "WooCommerce credentials not configured" };
        return { success: true, message: "Connected to WooCommerce Test Store successfully." };
    }

    async createDraftListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("WooCommerce not configured");
        return { success: true, externalId: `woo-draft-${Date.now()}`, message: "WooCommerce test draft created." };
    }

    async createSandboxListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("WooCommerce not configured");
        return { 
            success: true, 
            externalId: `woo-test-${Date.now()}`, 
            url: `https://${process.env.WOOCOMMERCE_STORE_URL || 'test-store.local'}/product/test-${Date.now()}`,
            message: "WooCommerce test listing published." 
        };
    }

    async getListingStatus(listingId: string): Promise<{ status: string; message?: string }> {
        return { status: "PUBLISHED" };
    }
}
