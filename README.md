# Agentic AI E-Commerce Opportunity Intelligence

Agentic AI E-Commerce Opportunity Intelligence is a mobile-first Agentic AI prototype that transforms unstructured e-commerce trend information into actionable business outcomes.

The system does not stop at summarization. It understands messy input, extracts opportunity signals, searches product data sources, calculates resale profitability, recommends actions, simulates execution, and shows the resulting system state through dashboards, trace logs, notifications, purchase approvals, demo listings, and campaign simulation.

---

## Challenge Alignment

This project was built for an Agentic AI challenge where the system must demonstrate:

1. Content understanding  
2. Insight extraction  
3. Impact analysis  
4. Recommended actions  
5. Action simulation  
6. Outcome visualization  
7. Traceable agentic workflow  
8. Mobile app prototype  

This project satisfies those requirements through an end-to-end e-commerce opportunity intelligence workflow:

```text
Unstructured Input
    ↓
Research Insight Agent
    ↓
Purchase Decision Agent
    ↓
Profit Calculator
    ↓
Product Opportunity Records
    ↓
Notifications + Purchase Candidate
    ↓
Manual Purchase Approval
    ↓
Draft Listing + Demo Listing
    ↓
Listing Optimization
    ↓
Analytics Strategy + Campaign Simulation
    ↓
Dashboard + Trace Logs
````

---

## Problem Statement

E-commerce arbitrage and trend spotting are usually manual, slow, and risky.

A seller may read a trend report, search supplier products, compare resale prices, calculate marketplace fees, estimate profit, draft listings, notify the team, and plan a campaign manually.

This project automates that workflow safely.

The system can take messy market text such as:

```text
This week, home organization products and women accessories are showing high interest among budget shoppers. Clear makeup organizers are gaining attention.
```

Then it identifies product signals, searches connected or fallback data sources, calculates profitability, filters out weak opportunities, and moves profitable products into simulated action pipelines.

---

## Current Integration Scope

The final working demo focuses on Shopify.

Shopify is used as the primary configured commerce platform for product data, listing workflow, and resale opportunity demonstration.

The codebase may include adapters or placeholders for eBay, WooCommerce, mock platforms, and fallback data sources. These are included to show extensibility of the architecture, but they are not the primary configured path for the final demo.

The final demo should be evaluated as a Shopify-focused Agentic AI e-commerce workflow.

---

## Key Features

### 1. Unstructured Input Processing

Users can paste unstructured business, trend, or product-related text into the mobile app.

The backend stores the input and starts an agent workflow.

Supported input style:

* market trend text
* product demand notes
* business reports
* e-commerce opportunity text
* manually pasted article/report snippets

---

### 2. Multi-Agent Workflow

The system uses a structured multi-agent workflow.

Main agents:

| Agent                    | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `ResearchInsightAgent`   | Extracts structured trend and product signals from unstructured text |
| `PurchaseDecisionAgent`  | Searches products and evaluates resale opportunities                 |
| `ResaleListingAgent`     | Generates listing recommendations for profitable products            |
| `AnalyticsCampaignAgent` | Summarizes results and supports campaign strategy analysis           |

The workflow is orchestrated by:

```text
backend-api/src/services/AgentOrchestratorService.ts
```

---

### 3. Profit-Gated Decision Making

The system does not rely only on AI-generated opinions.

It uses deterministic calculations for:

* source price
* shipping cost
* marketplace fees
* estimated resale price
* net profit
* ROI percentage
* margin percentage
* profit gate pass/fail

If the opportunity does not meet profitability requirements, it is skipped or marked for review.

This prevents the system from hallucinating financial decisions.

---

### 4. Product Opportunity Detection

When a product passes the profit gate, the system stores it as a product opportunity.

Each opportunity can include:

* product title
* category
* source price
* shipping cost
* estimated selling price
* marketplace
* net profit
* ROI percentage
* margin percentage
* AI decision
* risk level
* recommended action
* warnings
* traceable reasoning logs

---

### 5. Notifications

Profitable opportunities can be dispatched through simulated or configured channels.

Supported notification-style channels include:

* Telegram mock
* Email (Real)
* WhatsApp mock

This demonstrates that the agent does not only analyze information, but also triggers an action.

---

### 6. Human-in-the-Loop Purchase Approval

Financial actions are kept safe.

The system can move a profitable opportunity into a purchase approval pipeline, but the actual buying decision remains human-controlled.

Purchase candidate states may include:

* new candidate
* approved to buy
* manually purchased
* rejected

This keeps the prototype realistic and safe.

---

### 7. Shopify Listing Execution

After a purchase candidate is approved or marked as purchased, the system can prepare a resale listing and create/update the listing flow through the Shopify integration.

The current working prototype is configured around Shopify for product data, listing preparation, and resale workflow demonstration.

Other platform adapters such as eBay, WooCommerce, and mock listing adapters are present as extensibility concepts or future integration points, but the final demo focuses on the Shopify-based workflow.

This keeps the prototype focused, realistic, and easier to verify during judging.

---

### 8. Listing Optimization

The system can optimize draft listings using a quality scoring approach.

Optimization includes:

* SEO-friendly title rewrite
* richer description
* better tags
* pricing strategy generation
* before/after comparison
* non-destructive apply/revert flow

Pricing strategy options include:

| Strategy   | Meaning                                         |
| ---------- | ----------------------------------------------- |
| Aggressive | Lower price, faster sale, higher risk           |
| Balanced   | Recommended default strategy                    |
| Premium    | Higher price, slower sale, higher profit target |

The system logs optimization, apply, revert, and pricing actions for auditability.

---

### 9. Analytics and Campaign Strategy

The project includes an analytics strategy phase.

The system can calculate a business health score based on:

* ROI
* conversion rates
* listing quality
* trend status
* opportunity performance

It can also generate a campaign draft and simulate campaign execution.

Campaign safety controls include:

* opted-in or demo audience only
* discount caps
* restricted execution channels
* mock campaign simulation
* no real spam
* no real ad spend

Campaign simulation may project:

* reach
* clicks
* revenue
* profit
* campaign status

---

## Safety Principles

This prototype intentionally uses safety boundaries:

* No real automated purchases
* No production listings unless explicitly configured
* No real spam or mass messaging
* Human approval for financial decisions
* Shopify-focused demo execution with safe prototype boundaries
* Other marketplace adapters are treated as future/sandbox extension points
* Deterministic profit and safety checks
* Trace logs for auditability
* Fallback AI mode when real Gemini is unavailable or quota-limited

---

## Architecture Overview

```text
Mobile App
  |
  | User submits unstructured trend/report text
  v
