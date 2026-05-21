import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AgentOrchestratorService } from './services/AgentOrchestratorService';
import { NotificationService } from './services/NotificationService';
import { PlatformService } from './services/PlatformService';
import { ListingService } from './services/ListingService';
import { ListingOptimizationService } from './services/ListingOptimizationService';
import { MockGeminiReasoningService } from "./services/GeminiReasoningService";
import { RealGeminiReasoningService } from "./services/RealGeminiReasoningService";
import * as dotenv from 'dotenv';
import cors from 'cors';
import { ShopifyDataSourceAdapter as ShopifyAdapter } from './adapters/ShopifyDataSourceAdapter';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const prisma = new PrismaClient();
const orchestrator = new AgentOrchestratorService();
const platformService = new PlatformService();
const listingService = new ListingService();

const useMockAI = process.env.USE_MOCK_AI === "true" || !process.env.GEMINI_API_KEY;
const reasoningService = useMockAI ? new MockGeminiReasoningService() : new RealGeminiReasoningService();
const optimizationService = new ListingOptimizationService(prisma, reasoningService);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());


// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Create input
app.post('/inputs/analyze', async (req, res) => {
    try {
        const { content, urls } = req.body;

        const input = await prisma.unstructuredInput.create({
            data: {
                type: "TEXT",
                content,
                urls: urls ? JSON.stringify(urls) : null
            }
        });

        res.status(201).json(input);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Run agent from input
app.post('/agent/run-from-input', async (req, res) => {
    try {
        const { inputId } = req.body;

        const result = await orchestrator.runWorkflow(inputId);

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get agent runs
app.get('/agent/runs', async (req, res) => {
    try {
        const runs = await prisma.agentRun.findMany({
            orderBy: { startedAt: 'desc' }
        });
        res.json(runs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get agent trace
app.get('/agent/trace/:runId', async (req, res) => {
    try {
        const { runId } = req.params;
        const logs = await prisma.agentTraceLog.findMany({
            where: { runId },
            orderBy: { createdAt: 'asc' }
        });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
// Get opportunities – supports ?runId=xxx and ?latest=true
app.get('/opportunities', async (req, res) => {
    try {
        const { runId, latest } = req.query;

        // If ?latest=true, find the most recent agent run and use its runId
        let filterRunId = runId as string | undefined;
        if (!filterRunId && latest === 'true') {
            const latestRun = await prisma.agentRun.findFirst({
                orderBy: { startedAt: 'desc' },
                where: { status: 'COMPLETED' }
            });
            if (latestRun) filterRunId = latestRun.id;
        }

        const opportunities = await prisma.productOpportunity.findMany({
            ...(filterRunId ? { where: { runId: filterRunId } } : {}),
            orderBy: { createdAt: 'desc' }
        });
        res.json(opportunities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get dashboard analytics
app.get('/analytics/dashboard', async (req, res) => {
    try {
        const totalInputs = await prisma.unstructuredInput.count();
        const totalOpportunities = await prisma.productOpportunity.count();
        const recentRuns = await prisma.agentRun.findMany({
            take: 5,
            orderBy: { startedAt: 'desc' },
            include: {
                AgentTraceLog: {
                    where: { agentName: 'AnalyticsCampaignAgent', stepName: 'Completed analytics.' },
                    take: 1
                }
            }
        });

        const mappedRuns = recentRuns.map(run => ({
            ...run,
            traceLogs: run.AgentTraceLog
        }));

        // Phase 2 stats
        const totalNotificationsSent = await prisma.notificationDraft.count({ where: { status: 'SENT' } });
        const totalNotificationDrafts = await prisma.notificationDraft.count({ where: { status: 'DRAFT' } });
        const totalPurchaseCandidates = await prisma.purchaseCandidate.count();
        const totalApproved = await prisma.purchaseCandidate.count({ where: { status: 'APPROVED_TO_BUY' } });
        const totalPurchasedManually = await prisma.purchaseCandidate.count({ where: { status: 'PURCHASED_MANUALLY' } });
        const totalRejected = await prisma.purchaseCandidate.count({ where: { status: 'REJECTED' } });

        // Phase 3 stats
        const totalDemoListings = await prisma.demoListing.count();
        const totalMockListings = await prisma.demoListing.count({ where: { platform: 'mock' } });

        res.json({
            stats: {
                totalInputs,
                totalOpportunities,
                totalNotificationsSent,
                totalNotificationDrafts,
                totalPurchaseCandidates,
                totalApproved,
                totalPurchasedManually,
                totalRejected,
                totalDemoListings,
                totalMockListings,
            },
            recentRuns: mappedRuns
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PHASE 2: Notification & Purchase Approval Endpoints ==========

const notificationService = new NotificationService(prisma);
function isBrowserRequest(req: express.Request) {
    const accept = req.headers.accept || "";
    return accept.includes("text/html");
}

// Get notification channel status
app.get('/notifications/status', (req, res) => {
    res.json(notificationService.getChannelStatus());
});

// List all notifications
app.get('/notifications', async (req, res) => {
    try {
        const notifications = await prisma.notificationDraft.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Send notifications for an opportunity
app.post('/notifications/send/:opportunityId', async (req, res) => {
    try {
        const { opportunityId } = req.params;
        const { channels } = req.body;
        const results = await notificationService.sendNotifications(opportunityId, channels || ['telegram', 'email', 'whatsapp_mock']);
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Test a notification channel
app.post('/notifications/test', async (req, res) => {
    try {
        const { channel } = req.body;
        const result = await notificationService.testChannel(channel);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// List all purchase candidates
app.get('/purchase-candidates', async (req, res) => {
    try {
        const candidates = await prisma.purchaseCandidate.findMany({
            orderBy: { createdAt: 'desc' },
            include: { opportunity: true, DemoListing: true }
        });
        res.json(candidates);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single purchase candidate
app.get('/purchase-candidates/:id', async (req, res) => {
    try {
        const candidate = await prisma.purchaseCandidate.findUnique({
            where: { id: req.params.id },
            include: { opportunity: true, PurchaseActionLog: { orderBy: { createdAt: 'asc' } } }
        });
        if (!candidate) return res.status(404).json({ error: 'Not found' });
        res.json(candidate);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create purchase candidate from opportunity
app.post('/opportunities/:id/create-purchase-candidate', async (req, res) => {
    try {
        const opportunity = await prisma.productOpportunity.findUnique({ where: { id: req.params.id } });
        if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });

        // Guard: check if candidate already exists for this opportunity
        const existing = await prisma.purchaseCandidate.findFirst({
            where: { opportunityId: opportunity.id }
        });
        if (existing) {
            return res.status(200).json({ ...existing, alreadyExists: true });
        }

        const candidate = await prisma.purchaseCandidate.create({
            data: {
                opportunityId: opportunity.id,
                status: 'NEW',
                sourceUrl: opportunity.sourceUrl,
                projectedProfit: opportunity.netProfit,
                roiPercent: opportunity.roiPercent,
            }
        });

        await prisma.agentTraceLog.create({
            data: {
                runId: opportunity.runId,
                agentName: 'PurchaseApprovalFlow',
                stepName: 'Purchase candidate created',
                stepType: 'PURCHASE_FLOW',
                outputSummary: JSON.stringify({ candidateId: candidate.id, status: 'NEW' }),
                status: 'SUCCESS',
            }
        });

        res.status(201).json(candidate);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Helper: update candidate status with action log
async function updateCandidateStatus(
    candidateId: string,
    action: string,
    newStatus: string,
    dateField: Record<string, Date>,
    notes?: string
) {
    const candidate = await prisma.purchaseCandidate.findUnique({
        where: { id: candidateId },
        include: { opportunity: true }
    });
    if (!candidate) throw new Error('Purchase candidate not found');

    const statusBefore = candidate.status;

    const updated = await prisma.purchaseCandidate.update({
        where: { id: candidateId },
        data: { status: newStatus, notes: notes ?? null, ...dateField }
    });

    await prisma.purchaseActionLog.create({
        data: {
            candidateId,
            action,
            statusBefore,
            statusAfter: newStatus,
            notes: notes ?? null,
        }
    });

    await prisma.agentTraceLog.create({
        data: {
            runId: candidate.opportunity.runId,
            agentName: 'PurchaseApprovalFlow',
            stepName: `${action}: ${statusBefore} → ${newStatus}`,
            stepType: 'PURCHASE_FLOW',
            outputSummary: JSON.stringify({ candidateId, action, statusBefore, statusAfter: newStatus }),
            status: 'SUCCESS',
        }
    });

    return updated;
}

// Approve purchase candidate
app.post('/purchase-candidates/:id/approve', async (req, res) => {
    try {
        const updated = await updateCandidateStatus(req.params.id, 'APPROVE', 'APPROVED_TO_BUY', { approvedAt: new Date() }, req.body.notes);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Reject purchase candidate
app.post('/purchase-candidates/:id/reject', async (req, res) => {
    try {
        const updated = await updateCandidateStatus(req.params.id, 'REJECT', 'REJECTED', { rejectedAt: new Date() }, req.body.notes);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Mark source page opened
app.post('/purchase-candidates/:id/opened', async (req, res) => {
    try {
        const updated = await updateCandidateStatus(req.params.id, 'OPEN_SOURCE_PAGE', 'OPENED_FOR_MANUAL_PURCHASE', { openedAt: new Date() });
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Mark purchased manually
app.post('/purchase-candidates/:id/mark-purchased', async (req, res) => {
    try {
        const updated = await updateCandidateStatus(req.params.id, 'MARK_PURCHASED', 'PURCHASED_MANUALLY', { purchasedManuallyAt: new Date() }, req.body.notes);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Want to Buy (from Notification or UI)
app.all('/opportunities/:id/want-to-buy', async (req, res) => {
    try {
        const opportunity = await prisma.productOpportunity.findUnique({ where: { id: req.params.id } });
        if (!opportunity) return res.status(404).json({ error: "Opportunity not found" });

        let candidate = await prisma.purchaseCandidate.findFirst({ where: { opportunityId: opportunity.id } });

        if (!candidate) {
            candidate = await prisma.purchaseCandidate.create({
                data: {
                    opportunityId: opportunity.id,
                    status: 'APPROVED_TO_BUY',
                    sourceUrl: opportunity.sourceUrl || "",
                    projectedProfit: opportunity.netProfit,
                    roiPercent: opportunity.roiPercent,
                    approvedAt: new Date()
                }
            });
        } else {
            candidate = await updateCandidateStatus(candidate.id, 'APPROVE', 'APPROVED_TO_BUY', { approvedAt: new Date() }, "User clicked Want to Buy");
        }

        //res.json({ success: true, candidate, url: candidate.sourceUrl || opportunity.sourceUrl });
        const redirectUrl = candidate.sourceUrl || opportunity.sourceUrl;

        if (isBrowserRequest(req) && redirectUrl) {
            return res.redirect(302, redirectUrl);
        }

        res.json({ success: true, candidate, url: redirectUrl });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Don't Want to Buy (from Notification or UI)
app.all('/opportunities/:id/dont-want-to-buy', async (req, res) => {
    try {
        const opportunity = await prisma.productOpportunity.findUnique({ where: { id: req.params.id } });
        if (!opportunity) return res.status(404).json({ error: "Opportunity not found" });

        let candidate = await prisma.purchaseCandidate.findFirst({ where: { opportunityId: opportunity.id } });

        if (!candidate) {
            candidate = await prisma.purchaseCandidate.create({
                data: {
                    opportunityId: opportunity.id,
                    status: 'REJECTED',
                    sourceUrl: opportunity.sourceUrl || "",
                    projectedProfit: opportunity.netProfit,
                    roiPercent: opportunity.roiPercent,
                    rejectedAt: new Date()
                }
            });
        } else {
            candidate = await updateCandidateStatus(candidate.id, 'REJECT', 'REJECTED', { rejectedAt: new Date() }, "User clicked Don't Want to Buy");
        }

        //res.json({ success: true, candidate });
        const redirectUrl = candidate.sourceUrl || opportunity.sourceUrl;

        if (isBrowserRequest(req) && redirectUrl) {
            return res.redirect(302, redirectUrl);
        }

        res.json({ success: true, candidate, url: redirectUrl });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PHASE 3: Sandbox / Test Platform Integrations ==========

app.get('/platforms/status', async (req, res) => {
    try {
        const statuses = await platformService.getPlatformStatuses();
        res.json(statuses);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/platforms/shopify/products', async (req, res) => {
    try {
        const { query } = req.query;
        const qStr = (query as string) || "";

        console.log(`[/platforms/shopify/products] Request received. query='${qStr}'`);
        console.log(`[/platforms/shopify/products] SHOPIFY_STORE_URL set: ${!!process.env.SHOPIFY_STORE_URL}`);
        console.log(`[/platforms/shopify/products] SHOPIFY_ACCESS_TOKEN set: ${!!process.env.SHOPIFY_ACCESS_TOKEN}`);

        const adapter = new ShopifyAdapter();

        if (!adapter.isConfigured()) {
            return res.status(400).json({
                error: "Shopify not configured",
                hint: "Set SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN in .env"
            });
        }

        const products = await adapter.searchProducts(qStr);
        console.log(`[/platforms/shopify/products] Returning ${products.length} products.`);
        return res.json(products);
    } catch (error: any) {
        console.error(`[/platforms/shopify/products] Error: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/platforms/test/:platform', async (req, res) => {
    try {
        const result = await platformService.testConnection(req.params.platform);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/listings/recommend-candidate/:candidateId', async (req, res) => {
    try {
        const recommendation = await listingService.generateRecommendation(req.params.candidateId);
        res.json(recommendation);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/listings/create', async (req, res) => {
    try {
        const { candidateId, platform, title, description, price, tags, category } = req.body;
        if (!candidateId || !platform || !title || !description || price === undefined) {
            return res.status(400).json({ error: "Missing required listing fields" });
        }
        const listing = await listingService.createDemoListing({
            candidateId, platform, title, description, price, tags, category
        });
        res.json(listing);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/listings', async (req, res) => {
    try {
        const listings = await listingService.getDemoListings();
        res.json(listings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PHASE 4: Advanced Listing Optimization ==========

app.post('/listings/:id/optimize', async (req, res) => {
    try {
        const result = await optimizationService.optimizeListing(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/listings/:id/regenerate-optimization', async (req, res) => {
    try {
        const result = await optimizationService.optimizeListing(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/listings/:id/apply-optimization', async (req, res) => {
    try {
        const { optimizationId, selectedPricingStrategy } = req.body;
        const result = await optimizationService.applyOptimization(req.params.id, optimizationId, selectedPricingStrategy);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/listings/:id/revert-optimization', async (req, res) => {
    try {
        const { optimizationId } = req.body;
        const result = await optimizationService.revertOptimization(req.params.id, optimizationId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/listings/:id/optimizations', async (req, res) => {
    try {
        const result = await optimizationService.getOptimizations(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/listings/:id/pricing-options', async (req, res) => {
    try {
        const result = await prisma.pricingRecommendation.findMany({ where: { listingId: req.params.id } });
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/listings/:id/quality-score', async (req, res) => {
    try {
        const listing = await prisma.demoListing.findUnique({ where: { id: req.params.id } });
        if (!listing) return res.status(404).json({ error: 'Not found' });
        const score = optimizationService.calculateQualityScore(listing);
        res.json(score);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ========== PHASE 5: Analytics & Campaign Strategy ==========

import { AnalyticsStrategyService } from './services/AnalyticsStrategyService';
const analyticsStrategyService = new AnalyticsStrategyService(reasoningService);

app.get('/analytics/strategy', async (req, res) => {
    try {
        const window = (req.query.window as string) || "7d";
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;
        const result = await analyticsStrategyService.analyzeStrategy(window, startDate, endDate);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/analytics/run-strategy', async (req, res) => {
    try {
        const window = req.body.window || "7d";
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const result = await analyticsStrategyService.analyzeStrategy(window, startDate, endDate);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/leads', async (req, res) => {
    try {
        const leads = await prisma.lead.findMany();
        res.json(leads);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/leads/seed', async (req, res) => {
    try {
        await analyticsStrategyService.seedDemoLeads();
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/campaigns', async (req, res) => {
    try {
        const campaigns = await prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/campaigns/:id', async (req, res) => {
    try {
        const campaign = await prisma.campaign.findUnique({
            where: { id: req.params.id },
            include: { CampaignSimulation: true }
        });
        if (!campaign) return res.status(404).json({ error: 'Not found' });
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/campaigns/draft', async (req, res) => {
    try {
        const { snapshotId, metricsContext, windowStr } = req.body;
        const result = await analyticsStrategyService.generateCampaignDraft(snapshotId, metricsContext, windowStr || "7d");
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/campaigns/:id/simulate', async (req, res) => {
    try {
        const result = await analyticsStrategyService.simulateCampaign(req.params.id);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/campaigns/:id/results', async (req, res) => {
    try {
        const results = await prisma.campaignSimulationResult.findMany({ where: { campaignId: req.params.id } });
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/strategy-logs', async (req, res) => {
    try {
        const logs = await prisma.strategyActionLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
