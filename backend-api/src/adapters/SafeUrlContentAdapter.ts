import { DataSourceAdapter } from "./DataSourceAdapter";

export class SafeUrlContentAdapter implements DataSourceAdapter {
    name = "SafeUrlContentAdapter";
    mode: "actual" | "fallback" | "placeholder" = "placeholder";

    isConfigured(): boolean {
        return true; // Assume always available for safe fetches
    }

    async searchTrends(query: string): Promise<any[]> {
        return [];
    }

    async searchProducts(query: string): Promise<any[]> {
        return [];
    }

    async getProductDetails(id: string): Promise<any> {
        return null;
    }

    async searchMarketplaceComparisons(product: any): Promise<any[]> {
        return [];
    }
}