Backend API - Express + TypeScript
  |
  | Stores input and triggers workflow
  v
AgentOrchestratorService
  |
  | Coordinates agents and logs trace
  v
Specialized Agents
  |
  | ResearchInsightAgent
  | PurchaseDecisionAgent
  | ResaleListingAgent
  | AnalyticsCampaignAgent
  v
Services and Adapters
  |
  | GeminiReasoningService
  | DataSourceManager
  | ProfitCalculatorService
  | NotificationService
  | ListingService
  | AnalyticsStrategyService
  | CampaignSafetyGate
  v
Prisma Database
  |
  | Inputs
  | Agent runs
  | Trace logs
  | Product opportunities
  | Purchase candidates
  | Notification drafts
  | Demo listings
  | Campaigns
  | Simulations
  v
Dashboard / Mobile UI
```

---

## Project Structure

```text
## Project Structure

Main project structure:

```text
Agentic_E-Commerce/
  CURRENT_STATUS.md
  implementation_plan-phase2
  README.md
  project-structure.txt

  backend-api/
    .env.example
    .gitignore
    package-lock.json
    package.json
    prisma.config.ts
    test_phase3.ps1
    tsconfig.json

    data/
      fallback-marketplace-comparisons.json
      fallback-source-products.json
      fallback-trends.json

    prisma/
      schema.prisma

    src/
      adapters/
        DataSourceAdapter.ts
        DataSourceManager.ts
        EbayApiAdapterPlaceholder.ts
        EbaySandboxAdapter.ts
        ListingPlatformAdapter.ts
        MockFallbackAdapter.ts
        MockListingAdapter.ts
        RealEbayScraperAdapter.ts
        RealShopifyScraperAdapter.ts
        SafeUrlContentAdapter.ts
        ShopifyDataSourceAdapter.ts
        ShopifyDevAdapter.ts
        WooCommerceTestAdapter.ts

      agents/
        AnalyticsCampaignAgent.ts
        PurchaseDecisionAgent.ts
        ResaleListingAgent.ts
        ResearchInsightAgent.ts

      services/
        AgentOrchestratorService.ts
        AnalyticsStrategyService.ts
        CampaignSafetyGate.ts
        EmailService.ts
        GeminiReasoningService.ts
        ListingOptimizationService.ts
        ListingService.ts
        NotificationService.ts
        PlatformService.ts
        ProfitCalculatorService.ts
        RealGeminiReasoningService.ts
        ShopifyProductMatchingService.ts
        TelegramService.ts
        WhatsAppMockService.ts

      index.ts

  mobile-app/
    App.tsx
    package.json
```

Important backend areas:

```text
backend-api/src/index.ts
```

Main Express API entry point.

```text
backend-api/src/services/AgentOrchestratorService.ts
```

