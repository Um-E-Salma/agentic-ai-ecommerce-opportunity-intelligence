import fetch from 'node-fetch';

const API = 'http://localhost:4000';

async function runTest() {
    console.log("==========================================");
    console.log("🚀 STARTING PHASE 4 API VERIFICATION");
    console.log("==========================================\n");

    try {
        // 1. Health check
        console.log("[1/18] Checking /health...");
        const healthRes = await fetch(`${API}/health`);
        if (!healthRes.ok) throw new Error("Health check failed");
        console.log("✅ API is healthy");

        // 2. Create/analyze input
        console.log("[2/18] Analyzing input...");
        const inputRes = await fetch(`${API}/inputs/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: "Testing Phase 4 home organization clear makeup organizers" })
        });
        const inputData = await inputRes.json();
        if (!inputData.id) throw new Error("Input analysis failed");
        console.log("✅ Input analyzed");

        // 3. Run agent workflow
        console.log("[3/18] Running Agent Workflow...");
        const runRes = await fetch(`${API}/agent/run-from-input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputId: inputData.id, mockOverrides: { opportunitiesToGenerate: 1 } })
        });
        const runData = await runRes.json();
        if (!runData.runId) throw new Error("Agent workflow failed");
        console.log("✅ Agent workflow complete");

        // 4. Fetch opportunities
        console.log("[4/18] Fetching opportunities...");
        const oppsRes = await fetch(`${API}/opportunities`);
        const opportunities = await oppsRes.json();
        const opportunity = opportunities[0];
        if (!opportunity) throw new Error("No opportunities generated");
        console.log(`✅ Found opportunity: ${opportunity.title}`);

        // 5. Create purchase candidate
        console.log("[5/18] Creating purchase candidate...");
        const pcRes = await fetch(`${API}/opportunities/${opportunity.id}/create-purchase-candidate`, { method: 'POST' });
        const pcData = await pcRes.json();
        if (!pcData.id) throw new Error("Failed to create purchase candidate");
        console.log("✅ Purchase candidate created");

        // 6. Approve candidate
        console.log("[6/18] Approving candidate...");
        await fetch(`${API}/purchase-candidates/${pcData.id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: "API Test Approve" }) });
        console.log("✅ Candidate approved");

        // 7. Mark candidate purchased manually
        console.log("[7/18] Opening source and Marking purchased manually...");
        await fetch(`${API}/purchase-candidates/${pcData.id}/opened`, { method: 'POST' });
        await fetch(`${API}/purchase-candidates/${pcData.id}/mark-purchased`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: "API Test Purchase" }) });
        console.log("✅ Candidate marked as purchased manually");

        // 8. Generate listing recommendation
        console.log("[8/18] Generating listing recommendation...");
        const recRes = await fetch(`${API}/listings/recommend-candidate/${pcData.id}`, { method: 'POST' });
        const recData = await recRes.json();
        if (!recData.title) throw new Error("Failed to generate listing recommendation");
        console.log("✅ Listing recommendation generated");

        // 9. Create demo listing using mock platform
        console.log("[9/18] Creating demo listing using mock platform...");
        const listingRes = await fetch(`${API}/listings/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                candidateId: pcData.id,
                platform: "mock",
                title: recData.title,
                description: recData.description,
                price: recData.recommendedPrice,
                tags: recData.tags,
                category: "General"
            })
        });
        const listingData = await listingRes.json();
        if (!listingData.id) throw new Error("Failed to create demo listing");
        const demoListingId = listingData.id;
        console.log(`✅ Demo listing created with ID: ${demoListingId}`);

        // 10. Optimize demo listing
        console.log("[10/18] Optimizing demo listing...");
        const optRes = await fetch(`${API}/listings/${demoListingId}/optimize`, { method: 'POST' });
        const optData = await optRes.json();
        if (!optData.id) throw new Error("Optimization failed");
        const optimizationId = optData.id;
        console.log(`✅ Listing optimized (old score: ${optData.oldQualityScore}, new score: ${optData.newQualityScore})`);

        // 11. Fetch pricing options
        console.log("[11/18] Fetching pricing options...");
        const pricingRes = await fetch(`${API}/listings/${demoListingId}/pricing-options`);
        const pricingData = await pricingRes.json();
        if (!pricingData || pricingData.length === 0) throw new Error("Failed to fetch pricing options");
        
        // 12. Confirm pricing options include Aggressive, Balanced, Premium
        console.log("[12/18] Confirming pricing options content...");
        const strategies = pricingData.map((p: any) => p.strategy);
        if (!strategies.includes("AGGRESSIVE") || !strategies.includes("BALANCED") || !strategies.includes("PREMIUM")) {
            throw new Error(`Missing pricing strategies. Found: ${strategies}`);
        }
        console.log("✅ Found Aggressive, Balanced, and Premium strategies");

        // 13. Confirm Balanced is present
        console.log("[13/18] Confirming Balanced strategy exists...");
        const balancedStrategy = pricingData.find((p: any) => p.strategy === "BALANCED");
        if (!balancedStrategy) throw new Error("Balanced strategy missing");
        console.log("✅ Balanced strategy confirmed");

        // 14. Apply optimization with Balanced tier
        console.log("[14/18] Applying optimization with Balanced tier...");
        const originalListingRes = await fetch(`${API}/listings`);
        const allListings = await originalListingRes.json();
        const originalListing = allListings.find((l: any) => l.id === demoListingId);
        
        await fetch(`${API}/listings/${demoListingId}/apply-optimization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optimizationId: optimizationId, selectedPricingStrategy: "BALANCED" })
        });
        console.log("✅ Optimization applied");

        // 15. Fetch listing and confirm changes
        console.log("[15/18] Verifying listing changes...");
        const updatedListingsRes = await fetch(`${API}/listings`);
        const updatedListings = await updatedListingsRes.json();
        const updatedListing = updatedListings.find((l: any) => l.id === demoListingId);
        
        if (updatedListing.title === originalListing.title) throw new Error("Title did not change after optimization");
        console.log("✅ Listing title/description successfully updated");

        // 16. Revert optimization
        console.log("[16/18] Reverting optimization...");
        await fetch(`${API}/listings/${demoListingId}/revert-optimization`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optimizationId: optimizationId })
        });
        console.log("✅ Optimization reverted");

        // 17. Confirm original content restored
        console.log("[17/18] Verifying content restored...");
        const revertedListingsRes = await fetch(`${API}/listings`);
        const revertedListings = await revertedListingsRes.json();
        const revertedListing = revertedListings.find((l: any) => l.id === demoListingId);
        
        if (revertedListing.title !== originalListing.title) {
            throw new Error("Title was not restored correctly");
        }
        console.log("✅ Original content successfully restored");

        // 18. Fetch trace/logs
        console.log("[18/18] Verifying Agent Trace Logs...");
        const logsRes = await fetch(`${API}/analytics/trace-logs`);
        const logsData = await logsRes.json();
        const optLogs = logsData.filter((log: any) => log.agentName === "ListingOptimizationAgent");
        if (optLogs.length === 0) throw new Error("Phase 4 trace logs not found");
        console.log("✅ Trace logs confirmed for optimization actions");

        console.log("\n==========================================");
        console.log("🎉 ALL TESTS PASSED! Phase 4 is verified.");
        console.log("==========================================");

    } catch (error: any) {
        console.error("\n❌ API VERIFICATION FAILED!");
        console.error("Error Details:", error.message);
        process.exit(1);
    }
}

runTest();
