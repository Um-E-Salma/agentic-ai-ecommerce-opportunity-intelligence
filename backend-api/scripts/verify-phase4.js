// Phase 4 API Verification Script
// Uses Node.js global fetch (v18+)

const API = 'http://localhost:4000';
const results = [];

function log(step, msg) {
    console.log(`[${step}] ${msg}`);
}

function pass(step, msg) {
    results.push({ step, status: 'PASS', msg });
    console.log(`  ✅ PASS: ${msg}`);
}

function fail(step, msg) {
    results.push({ step, status: 'FAIL', msg });
    console.log(`  ❌ FAIL: ${msg}`);
}

async function post(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    return { res, data: await res.json() };
}

async function get(url) {
    const res = await fetch(url);
    return { res, data: await res.json() };
}

async function runVerification() {
    console.log("==========================================");
    console.log("  PHASE 4 API VERIFICATION");
    console.log("==========================================\n");

    let opportunityId, candidateId, demoListingId, optimizationId;
    let originalTitle, originalPrice;

    // 1. Health
    try {
        log("1/18", "Checking /health...");
        const { res } = await get(`${API}/health`);
        if (res.ok) pass("1", "Health check passed");
        else fail("1", `Health returned ${res.status}`);
    } catch (e) { fail("1", `Health unreachable: ${e.message}`); return printReport(); }

    // 2. Analyze input
    try {
        log("2/18", "Analyzing input...");
        const { data } = await post(`${API}/inputs/analyze`, {
            content: "Phase 4 test: home organization clear makeup organizers trending"
        });
        if (data.id) pass("2", `Input created: ${data.id.substring(0,8)}...`);
        else fail("2", "No input ID returned");

        // 3. Run agent workflow
        log("3/18", "Running agent workflow...");
        const { data: runData } = await post(`${API}/agent/run-from-input`, { inputId: data.id });
        if (runData.runId) pass("3", `Agent run: ${runData.runId.substring(0,8)}...`);
        else fail("3", "No runId returned");
    } catch (e) { fail("2-3", `Input/Workflow failed: ${e.message}`); }

    // 4. Fetch opportunities
    try {
        log("4/18", "Fetching opportunities...");
        const { data } = await get(`${API}/opportunities`);
        if (data.length > 0) {
            opportunityId = data[0].id;
            pass("4", `Found ${data.length} opportunities`);
        } else fail("4", "No opportunities found");
    } catch (e) { fail("4", e.message); }

    // 5. Create purchase candidate
    try {
        log("5/18", "Creating purchase candidate...");
        const { data } = await post(`${API}/opportunities/${opportunityId}/create-purchase-candidate`);
        candidateId = data.id;
        if (candidateId) pass("5", `Candidate: ${candidateId.substring(0,8)}...`);
        else fail("5", "No candidate ID");
    } catch (e) { fail("5", e.message); }

    // 6. Approve
    try {
        log("6/18", "Approving candidate...");
        const { res } = await post(`${API}/purchase-candidates/${candidateId}/approve`, { notes: "API test" });
        if (res.ok) pass("6", "Approved");
        else fail("6", `Status ${res.status}`);
    } catch (e) { fail("6", e.message); }

    // 7. Open + Mark purchased
    try {
        log("7/18", "Marking purchased manually...");
        await post(`${API}/purchase-candidates/${candidateId}/opened`);
        const { res } = await post(`${API}/purchase-candidates/${candidateId}/mark-purchased`, { notes: "API test purchase" });
        if (res.ok) pass("7", "Purchased manually");
        else fail("7", `Status ${res.status}`);
    } catch (e) { fail("7", e.message); }

    // 8. Generate listing recommendation
    try {
        log("8/18", "Generating listing recommendation...");
        const { data } = await post(`${API}/listings/recommend-candidate/${candidateId}`);
        if (data.title) pass("8", `Recommendation: "${data.title.substring(0,40)}..."`);
        else fail("8", "No recommendation title");

        // 9. Create demo listing
        log("9/18", "Creating demo listing (mock)...");
        const { data: listing } = await post(`${API}/listings/create`, {
            candidateId,
            platform: "mock",
            title: data.title,
            description: data.description || "Test description",
            price: data.recommendedPrice || 25.00,
            tags: data.tags || '["test"]',
            category: "General"
        });
        demoListingId = listing.id;
        originalTitle = listing.title;
        originalPrice = listing.recommendedPrice;
        if (demoListingId) pass("9", `Demo listing: ${demoListingId.substring(0,8)}... title="${originalTitle}"`);
        else fail("9", "No listing ID");
    } catch (e) { fail("8-9", e.message); }

    // 10. Optimize demo listing
    try {
        log("10/18", "Optimizing demo listing...");
        const { data } = await post(`${API}/listings/${demoListingId}/optimize`);
        optimizationId = data.id;
        if (optimizationId) {
            pass("10", `Optimization created. Score: ${data.oldQualityScore} → ${data.newQualityScore}`);
        } else fail("10", "No optimization ID");
    } catch (e) { fail("10", e.message); }

    // 11. Fetch pricing options
    let pricingData = [];
    try {
        log("11/18", "Fetching pricing options...");
        const { data } = await get(`${API}/listings/${demoListingId}/pricing-options`);
        pricingData = data;
        if (data.length > 0) pass("11", `${data.length} pricing options returned`);
        else fail("11", "No pricing options");
    } catch (e) { fail("11", e.message); }

    // 12. Confirm strategies
    try {
        log("12/18", "Checking strategies: Aggressive, Balanced, Premium...");
        const strategies = pricingData.map(p => p.strategy);
        const hasAll = strategies.includes("AGGRESSIVE") && strategies.includes("BALANCED") && strategies.includes("PREMIUM");
        if (hasAll) pass("12", `All 3 strategies found: ${strategies.join(", ")}`);
        else fail("12", `Missing strategies. Found: ${strategies.join(", ")}`);
    } catch (e) { fail("12", e.message); }

    // 13. Confirm Balanced exists with valid data
    try {
        log("13/18", "Confirming Balanced strategy has valid data...");
        const balanced = pricingData.find(p => p.strategy === "BALANCED");
        if (balanced && balanced.price > 0 && balanced.riskLevel === "LOW") {
            pass("13", `Balanced: $${balanced.price.toFixed(2)}, ROI: ${balanced.roiPercent.toFixed(1)}%, Risk: ${balanced.riskLevel}`);
        } else fail("13", "Balanced strategy missing or invalid");
    } catch (e) { fail("13", e.message); }

    // 14. Apply optimization with Balanced
    try {
        log("14/18", "Applying optimization with BALANCED pricing...");
        const { res } = await post(`${API}/listings/${demoListingId}/apply-optimization`, {
            optimizationId,
            selectedPricingStrategy: "BALANCED"
        });
        if (res.ok) pass("14", "Optimization applied");
        else fail("14", `Status ${res.status}`);
    } catch (e) { fail("14", e.message); }

    // 15. Confirm listing changed
    try {
        log("15/18", "Verifying listing was updated...");
        const { data } = await get(`${API}/listings`);
        const updated = data.find(l => l.id === demoListingId);
        if (!updated) { fail("15", "Listing not found"); }
        else if (updated.title !== originalTitle) {
            pass("15", `Title changed: "${originalTitle}" → "${updated.title}"`);
        } else fail("15", "Title did NOT change after apply");
    } catch (e) { fail("15", e.message); }

    // 16. Revert optimization
    try {
        log("16/18", "Reverting optimization...");
        const { res } = await post(`${API}/listings/${demoListingId}/revert-optimization`, { optimizationId });
        if (res.ok) pass("16", "Revert succeeded");
        else fail("16", `Status ${res.status}`);
    } catch (e) { fail("16", e.message); }

    // 17. Confirm original restored
    try {
        log("17/18", "Verifying original content restored...");
        const { data } = await get(`${API}/listings`);
        const reverted = data.find(l => l.id === demoListingId);
        if (!reverted) { fail("17", "Listing not found"); }
        else if (reverted.title === originalTitle) {
            pass("17", `Title restored: "${reverted.title}"`);
        } else fail("17", `Title mismatch: expected "${originalTitle}", got "${reverted.title}"`);
    } catch (e) { fail("17", e.message); }

    // 18. Check trace logs (Phase 4 logs go to ListingActionLog)
    try {
        log("18/18", "Checking Phase 4 action logs...");
        const { res, data } = await get(`${API}/listings/${demoListingId}/optimizations`);
        if (!res.ok) throw new Error(`Optimizations endpoint returned ${res.status}`);
        if (data.length > 0) {
            const statuses = data.map(o => o.status);
            pass("18", `Found ${data.length} optimization records with statuses: ${statuses.join(", ")}`);
        } else fail("18", "No optimization records found");
    } catch (e) { fail("18", e.message); }

    printReport();
}

function printReport() {
    console.log("\n==========================================");
    console.log("  VERIFICATION REPORT");
    console.log("==========================================\n");

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} [${r.step}] ${r.msg}`);
    });

    console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`  Result: ${failed === 0 ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
    console.log("==========================================\n");

    process.exit(failed > 0 ? 1 : 0);
}

runVerification().catch(e => {
    console.error("Fatal error:", e);
    process.exit(1);
});
