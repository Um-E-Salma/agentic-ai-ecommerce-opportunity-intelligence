import { DataSourceAdapter } from "./DataSourceAdapter";
import * as fs from 'fs';
import * as path from 'path';

export class MockFallbackAdapter implements DataSourceAdapter {
    name = "MockFallbackAdapter";
    mode: "actual" | "fallback" | "placeholder" = "fallback";

    private dataDir = path.join(__dirname, '../../../data');

    isConfigured(): boolean {
        return true; // Always available
    }

    private readJsonFile(filename: string): any[] {
        const filePath = path.join(this.dataDir, filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
        return [];
    }

    async searchTrends(query: string): Promise<any[]> {
        const trends = this.readJsonFile('fallback-trends.json');
        if (query) {
            return trends.filter((t: any) => 
                t.keyword.toLowerCase().includes(query.toLowerCase()) ||
                t.category.toLowerCase().includes(query.toLowerCase())
            );
        }
        return trends;
    }

    async searchProducts(query: string): Promise<any[]> {
        const products = this.readJsonFile('fallback-source-products.json');
        if (query) {
            return products.filter((p: any) => 
                p.title.toLowerCase().includes(query.toLowerCase()) ||
                p.category.toLowerCase().includes(query.toLowerCase())
            );
        }
        return products;
    }

    async getProductDetails(id: string): Promise<any> {
        const products = this.readJsonFile('fallback-source-products.json');
        return products.find((p: any) => p.id === id || p.sourceProductId === id);
    }

    async searchMarketplaceComparisons(product: any): Promise<any[]> {
        const comparisons = this.readJsonFile('fallback-marketplace-comparisons.json');
        return comparisons.filter((c: any) => c.sourceProductId === product.sourceProductId);
    }
}
