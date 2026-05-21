const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

const categories = [
    "Women clothing", "Men clothing", "Kids clothing",
    "Fashion accessories", "Jewelry", "Perfume/fragrance",
    "Beauty accessories", "Household items", "Home organization",
    "Kitchen accessories", "Home decor"
];

// Generate Fallback Trends
const trends = [
    {
        id: "trend-1",
        category: "Home organization",
        keyword: "Clear makeup organizers",
        signal: "High interest among budget shoppers",
        confidence: 0.85,
        evidence: "Mentioned in recent market reports",
        riskLevel: "LOW"
    },
    {
        id: "trend-2",
        category: "Women accessories",
        keyword: "Travel jewelry cases",
        signal: "Gaining attention for summer travel",
        confidence: 0.80,
        evidence: "Social media buzz",
        riskLevel: "LOW"
    },
    {
        id: "trend-3",
        category: "Home organization",
        keyword: "Compact kitchen storage",
        signal: "Demand for small space solutions",
        confidence: 0.75,
        evidence: "Search volume increasing",
        riskLevel: "MEDIUM"
    }
];

fs.writeFileSync(path.join(dataDir, 'fallback-trends.json'), JSON.stringify(trends, null, 2));

// Generate Fallback Products (50+)
const products = [];
let productId = 1;

categories.forEach(category => {
    for (let i = 1; i <= 5; i++) {
        const sourcePrice = parseFloat((Math.random() * 50 + 5).toFixed(2));
        const shippingCost = parseFloat((Math.random() * 10 + 2).toFixed(2));
        
        products.push({
            id: `prod-${productId}`,
            sourceProductId: `src-${productId}`,
            title: `${category} Item ${i}`,
            brand: "Generic Brand",
            category: category,
            sourcePlatform: "Wholesale Supplier",
            sourceUrl: "http://example.com/source",
            imageUrl: "https://via.placeholder.com/150",
            sourcePrice: sourcePrice,
            shippingCost: shippingCost,
            condition: "NEW",
            availability: "IN_STOCK",
            rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
            reviewCount: Math.floor(Math.random() * 100),
            currency: "USD",
            fetchedAt: new Date().toISOString()
        });
        productId++;
    }
});

fs.writeFileSync(path.join(dataDir, 'fallback-source-products.json'), JSON.stringify(products, null, 2));

// Generate Fallback Marketplace Comparisons
const comparisons = [];
let compId = 1;

products.forEach(product => {
    const resalePrice = parseFloat((product.sourcePrice * 2 + Math.random() * 20).toFixed(2));
    
    comparisons.push({
        id: `comp-${compId}`,
        sourceProductId: product.sourceProductId,
        marketplace: "eBay",
        listingTitle: `Resale ${product.title}`,
        listingUrl: "http://example.com/marketplace",
        price: resalePrice,
        shipping: 5.00,
        condition: "NEW",
        soldStatus: "COMPLETED",
        sellerRating: "Top Rated",
        estimatedDemand: "MEDIUM",
        matchScore: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)), // 0.7 to 1.0
        confidence: 0.85
    });
    compId++;
});

fs.writeFileSync(path.join(dataDir, 'fallback-marketplace-comparisons.json'), JSON.stringify(comparisons, null, 2));

// Generate Demo Leads
const leads = [
    { id: "lead-1", name: "John Doe", email: "john@example.com", interest: "Home organization" },
    { id: "lead-2", name: "Jane Smith", email: "jane@example.com", interest: "Fashion accessories" },
    { id: "lead-3", name: "Bob Johnson", email: "bob@example.com", interest: "Kitchen accessories" }
];

fs.writeFileSync(path.join(dataDir, 'demo-leads.json'), JSON.stringify(leads, null, 2));

console.log("Fallback data generated successfully in data/ directory.");
