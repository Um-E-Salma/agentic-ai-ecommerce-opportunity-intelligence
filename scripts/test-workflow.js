const sampleInput = "This week, home organization products and women accessories are showing high interest among budget shoppers. Clear makeup organizers, travel jewelry cases, compact kitchen storage products, and small household items are gaining attention. Shipping costs are stable, but marketplace platform fees reduce profit margins. Businesses should focus on lightweight, low-risk items with strong resale price gaps.";

async function runTest() {
    console.log("Starting backend workflow test...");

    // 1. Create Input
    console.log("\n1. Creating Input...");
    const createRes = await fetch('http://localhost:4000/inputs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sampleInput })
    });
    
    if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Failed to create input. Status:", createRes.status, "Error:", errText);
        return;
    }
    
    const input = await createRes.json();
    console.log("Input created:", input);

    // 2. Run Agent Workflow
    console.log("\n2. Running Agent Workflow...");
    const runRes = await fetch('http://localhost:4000/agent/run-from-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputId: input.id })
    });

    if (!runRes.ok) {
        console.error("Failed to run agent workflow");
        return;
    }

    const result = await runRes.json();
    console.log("Workflow result:", JSON.stringify(result, null, 2));

    // 3. Fetch Trace Logs
    console.log("\n3. Fetching Trace Logs...");
    const traceRes = await fetch(`http://localhost:4000/agent/trace/${result.runId}`);
    const traceLogs = await traceRes.json();
    console.log("Trace Logs:", traceLogs);
}

runTest();
