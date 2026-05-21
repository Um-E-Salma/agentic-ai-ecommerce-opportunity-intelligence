export interface DataSourceAdapter {
    name: string;
    mode: "actual" | "fallback" | "placeholder";
    isConfigured(): boolean;
    searchTrends(query: string): Promise<any[]>;
    searchProducts(query: string): Promise<any[]>;
    getProductDetails(id: string): Promise<any>;
    searchMarketplaceComparisons(product: any): Promise<any[]>;
}
