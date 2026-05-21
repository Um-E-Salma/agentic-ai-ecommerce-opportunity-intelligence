export interface NotificationResult {
    success: boolean;
    status: string;
    error?: string;
    messageId?: string;
}

export class TelegramService {
    private botToken: string | undefined;
    private chatId: string | undefined;

    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
    }

    isConfigured(): boolean {
        return !!(this.botToken && this.chatId && this.botToken.length > 0 && this.chatId.length > 0);
    }

    async sendAlert(opportunity: any): Promise<NotificationResult> {
        if (!this.isConfigured()) {
            return { success: false, status: 'TELEGRAM_NOT_CONFIGURED' };
        }

        const message = this.formatMessage(opportunity);

        try {
            const baseUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000';
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: message,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "✅ Want to Buy", url: `${baseUrl}/opportunities/${opportunity.id}/want-to-buy` },
                                { text: "❌ Don't Want to Buy", url: `${baseUrl}/opportunities/${opportunity.id}/dont-want-to-buy` }
                            ]
                        ]
                    }
                })
            });

            const data = await response.json() as any;

            if (data.ok) {
                return { success: true, status: 'SENT', messageId: String(data.result?.message_id) };
            } else {
                return { success: false, status: 'FAILED', error: data.description || 'Unknown Telegram error' };
            }
        } catch (error: any) {
            return { success: false, status: 'FAILED', error: error.message };
        }
    }

    private formatMessage(op: any): string {
        return `🛒 <b>New Opportunity Found</b>

<b>${op.title}</b>
📦 Platform: ${op.sourcePlatform}
💰 Source Price: $${op.sourcePrice?.toFixed(2)}
📈 Est. Resale: $${op.estimatedSellingPrice?.toFixed(2)}
✅ Net Profit: $${op.netProfit?.toFixed(2)}
📊 ROI: ${op.roiPercent?.toFixed(1)}%
⚠️ Risk: ${op.riskLevel}
🎯 Match Score: ${(op.matchScore * 100)?.toFixed(0)}%
🤖 AI Decision: ${op.aiDecision}
📝 Reason: ${op.aiReason || 'N/A'}

🔗 Source: ${op.sourceUrl || 'N/A'}

⚠️ <b>Manual approval required. No automatic purchase will be made.</b>`;
    }

    formatTestMessage(): string {
        return `🧪 <b>Test Notification</b>\n\nThis is a test message from Agentic E-Commerce MVP.\nTelegram integration is working correctly.\n\n⚠️ <b>Manual approval required. No automatic purchase will be made.</b>`;
    }

    async sendTestMessage(): Promise<NotificationResult> {
        if (!this.isConfigured()) {
            return { success: false, status: 'TELEGRAM_NOT_CONFIGURED' };
        }

        try {
            const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.chatId,
                    text: this.formatTestMessage(),
                    parse_mode: 'HTML'
                })
            });

            const data = await response.json() as any;
            if (data.ok) {
                return { success: true, status: 'SENT', messageId: String(data.result?.message_id) };
            } else {
                return { success: false, status: 'FAILED', error: data.description || 'Unknown Telegram error' };
            }
        } catch (error: any) {
            return { success: false, status: 'FAILED', error: error.message };
        }
    }
}
