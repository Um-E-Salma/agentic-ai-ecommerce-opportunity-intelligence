export interface ProfitCalculatorInput {
    sourcePrice: number;
    sourceShipping: number;
    estimatedSellingPrice: number;
    marketplaceFeePercent?: number;
    paymentFeePercent?: number;
    fixedTransactionFee?: number;
    packagingCost?: number;
    estimatedShippingToBuyer?: number;
    returnReserve?: number;
    matchScore?: number;
    riskLevel?: string;
}

export interface ProfitCalculatorOutput {
    totalCost: number;
    totalFees: number;
    netProfit: number;
    roiPercent: number;
    marginPercent: number;
    profitGate: "PASS" | "REVIEW" | "FAIL";
    decision: "STRONG_CANDIDATE" | "REVIEW" | "SKIP";
}

export class ProfitCalculatorService {
    private static DEFAULTS = {
        marketplaceFeePercent: 13.25,
        paymentFeePercent: 2.9,
        fixedTransactionFee: 0.30,
        packagingCost: 1.00,
        estimatedShippingToBuyer: 5.00,
        returnReserve: 2.00,
        minRoiForReview: 5,
        minRoiForStrongCandidate: 20,
        minNetProfit: 5,
        minMatchScore: 0.75
    };

    static calculate(input: ProfitCalculatorInput): ProfitCalculatorOutput {
        const marketplaceFeePercent = input.marketplaceFeePercent ?? this.DEFAULTS.marketplaceFeePercent;
        const paymentFeePercent = input.paymentFeePercent ?? this.DEFAULTS.paymentFeePercent;
        const fixedTransactionFee = input.fixedTransactionFee ?? this.DEFAULTS.fixedTransactionFee;
        const packagingCost = input.packagingCost ?? this.DEFAULTS.packagingCost;
        const estimatedShippingToBuyer = input.estimatedShippingToBuyer ?? this.DEFAULTS.estimatedShippingToBuyer;
        const returnReserve = input.returnReserve ?? this.DEFAULTS.returnReserve;

        const totalCost = input.sourcePrice + input.sourceShipping + packagingCost + estimatedShippingToBuyer + returnReserve;
        
        const marketplaceFee = input.estimatedSellingPrice * (marketplaceFeePercent / 100);
        const paymentFee = input.estimatedSellingPrice * (paymentFeePercent / 100) + fixedTransactionFee;
        const totalFees = marketplaceFee + paymentFee;
        
        const netProfit = input.estimatedSellingPrice - totalCost - totalFees;
        const roiPercent = (netProfit / totalCost) * 100;
        const marginPercent = (netProfit / input.estimatedSellingPrice) * 100;

        // Determine profit gate
        let profitGate: "PASS" | "REVIEW" | "FAIL" = "FAIL";
        if (roiPercent >= this.DEFAULTS.minRoiForStrongCandidate && netProfit >= this.DEFAULTS.minNetProfit) {
            profitGate = "PASS";
        } else if (roiPercent >= this.DEFAULTS.minRoiForReview) {
            profitGate = "REVIEW";
        }

        // Determine decision
        let decision: "STRONG_CANDIDATE" | "REVIEW" | "SKIP" = "SKIP";
        
        if (profitGate === "PASS") {
            decision = "STRONG_CANDIDATE";
        } else if (profitGate === "REVIEW") {
            decision = "REVIEW";
        }

        // Override based on match score
        if (input.matchScore !== undefined && input.matchScore < this.DEFAULTS.minMatchScore) {
            if (decision === "STRONG_CANDIDATE") {
                decision = "REVIEW";
            }
        }

        // Override based on risk
        if (input.riskLevel === "HIGH") {
            if (decision === "STRONG_CANDIDATE") {
                decision = "REVIEW";
            }
        }

        return {
            totalCost: parseFloat(totalCost.toFixed(2)),
            totalFees: parseFloat(totalFees.toFixed(2)),
            netProfit: parseFloat(netProfit.toFixed(2)),
            roiPercent: parseFloat(roiPercent.toFixed(2)),
            marginPercent: parseFloat(marginPercent.toFixed(2)),
            profitGate,
            decision
        };
    }
}
