$ErrorActionPreference = "Stop"
$API = "http://localhost:4000"

try {
    # 1. Create Input
    $inputBody = @{ content = "Testing Pokemon cards trend"; urls = @("https://hareruya.com") } | ConvertTo-Json
    $inputRes = Invoke-RestMethod -Method Post -Uri "$API/inputs/analyze" -Body $inputBody -ContentType "application/json"
    $inputId = $inputRes.id
    Write-Output "Created Input: $inputId"

    # 2. Run Workflow
    $runBody = @{ inputId = $inputId } | ConvertTo-Json
    $runRes = Invoke-RestMethod -Method Post -Uri "$API/agent/run-from-input" -Body $runBody -ContentType "application/json"
    Write-Output "Workflow Run completed."

    # 3. Get Opportunities
    $opps = Invoke-RestMethod -Method Get -Uri "$API/opportunities"
    $firstOpp = $opps[0]
    $oppId = $firstOpp.id
    Write-Output "Found Opportunity: $oppId"

    # 4. Create Purchase Candidate
    $candRes = Invoke-RestMethod -Method Post -Uri "$API/opportunities/$oppId/create-purchase-candidate"
    $candId = $candRes.id
    Write-Output "Created Purchase Candidate: $candId"

    # 5. Approve & Mark Purchased
    Invoke-RestMethod -Method Post -Uri "$API/purchase-candidates/$candId/approve" -Body "{}" -ContentType "application/json" | Out-Null
    Invoke-RestMethod -Method Post -Uri "$API/purchase-candidates/$candId/opened" -Body "{}" -ContentType "application/json" | Out-Null
    Invoke-RestMethod -Method Post -Uri "$API/purchase-candidates/$candId/mark-purchased" -Body "{}" -ContentType "application/json" | Out-Null
    Write-Output "Candidate Approved & Purchased"

    # 6. Generate Listing Recommendation
    $recRes = Invoke-RestMethod -Method Post -Uri "$API/listings/recommend-candidate/$candId" -Body "{}" -ContentType "application/json"
    $recId = $recRes.id
    Write-Output "Generated Listing Recommendation: $recId"
    Write-Output "Listing Title: $($recRes.title)"

    # 7. Create Demo Listing (Mock)
    $createBody = @{
        candidateId = $candId
        platform = "mock"
        title = $recRes.title
        description = $recRes.description
        price = $recRes.recommendedPrice
        tags = $recRes.tags
        category = "Test"
    } | ConvertTo-Json
    $listingRes = Invoke-RestMethod -Method Post -Uri "$API/listings/create" -Body $createBody -ContentType "application/json"
    $listingId = $listingRes.id
    Write-Output "Created Demo Listing: $listingId, Status: $($listingRes.status)"

    # 8. Check Dashboard Stats
    $dashRes = Invoke-RestMethod -Method Get -Uri "$API/analytics/dashboard"
    Write-Output "Dashboard Demo Listings: $($dashRes.stats.totalDemoListings)"
    Write-Output "Dashboard Mock Records: $($dashRes.stats.totalMockListings)"

    Write-Output "SUCCESS: All Phase 3 APIs working properly."

} catch {
    Write-Error "Test failed: $_"
}
