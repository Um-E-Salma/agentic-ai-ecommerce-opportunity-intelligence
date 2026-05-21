import { PrismaClient } from '@prisma/client';
import { TelegramService } from './TelegramService';
import { EmailService } from './EmailService';
import { WhatsAppMockService } from './WhatsAppMockService';

export class NotificationService {
    private prisma: PrismaClient;
    private telegram: TelegramService;
    private email: EmailService;
    private whatsapp: WhatsAppMockService;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
        this.telegram = new TelegramService();
        this.email = new EmailService();
        this.whatsapp = new WhatsAppMockService();
    }

    getChannelStatus() {
        return {
            telegram: this.telegram.isConfigured() ? 'configured' : 'not_configured',
            email: this.email.isConfigured() ? 'configured' : 'not_configured',
            whatsappMock: this.whatsapp.isConfigured() ? 'enabled' : 'disabled',
        };
    }

    async sendNotifications(opportunityId: string, channels: string[]) {
        const opportunity = await this.prisma.productOpportunity.findUnique({
            where: { id: opportunityId }
        });

        if (!opportunity) {
            throw new Error(`Opportunity not found: ${opportunityId}`);
        }

        const results = [];

        for (const channel of channels) {
            let result;
            let body = '';
            let subject: string | null = null;

            switch (channel) {
                case 'telegram': {
                    result = await this.telegram.sendAlert(opportunity);
                    body = `Telegram alert for ${opportunity.title}`;
                    break;
                }
                case 'email': {
                    result = await this.email.sendAlert(opportunity);
                    subject = `Opportunity: ${opportunity.title}`;
                    body = `Email alert for ${opportunity.title}`;
                    break;
                }
                case 'whatsapp_mock': {
                    result = await this.whatsapp.sendMockAlert(opportunity);
                    body = this.whatsapp.formatBody(opportunity);
                    break;
                }
                default:
                    result = { success: false, status: 'UNKNOWN_CHANNEL', error: `Unknown channel: ${channel}` };
                    body = `Unknown channel: ${channel}`;
            }

            // Persist NotificationDraft record
            const notification = await this.prisma.notificationDraft.create({
                data: {
                    opportunityId,
                    channel: channel.toUpperCase(),
                    subject,
                    body,
                    status: result.status,
                    errorMessage: result.error ?? null,
                    sentAt: result.success ? new Date() : null,
                }
            });

            // Log to AgentTraceLog
            await this.prisma.agentTraceLog.create({
                data: {
                    runId: opportunity.runId,
                    agentName: 'NotificationService',
                    stepName: `${channel.toUpperCase()} notification ${result.status}`,
                    stepType: 'NOTIFICATION',
                    outputSummary: JSON.stringify({ notificationId: notification.id, status: result.status, error: result.error }),
                    status: result.success ? 'SUCCESS' : 'FAILED',
                }
            });

            results.push({ channel, ...result, notificationId: notification.id });
        }

        return results;
    }

    async testChannel(channel: string) {
        switch (channel) {
            case 'telegram':
                return await this.telegram.sendTestMessage();
            case 'email':
                return await this.email.sendTestEmail();
            case 'whatsapp_mock':
                return await this.whatsapp.sendTestMock();
            default:
                return { success: false, status: 'UNKNOWN_CHANNEL', error: `Unknown channel: ${channel}` };
        }
    }
}
