import { ListingPlatformAdapter } from "./ListingPlatformAdapter";

export class MockListingAdapter implements ListingPlatformAdapter {
    name = "Mock Platform";
    mode = "mock";

    isConfigured(): boolean {
        return true; // Mock is always configured
    }

    async testConnection(): Promise<{ success: boolean; message: string }> {
        return { success: true, message: "Connected to Mock Platform successfully." };
    }

    async createDraftListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        return { success: true, externalId: `mock-draft-${Date.now()}`, message: "Mock draft created." };
    }

    async createSandboxListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }> {
        return { 
            success: true, 
            externalId: `mock-sandbox-${Date.now()}`, 
            url: `http://localhost:4000/mock/listing/${Date.now()}`,
            message: "Mock listing published successfully." 
        };
    }

    async getListingStatus(listingId: string): Promise<{ status: string; message?: string }> {
        return { status: "MOCK_ACTIVE" };
    }
}
