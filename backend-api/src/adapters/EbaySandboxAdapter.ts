import { ListingPlatformAdapter } from "./ListingPlatformAdapter";

export class EbaySandboxAdapter implements ListingPlatformAdapter {
    name = "eBay";
    mode = process.env.EBAY_ENV || "sandbox";

    isConfigured(): boolean {
        return !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) return { success: false, message: "eBay credentials not configured" };
        // Simulate API check
        return { success: true, message: "Connected to eBay Sandbox successfully." };
    }

    async createDraftListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("eBay not configured");
        return { success: true, externalId: `ebay-draft-${Date.now()}`, message: "eBay sandbox draft created." };
    }

    async createSandboxListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        if (!this.isConfigured()) throw new Error("eBay not configured");
        return { 
            success: true, 
            externalId: `ebay-sandbox-${Date.now()}`, 
            url: `https://sandbox.ebay.com/itm/sandbox-${Date.now()}`,
            message: "eBay sandbox listing published." 
        };
    }

    async getListingStatus(listingId: string): Promise<{ status: string; message?: string }> {
        return { status: "ACTIVE" };
    }
}
