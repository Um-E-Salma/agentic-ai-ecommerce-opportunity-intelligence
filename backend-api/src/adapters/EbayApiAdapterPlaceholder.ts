import { DataSourceAdapter } from "./DataSourceAdapter";

export class EbayApiAdapterPlaceholder implements DataSourceAdapter {
    name = "EbayApiAdapter";
    mode: "actual" | "fallback" | "placeholder" = "placeholder";

    isConfigured(): boolean {
        return false; // Credentials missing in Phase 1
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
