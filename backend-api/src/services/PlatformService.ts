import { PrismaClient } from "@prisma/client";
import { ListingPlatformAdapter } from "../adapters/ListingPlatformAdapter";
import { EbaySandboxAdapter } from "../adapters/EbaySandboxAdapter";
import { ShopifyDevAdapter } from "../adapters/ShopifyDevAdapter";
import { WooCommerceTestAdapter } from "../adapters/WooCommerceTestAdapter";
import { MockListingAdapter } from "../adapters/MockListingAdapter";

export class PlatformService {
    private prisma: PrismaClient;
    private adapters: Record<string, ListingPlatformAdapter>;

    constructor() {
        this.prisma = new PrismaClient();
        this.adapters = {
            "ebay_sandbox": new EbaySandboxAdapter(),
            "shopify_dev": new ShopifyDevAdapter(),
            "woocommerce_test": new WooCommerceTestAdapter(),
            "mock": new MockListingAdapter()
        };
    }

    getAdapter(platform: string): ListingPlatformAdapter {
        return this.adapters[platform] || this.adapters["mock"]!;
    }

    async getPlatformStatuses() {
        const statuses = [];
        for (const [key, adapter] of Object.entries(this.adapters)) {
            if (key === 'mock') continue; // Skip mock in the main status list
            
            let dbRecord = await this.prisma.platformConnection.findUnique({
                where: { platform: key }
            });

            if (!dbRecord) {
                dbRecord = await this.prisma.platformConnection.create({
                    data: {
                        platform: key,
                        mode: adapter.mode,
                        configured: adapter.isConfigured()
                    }
                });
            } else if (dbRecord.configured !== adapter.isConfigured()) {
                dbRecord = await this.prisma.platformConnection.update({
                    where: { platform: key },
                    data: { configured: adapter.isConfigured() }
                });
            }

            statuses.push({
                platform: key,
                name: adapter.name,
                mode: adapter.mode,
                configured: dbRecord.configured,
                lastTestStatus: dbRecord.lastTestStatus,
                lastTestMessage: dbRecord.lastTestMessage,
                lastTestedAt: dbRecord.lastTestedAt
            });
        }
        return statuses;
    }

    async testConnection(platform: string) {
        const adapter = this.adapters[platform];
        if (!adapter) throw new Error("Unknown platform");

        const result = await adapter.testConnection();

        await this.prisma.platformConnection.upsert({
            where: { platform },
            create: {
                platform,
                mode: adapter.mode,
                configured: adapter.isConfigured(),
                lastTestStatus: result.success ? "SUCCESS" : "FAILED",
                lastTestMessage: result.message,
                lastTestedAt: new Date()
            },
            update: {
                configured: adapter.isConfigured(),
                lastTestStatus: result.success ? "SUCCESS" : "FAILED",
                lastTestMessage: result.message,
                lastTestedAt: new Date()
            }
        });

        return result;
    }
}
