export interface ListingPlatformAdapter {
    name: string;
    mode: string;
    
    isConfigured(): boolean;
    testConnection(): Promise<{ success: boolean; message: string }>;
    
    createDraftListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }>;
    createSandboxListing(data: any): Promise<{ success: boolean; externalId?: string; url?: string; message?: string }>;
    getListingStatus(listingId: string): Promise<{ status: string; message?: string }>;
}
