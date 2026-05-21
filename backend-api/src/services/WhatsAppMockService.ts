import { NotificationResult } from './TelegramService';

export class WhatsAppMockService {
    private testNumber: string | undefined;
    private enabled: boolean;

    constructor() {
        this.testNumber = process.env.WHATSAPP_TEST_NUMBER;
        this.enabled = process.env.WHATSAPP_MODE === 'mock';
    }

    isConfigured(): boolean {
        return this.enabled;
    }

    async sendMockAlert(opportunity: any): Promise<NotificationResult> {
        if (!this.enabled) {
            return { success: false, status: 'WHATSAPP_NOT_CONFIGURED' };
        }

        // This is a MOCK only — no real message is sent
        const body = this.formatMessage(opportunity);

        return {
            success: true,
            status: 'MOCK_CREATED',
            messageId: `mock-wa-${Date.now()}`
        };
    }

    private formatMessage(op: any): string {
        return `🛒 *New Opportunity Found*

*${op.title}*
📦 Platform: ${op.sourcePlatform}
💰 Source: $${op.sourcePrice?.toFixed(2)}
📈 Resale: $${op.estimatedSellingPrice?.toFixed(2)}
✅ Profit: +$${op.netProfit?.toFixed(2)}
📊 ROI: ${op.roiPercent?.toFixed(1)}%
⚠️ Risk: ${op.riskLevel}
🤖 Decision: ${op.aiDecision}

🔗 ${op.sourceUrl || 'N/A'}

*Actions:*
✅ [Want to Buy](${process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000'}/opportunities/${op.id}/want-to-buy)
❌ [Don't Want to Buy](${process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000'}/opportunities/${op.id}/dont-want-to-buy)

⚠️ *Manual approval required. No automatic purchase will be made.*`;
    }

    formatBody(opportunity: any): string {
        return this.formatMessage(opportunity);
    }

    async sendTestMock(): Promise<NotificationResult> {
        if (!this.enabled) {
            return { success: false, status: 'WHATSAPP_NOT_CONFIGURED' };
        }

        return {
            success: true,
            status: 'MOCK_CREATED',
            messageId: `mock-wa-test-${Date.now()}`
        };
    }
}
