import { CampaignStrategyOutput } from "./GeminiReasoningService";

export interface SafetyGateResult {
    passed: boolean;
    action: "PASSED" | "MODIFIED" | "BLOCKED";
    modifications: string[];
    blockedReasons: string[];
    validatedStrategy: CampaignStrategyOutput;
}

export class CampaignSafetyGate {
    /**
     * Validates and cleans the Gemini-generated campaign strategy.
     * Enforces all hard business rules and compliance boundaries.
     */
    static validate(strategy: CampaignStrategyOutput, analyticsContext: any): SafetyGateResult {
        const result: SafetyGateResult = {
            passed: true,
            action: "PASSED",
            modifications: [],
            blockedReasons: [],
            validatedStrategy: { ...strategy } // Clone to avoid mutating original
        };

        const strat = result.validatedStrategy;

        // 1. Data Sufficiency Rule
        if (analyticsContext.analysisStatus === "INSUFFICIENT_DATA") {
            if (strat.shouldCreateCampaign && strat.campaignType !== "COLLECT_MORE_DATA") {
                result.passed = false;
                result.action = "BLOCKED";
                result.blockedReasons.push("Cannot launch aggressive campaign with insufficient data. Must wait or run COLLECT_MORE_DATA.");
                return result; // Fast fail
            }
        }

        // 2. Target Segment Rule (Non-negotiable)
        if (strat.targetSegment !== "demo_or_opted_in_leads") {
            strat.targetSegment = "demo_or_opted_in_leads";
            result.action = "MODIFIED";
            result.modifications.push("Forced targetSegment to 'demo_or_opted_in_leads' to prevent unauthorized contact.");
        }

        // 3. Discount Safety Rules
        if (strat.discountPercent > 50) {
            strat.discountPercent = 50;
            result.action = "MODIFIED";
            result.modifications.push("Capped discount at maximum allowed 50%.");
        }

        if (strat.confidence < 0.5 && strat.discountPercent > 10) {
            strat.discountPercent = 10;
            result.action = "MODIFIED";
            result.modifications.push("Capped discount at 10% due to low AI confidence level.");
        }

        // 4. Allowed Channels
        const allowedChannels = ["email", "whatsapp_mock", "in_app"];
        if (!allowedChannels.includes(strat.recommendedChannel)) {
            strat.recommendedChannel = "in_app"; // Safest fallback
            result.action = "MODIFIED";
            result.modifications.push(`Invalid channel '${strategy.recommendedChannel}'. Defaulted to 'in_app'.`);
        }

        // 5. Sanity check: Should create campaign but no products to promote?
        if (strat.shouldCreateCampaign && strat.campaignType !== "COLLECT_MORE_DATA" && !strat.selectedListingId) {
            // We could block it, but if they want to run a general store promo it might be fine.
            // Let's modify it to a general promotion.
            if (strat.campaignType === "DISCOUNT" || strat.campaignType === "PROMOTION") {
                result.action = "MODIFIED";
                result.modifications.push("No listing selected. Assuming general store-wide campaign.");
            } else {
                result.passed = false;
                result.action = "BLOCKED";
                result.blockedReasons.push("Campaign requires a selected listing, but none was provided.");
                return result;
            }
        }

        // 6. Ensure expected impacts are non-negative
        strat.expectedImpact.expectedReach = Math.max(0, strat.expectedImpact.expectedReach);
        strat.expectedImpact.projectedClicks = Math.max(0, strat.expectedImpact.projectedClicks);
        strat.expectedImpact.projectedConversions = Math.max(0, strat.expectedImpact.projectedConversions);
        strat.expectedImpact.projectedRevenue = Math.max(0, strat.expectedImpact.projectedRevenue);
        strat.expectedImpact.projectedProfit = Math.max(0, strat.expectedImpact.projectedProfit);

        // 7. Always append compliance note
        strat.safetyNotes.push("Validated by CampaignSafetyGate: Restricted to demo/opted-in leads only. Execution must be simulated.");

        return result;
    }
}