Main agent workflow orchestration service.

```text
backend-api/src/agents/
```

Contains the specialized agents.

```text
backend-api/src/services/
```

Contains services for reasoning, listing, notification, analytics, optimization, campaign safety, and profit calculation.

```text
backend-api/src/adapters/
```

Contains platform/data adapters. The current configured demo path focuses on Shopify, while eBay, WooCommerce, mock, scraper, and fallback adapters represent extensibility or non-primary prototype paths.

```text
backend-api/prisma/
```

Database schema and Prisma configuration.

---

## Technology Stack

### Core

* TypeScript
* Node.js
* Express.js
* Prisma ORM
* SQLite for local prototype database
* React Native / Expo mobile app

### AI / Reasoning

* Google Gemini
* Mock Gemini fallback service
* Quota-aware fallback handling

### Agentic Workflow

* Google Antigravity used as the core development platform
* Multi-agent orchestration
* Structured reasoning steps
* Tool/API integration
* Traceable execution logs

### Simulation / Integrations

* Shopify product/data workflow
* Shopify-based listing preparation
* Shopify-focused resale opportunity flow
* Mock WhatsApp campaign simulation
* Email / Telegram / WhatsApp-style notification flow
* eBay and WooCommerce adapter concepts are included for future extensibility but are not the primary configured demo path

---

## How Google Antigravity Was Used

Google Antigravity was used as the central development environment for this project.

It was used to:

* plan the agentic workflow
* implement the orchestrator
* build and update backend TypeScript services
* debug TypeScript build errors
* manage reasoning and execution flow
* create agent/action simulation features
* integrate Gemini reasoning
* design safe Shopify-focused execution paths with future extensibility for other marketplace adapters
* prepare the project for GitHub and deployment
* generate traceable development steps

The project demonstrates Antigravity as more than a code editor. It is used as the core environment for planning, implementing, testing, and refining the agentic workflow.

---

## Main Backend API Endpoints

### Health Check

```http
GET /health
```

Checks if backend is running.

---

### Create Unstructured Input

```http
POST /inputs/analyze
```

Example body:

```json
{
  "content": "This week, home organization products and women accessories are showing high interest among budget shoppers. Clear makeup organizers are gaining attention.",
  "urls": []
}
```

---

### Run Agent Workflow

```http
POST /agent/run-from-input
```

Example body:

```json
{
  "inputId": "INPUT_ID_HERE"
}
```

---

### Get Agent Runs

```http
GET /agent/runs
```

---

### Get Agent Trace Logs

```http
GET /agent/trace/:runId
```

---

### Get Opportunities

```http
GET /opportunities
```

---

### Get Dashboard Analytics

```http
GET /analytics/dashboard
```

---

### Notification Status

```http
GET /notifications/status
```

---

### Purchase Approval Actions

```http
ALL /opportunities/:id/want-to-buy
ALL /opportunities/:id/dont-want-to-buy
```

These endpoints support browser redirect behavior when opened from notification/email links.

---

### Platform Status

```http
GET /platforms/status
```

---

### Analytics Strategy

```http
GET /analytics/strategy
POST /analytics/run-strategy
```

---

### Campaign Draft and Simulation

```http
POST /campaigns/draft
POST /campaigns/:id/simulate
```

---

## Environment Variables

Create this file:

```text
backend-api/.env
```

Use this structure:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_gemini_api_key_here"
USE_MOCK_AI="false"
PORT=4000
NODE_ENV="development"
```

For safe sharing, use:

```text
backend-api/.env.example
```


---

## Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Um-E-Salma/agentic-ai-ecommerce-opportunity-intelligence.git
cd agentic-ai-ecommerce-opportunity-intelligence
```

---

### 2. Install Backend Dependencies

```bash
cd backend-api
npm install
```

---

### 3. Setup Environment Variables

Create:

```text
backend-api/.env
```

Example:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_gemini_api_key_here"
USE_MOCK_AI="false"
PORT=4000
NODE_ENV="development"
```

To run without Gemini API key, use mock mode:

```env
USE_MOCK_AI="true"
```

---

### 4. Generate Prisma Client

```bash
npx prisma generate
```

---

### 5. Run Database Migration / Push

For local prototype:

```bash
npx prisma db push
```

---

### 6. Build Backend

```bash
npm run build
```

---

### 7. Start Backend

```bash
npm start
```

Expected output:

```text
Server is running on port 4000
```

---

## Mobile App Setup

Go to the mobile app folder:

```bash
cd mobile-app
npm install
npm start
```

Use Expo Go or emulator to open the mobile app.

If testing on a physical phone, replace backend URL from:

```text
http://localhost:4000
```

to your computer's local network IP, for example:

```text
http://192.168.1.10:4000
```

---

