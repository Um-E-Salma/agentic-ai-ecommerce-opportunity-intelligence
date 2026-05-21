import nodemailer from 'nodemailer';
import { NotificationResult } from './TelegramService';

export class EmailService {
    private host: string | undefined;
    private port: number;
    private user: string | undefined;
    private pass: string | undefined;
    private from: string | undefined;
    private to: string | undefined;

    constructor() {
        this.host = process.env.SMTP_HOST;
        this.port = parseInt(process.env.SMTP_PORT || '587', 10);
        this.user = process.env.SMTP_USER;
        this.pass = process.env.SMTP_PASS;
        this.from = process.env.EMAIL_FROM;
        this.to = process.env.EMAIL_TO;
    }

    isConfigured(): boolean {
        return !!(this.host && this.user && this.pass && this.from && this.to);
    }

    async sendAlert(opportunity: any): Promise<NotificationResult> {
        if (!this.isConfigured()) {
            return { success: false, status: 'EMAIL_NOT_CONFIGURED' };
        }

        const subject = `🛒 Opportunity: ${opportunity.title} (ROI ${opportunity.roiPercent?.toFixed(1)}%)`;
        const html = this.formatHtml(opportunity);

        try {
            const transporter = nodemailer.createTransport({
                host: this.host,
                port: this.port,
                secure: this.port === 465,
                auth: {
                    user: this.user,
                    pass: this.pass,
                },
            });

            const info = await transporter.sendMail({
                from: this.from,
                to: this.to,
                subject,
                html,
            });

            return { success: true, status: 'SENT', messageId: info.messageId };
        } catch (error: any) {
            return { success: false, status: 'FAILED', error: error.message };
        }
    }

    private formatHtml(op: any): string {
        const baseUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000';
        return `
<h2>🛒 New Opportunity Found</h2>
<table style="border-collapse:collapse; width:100%; max-width:500px;">
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>Product</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">${op.title}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>Platform</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">${op.sourcePlatform}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>Source Price</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">$${op.sourcePrice?.toFixed(2)}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>Est. Resale</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">$${op.estimatedSellingPrice?.toFixed(2)}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>Net Profit</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">$${op.netProfit?.toFixed(2)}</td></tr>
    <tr><td style="padding:8px; border-bottom:1px solid #ccc;"><b>ROI</b></td><td style="padding:8px; border-bottom:1px solid #ccc;">${op.roiPercent?.toFixed(1)}%</td></tr>
</table>

<p><b>AI Decision:</b> ${op.aiDecision}</p>
<p><i>Reason:</i> ${op.aiReason || 'N/A'}</p>

<div style="margin-top:20px;">
    <a href="${baseUrl}/opportunities/${op.id}/want-to-buy" style="display:inline-block; padding:10px 15px; margin-right:10px; background-color:#28a745; color:#fff; text-decoration:none; border-radius:5px;">✅ Want to Buy</a>
    <a href="${baseUrl}/opportunities/${op.id}/dont-want-to-buy" style="display:inline-block; padding:10px 15px; background-color:#dc3545; color:#fff; text-decoration:none; border-radius:5px;">❌ Don't Want to Buy</a>
</div>

<br/>
<small style="color:gray;">⚠️ Action Required: Manual purchase only. No automated payment will occur.</small>
        `;
    }

    async sendTestEmail(): Promise<NotificationResult> {
        if (!this.isConfigured()) {
            return { success: false, status: 'EMAIL_NOT_CONFIGURED' };
        }

        try {
            const transporter = nodemailer.createTransport({
                host: this.host,
                port: this.port,
                secure: this.port === 465,
                auth: { user: this.user, pass: this.pass },
            });

            const info = await transporter.sendMail({
                from: this.from,
                to: this.to,
                subject: '🧪 Test Notification - Agentic E-Commerce MVP',
                html: '<h2>Test Notification</h2><p>Email integration is working correctly.</p><p style="color:red;"><b>⚠️ Manual approval required. No automatic purchase will be made.</b></p>',
            });

            return { success: true, status: 'SENT', messageId: info.messageId };
        } catch (error: any) {
            return { success: false, status: 'FAILED', error: error.message };
        }
    }
}
