import OpenAI from "openai";

// Create AI client using OpenAI API
function getAIClient(): OpenAI {
  // Prioritize user's direct OpenAI key, fall back to Replit AI Integrations
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  // When using direct OpenAI key, don't use any base URL (connect to OpenAI directly)
  const baseURL = process.env.OPENAI_API_KEY ? undefined : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL);
  
  console.log('[AI Client] Using direct OpenAI:', !!process.env.OPENAI_API_KEY);
  console.log('[AI Client] API key present:', !!apiKey);
  
  if (!apiKey) {
    throw new Error("No OpenAI API key found. Please set OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY environment variable.");
  }
  
  return new OpenAI({
    apiKey,
    baseURL,
  });
}

interface IdeaInput {
  title: string;
  problem: string;
  solution?: string;
  targetUser?: string;
  whyNow?: string;
}

interface BusinessPlanSections {
  executiveSummary: string;
  founderFit: string;
  competitiveLandscape: string;
  riskMoat: string;
  mvpDesign: string;
  teamTalent: string;
  launchPlan: string;
  schoolAdvantage: string;
  fundingPitch: string;
}

interface SectionPrompt {
  key: keyof BusinessPlanSections;
  title: string;
  prompt: string;
}

function buildSectionPrompts(idea: IdeaInput): SectionPrompt[] {
  const ideaContext = `
STARTUP IDEA:
Title: ${idea.title}
Problem: ${idea.problem}
${idea.solution ? `Solution: ${idea.solution}` : "Solution: To be defined based on problem analysis"}
${idea.targetUser ? `Target Users: ${idea.targetUser}` : "Target Users: To be identified"}
${idea.whyNow ? `Why Now: ${idea.whyNow}` : ""}
`.trim();

  const businessTypeContext = `
BUSINESS TYPE DETECTION:
First, analyze the startup idea and classify it into ONE of these categories:
- TECH/APP: Software products, mobile apps, SaaS platforms, digital marketplaces
- F&B (Food & Beverage): Restaurants, food products, beverages, catering, meal delivery, food manufacturing
- FASHION/RETAIL: Clothing, accessories, physical retail, e-commerce for physical goods
- SERVICE: Consulting, tutoring, cleaning, events, professional services, freelancing
- HARDWARE/MANUFACTURING: Physical devices, electronics, manufacturing, IoT products
- HYBRID: Combination (e.g., tech-enabled F&B, fashion with app)

Use the detected business type to tailor ALL recommendations appropriately. Do NOT default to tech/app assumptions.
`;

  const outputRules = `

CRITICAL OUTPUT RULES:
1. DO NOT include any introduction, greeting, or preamble. Start directly with the content.
2. DO NOT write "As an expert..." or similar phrases.
3. For tables, use proper markdown format with header row and separator row:
   | Column1 | Column2 | Column3 |
   |---------|---------|---------|
   | Data1   | Data2   | Data3   |
4. Every table MUST have data rows, not just headers.
5. Use clear section headings but skip the main title (it's already shown in the UI).
6. Be concise and actionable.
7. ADAPT all recommendations to the business type - do NOT assume every startup is a tech/app company.`;

  // Comprehensive skills list covering tech AND non-tech business types
  const officialSkills = [
    // Backend & APIs
    "Django", "Express.js", "FastAPI", "GraphQL", "Microservices", "Node.js", "REST APIs", "Spring Boot",
    // Business & Marketing
    "Business Development", "Content Marketing", "Copywriting", "Growth Hacking", "Marketing", "Product Management", "Project Management", "Public Relations", "Sales", "SEO/SEM", "Social Media Marketing",
    // Cloud & DevOps
    "AWS", "Azure", "CI/CD", "DevOps", "Docker", "Google Cloud", "Kubernetes", "Linux",
    // Data & AI
    "Computer Vision", "Data Analysis", "Data Science", "Deep Learning", "LLMs/GenAI", "Machine Learning", "NLP", "PyTorch", "TensorFlow",
    // Databases
    "Firebase", "MongoDB", "MySQL", "PostgreSQL", "Redis", "Supabase",
    // Design
    "Brand Design", "Figma", "Graphic Design", "Motion Design", "Product Design", "Prototyping", "UI/UX Design", "User Research",
    // Emerging Tech
    "3D Printing", "AR/VR", "Blockchain", "Cybersecurity", "Hardware", "IoT", "Robotics", "Smart Contracts", "Web3",
    // Finance & Operations (expanded)
    "Accounting", "Financial Modeling", "Fundraising", "Investor Relations", "Legal", "Operations", "Supply Chain",
    // Frontend
    "Angular", "Flutter", "HTML/CSS", "Next.js", "React", "React Native", "Svelte", "Tailwind CSS", "Vue.js",
    // Leadership
    "Agile/Scrum", "Negotiation", "People Management", "Public Speaking", "Strategic Planning", "Team Leadership",
    // Programming Languages
    "C#", "C++", "Go", "Java", "JavaScript", "Kotlin", "MATLAB", "PHP", "Python", "R", "Ruby", "Rust", "SQL", "Swift", "TypeScript",
    // F&B Specific
    "Food Safety & HACCP", "Menu Development", "Culinary Arts", "Restaurant Operations", "Food Cost Management", "Beverage Management", "Catering Operations", "Food Photography", "Recipe Development", "Kitchen Management",
    // Fashion & Retail Specific
    "Fashion Design", "Textile Knowledge", "Merchandising", "Visual Merchandising", "Retail Operations", "Inventory Management", "Sourcing & Procurement", "Fashion Buying", "Trend Forecasting", "Pattern Making", "Garment Construction",
    // Service Business Specific
    "Customer Service", "Event Planning", "Hospitality Management", "Facility Management", "Quality Assurance", "Service Design", "Client Relations",
    // Manufacturing & Physical Products
    "Manufacturing Operations", "Quality Control", "Logistics", "Warehouse Management", "Production Planning", "Vendor Management", "Import/Export", "Packaging Design", "Product Sourcing", "Cost Engineering"
  ].join(", ");

  return [
    {
      key: "founderFit",
      title: "Idea-Founder Fit",
      prompt: `Analyze this startup idea and generate IDEA-FOUNDER FIT content.

${ideaContext}

${businessTypeContext}

Generate the following sections in clean markdown format. Cover:

## Problem Statement & Validation
- Restate the core problem in 2-3 sentences
- Who experiences this pain most acutely?
- How can the founder validate this is a real problem? (adapt validation methods to business type)

## Founder Motivation Assessment
- What personal connection might a student founder have to this problem?
- Required domain expertise vs. learnable skills (consider industry-specific requirements for F&B, fashion, etc.)
- Red flags if founder lacks certain backgrounds
- Passion sustainability score (1-10) with reasoning

## Initial Hypothesis Framework
- Core assumption to test first
- Falsifiable hypotheses (at least 3)
- Minimum viable experiment to validate (adapt to business type: taste tests for F&B, sample sales for fashion, etc.)
- Expected learning timeline
${outputRules}`,
    },
    {
      key: "competitiveLandscape",
      title: "Competitive Landscape",
      prompt: `Analyze this startup idea and generate COMPETITIVE LANDSCAPE content.

${ideaContext}

${businessTypeContext}

Generate the following sections in clean markdown format:

## Market Map
- Industry/sector categorization (identify the correct industry for F&B, fashion, service, etc.)
- Market size estimation (TAM, SAM, SOM)
- Key market trends driving opportunity

## Competitor Grid

Create a markdown table with these exact columns: Competitor | Type | Strengths | Weaknesses | Pricing | Target Segment

IMPORTANT: You MUST populate this table with 4-6 REAL competitor companies appropriate to the business type. 
- For Tech/App: Include software companies, apps, and platforms in the same category
- For F&B: Include local restaurants, food delivery services, or food brands in the same category
- For Fashion: Include fashion brands, retailers, or designers in the same segment
- For Service: Include service providers in the same space
- For Hardware/Manufacturing: Include device makers, physical product companies, or manufacturers in the same category
- For Hybrid: Include competitors from both digital and physical aspects of the business
Do NOT leave the table empty or use placeholders. Include at least one direct competitor, one indirect competitor, and the "Status Quo" (what customers currently do without a dedicated solution).

## Whitespace Analysis
- Specific gaps in current market offerings
- Underserved customer segments
- Your potential wedge/entry point

## Market Validation Analysis

Analyze whether there is genuine market demand for this product/service:

**Market Demand Evidence:** Explain what signals indicate there IS a market for this product/service. Look for pain points, existing spending patterns, search trends, or competitor traction that proves demand exists.

**Market Concerns:** Honestly assess any reasons why the market might be limited or challenging. Consider market size, customer willingness to pay, or behavioral barriers.

**If Market Is Weak - How to Create Demand:** If the current market seems small or non-existent, provide specific strategies to CREATE a market:
- Education-first approach (teaching customers why they need this)
- Building on adjacent markets (piggybacking on existing behaviors)
- Creating urgency or FOMO
- Influencer/thought leader partnerships to validate the category
- Starting hyper-niche before expanding

**Pivot Recommendations:** If the core idea struggles to find market fit, suggest 2-3 specific pivots or modifications that would make the product/service more marketable while staying true to the founder's vision.

## Competitive Advantage Comparison

Create a markdown table comparing YOUR STARTUP vs the top 3 real competitors you identified in the Competitive Landscape above.

**CRITICAL: Use the ACTUAL COMPANY/BRAND NAMES in the column headers - NEVER use generic labels like "Competitor 1", "Competitor 2", etc.**

Example for a food delivery startup: Feature/Factor | Your Startup | DoorDash | Uber Eats | Grubhub
Example for a fashion startup: Feature/Factor | Your Startup | Zara | H&M | ASOS

The table format must be: Feature/Factor | Your Startup | [Real Company Name] | [Real Company Name] | [Real Company Name]

Include 5-7 comparison rows covering:
- Core value proposition
- Pricing model/affordability
- Target customer focus
- Key differentiator (speed, quality, convenience, etc.)
- Technology/approach
- Customer experience

Below the table, provide a brief **"Why We Win"** summary (3-4 bullet points) explaining:
- The #1 reason customers will choose you over alternatives
- Your unfair advantage or unique insight
- What competitors would have to change to match you
${outputRules}`,
    },
    {
      key: "riskMoat",
      title: "Risk & Moat Analysis",
      prompt: `Analyze this startup idea and generate RISK & MOAT content.

${ideaContext}

${businessTypeContext}

Generate the following sections in clean markdown format:

## SWOT Analysis

Create a SWOT table with two columns: Category | Analysis. Populate each row with real analysis appropriate to the business type:
- Strengths: List 3-4 specific strengths of this startup idea
- Weaknesses: List 3-4 specific weaknesses or challenges  
- Opportunities: List 3-4 market opportunities to leverage
- Threats: List 3-4 external threats to watch for

## Defensibility Score (1-10)
Rate and explain potential moats (adapt to business type):

**For Tech/App:**
- Network effects potential
- Switching costs
- Data/AI advantage
- Brand/trust building

**For F&B:**
- Recipe/taste differentiation
- Location advantages
- Supplier relationships
- Brand/loyalty building
- Operational excellence

**For Fashion/Retail:**
- Design/brand identity
- Supplier/manufacturing relationships
- Customer loyalty
- Distribution advantages

**For Service:**
- Expertise/reputation
- Customer relationships
- Process/methodology IP
- Network effects (referrals)

**For Hardware/Manufacturing:**
- Patent/IP protection
- Manufacturing relationships and exclusivity
- Design/engineering complexity
- Economies of scale in production
- Distribution partnerships

**For Hybrid:**
- Combine moats from both digital (network effects, data) and physical (IP, relationships)
- Integration advantages competitors can't easily replicate

## Top 5 Kill Risks
For each risk, consider industry-specific challenges:
1. **[Risk Name]**
   - Severity: High/Medium/Low
   - Likelihood: High/Medium/Low
   - Description: What could happen
   - Mitigation: Specific action to reduce risk
   - Early warning signs: How to detect

Common risks by business type:
- F&B: Food safety, supplier reliability, kitchen capacity, delivery quality
- Fashion: Inventory risk, trend shifts, manufacturing quality, seasonality
- Service: Key person dependency, quality consistency, capacity constraints
- Tech: Technical debt, security, scalability, competition
- Hardware: Manufacturing defects, supply chain disruptions, certification delays, high upfront costs, long lead times
- Hybrid: Complexity of managing both digital and physical operations, integration challenges

## Risk Mitigation Roadmap
- First 30 days priorities
- 90-day risk reduction plan
- 1-year defensive strategy
${outputRules}`,
    },
    {
      key: "mvpDesign",
      title: "Product MVP Design",
      prompt: `Analyze this startup idea and generate MVP DESIGN content.

${ideaContext}

${businessTypeContext}

IMPORTANT: Adapt your MVP recommendations based on the business type:
- For TECH/APP: Focus on software features, screens, tech stack
- For F&B: Focus on menu/product lineup, kitchen setup, operations, location/delivery strategy
- For FASHION/RETAIL: Focus on initial collection, sourcing, distribution channels, inventory
- For SERVICE: Focus on service packages, delivery methods, customer experience touchpoints
- For HARDWARE: Focus on prototype specifications, manufacturing, supply chain
- For HYBRID: Cover both digital and physical components appropriately

Generate the following sections in clean markdown format:

## Business Type
State the detected business type and briefly explain why.

## MVP Backlog

| Priority | Component/Feature | Customer Value | Effort | MVP? |
|----------|-------------------|----------------|--------|------|
| P0 | [Core offering] | Core value proposition | M | Yes |
| P0 | [Component 2] | ... | S/M/L | Yes |
| P1 | [Component 3] | ... | S/M/L | Maybe |
| P2 | [Component 4] | ... | S/M/L | No |

Include 6-8 items appropriate to the business type:
- For apps: features, screens, integrations
- For F&B: menu items, kitchen equipment, service formats
- For fashion: product categories, collections, distribution channels
- For services: service tiers, delivery methods, tools needed

## MVP Specification

**For Tech/App businesses:**
- Core user flow (step by step)
- Essential screens/pages
- Key data entities

**For Physical businesses (F&B, Fashion, Retail):**
- Core customer journey (from discovery to purchase/consumption)
- Physical touchpoints (location, packaging, delivery)
- Key operational processes
- Initial product/menu lineup (3-5 hero items/products)

**For Service businesses:**
- Service delivery process
- Customer touchpoints
- Tools and equipment needed

## Resource Requirements

Adapt based on business type:

**For Tech/App:**
- Tech Stack: Frontend, Backend, Database recommendations with rationale

**For F&B:**
- Kitchen/Production Setup: Equipment, space requirements, licenses
- Supplier Relationships: Key ingredients/materials to source
- Delivery/Service Infrastructure: Dine-in, takeaway, delivery setup

**For Fashion/Retail:**
- Production/Sourcing: Manufacturers, minimum order quantities
- Inventory Strategy: Initial stock levels, storage needs
- Sales Channels: Online, pop-up, wholesale, retail

**For Service:**
- Tools & Equipment: What's needed to deliver the service
- Staffing: Initial team requirements
- Scheduling/Booking: How customers access the service

**For Hardware/Manufacturing:**
- Prototype Development: CAD/design tools, prototyping costs, iteration cycles
- Manufacturing Setup: Contract manufacturers, MOQs, tooling costs
- Supply Chain: Component sourcing, lead times, quality control
- Certifications: Safety certifications, compliance requirements (CE, FCC, etc.)
- Distribution: Fulfillment, warehousing, shipping logistics

**For Hybrid (Tech + Physical):**
- Cover both digital product requirements AND physical operations
- Integration points between app/platform and physical service/product

## Launch Milestones

| Week/Month | Milestone | Deliverable |
|------------|-----------|-------------|
| Phase 1 | Foundation | [Setup, sourcing, design] |
| Phase 2 | Build/Produce | [Development, production, inventory] |
| Phase 3 | Soft Launch | [Beta test, pilot, friends & family] |
| Phase 4 | Public Launch | [MVP live, initial sales] |

## Design & Branding Brief

**Brand Identity:**
- Color palette: [Primary, Secondary, Accent colors with hex codes]
- Typography: [Font families for different uses]
- Visual style: [Professional, playful, minimal, luxurious, etc.]

**Key Design Assets Needed:**

For Tech/App:
- Key screens/wireframes to design
- User flow diagram

For F&B:
- Menu design, packaging, signage
- Social media templates, photography style

For Fashion:
- Lookbook/catalog style
- Packaging, tags, labels
- E-commerce product photography guidelines

For Service:
- Service brochure/one-pager
- Booking interface (if applicable)
- Customer communication templates

For Hardware/Manufacturing:
- Product renders and packaging design
- User manual/quick start guide layout
- Retail/e-commerce product photography
- Explainer video storyboard

For Hybrid:
- Both digital assets (app screens) and physical assets (packaging, signage, etc.)

**Brand Personality:**
- Target aesthetic and customer perception
- Differentiation from competitors visually
${outputRules}`,
    },
    {
      key: "teamTalent",
      title: "Team & Talent Strategy",
      prompt: `Analyze this startup idea and generate TEAM & TALENT content.

${ideaContext}

${businessTypeContext}

IMPORTANT: For the Skill Matrix and Required Skills, you MUST use skills from this exact list (pick the most relevant 6-8 skills based on the DETECTED BUSINESS TYPE):

OFFICIAL SKILLS LIST:
${officialSkills}

NOTE: This list includes skills for ALL business types:
- Tech/App: React, Node.js, Python, UI/UX Design, etc.
- F&B: Food Safety & HACCP, Culinary Arts, Restaurant Operations, Menu Development, etc.
- Fashion/Retail: Fashion Design, Merchandising, Sourcing & Procurement, Inventory Management, etc.
- Service: Customer Service, Event Planning, Service Design, etc.
- Manufacturing: Manufacturing Operations, Quality Control, Logistics, etc.

Generate the following sections in clean markdown format:

## Required Skills

<!-- SKILLS_JSON_START -->
[List the exact skill names from the list above, comma-separated. Choose skills APPROPRIATE to the business type, e.g., for F&B: "Food Safety & HACCP, Menu Development, Restaurant Operations, Marketing, Financial Modeling"]
<!-- SKILLS_JSON_END -->

## Skill Matrix

| Skill | Priority | Level Needed | Why Needed |
|-------|----------|--------------|------------|
| [Exact skill from list] | Critical | Expert | [Brief reason] |
| [Exact skill from list] | Critical | Competent | [Brief reason] |
| [Exact skill from list] | Important | Competent | [Brief reason] |

Include 6-8 skills using EXACT names from the list above. Match skills to the business type.

## Ideal Co-Founder Profiles

Adapt co-founder profiles based on business type:

**For Tech/App:**
### Technical Co-Founder
- Background: [specific experience needed]
- Required Skills: [skills from the list above]
- Where to find: [specific places on campus]

### Business Co-Founder
- Background: [specific experience needed]
- Required Skills: [skills from the list above]
- Where to find: [specific places on campus]

**For F&B:**
### Operations Co-Founder
- Background: [culinary school, restaurant experience, food science, etc.]
- Required Skills: [Food Safety & HACCP, Culinary Arts, Kitchen Management, etc.]
- Where to find: [hospitality programs, culinary clubs, restaurant jobs]

### Business Co-Founder
- Background: [business/marketing experience, F&B industry knowledge]
- Required Skills: [Marketing, Financial Modeling, Restaurant Operations, etc.]
- Where to find: [business school, hospitality management programs]

**For Fashion/Retail:**
### Creative/Design Co-Founder
- Background: [fashion design, textile, art school, etc.]
- Required Skills: [Fashion Design, Trend Forecasting, Pattern Making, etc.]
- Where to find: [design programs, fashion clubs, art departments]

### Operations Co-Founder
- Background: [retail, supply chain, e-commerce experience]
- Required Skills: [Merchandising, Inventory Management, Sourcing & Procurement, etc.]
- Where to find: [business school, retail internships]

**For Service:**
### Service Delivery Lead
- Background: [relevant domain expertise]
- Required Skills: [Customer Service, Service Design, relevant domain skills]
- Where to find: [based on service type]

**For Hardware/Manufacturing:**
### Technical/Engineering Co-Founder
- Background: [engineering, industrial design, electronics, mechanical engineering]
- Required Skills: [Hardware, Manufacturing Operations, Product Design, 3D Printing, etc.]
- Where to find: [engineering programs, maker spaces, robotics clubs]

### Operations Co-Founder
- Background: [supply chain, manufacturing, logistics experience]
- Required Skills: [Supply Chain, Manufacturing Operations, Quality Control, Vendor Management]
- Where to find: [business school, engineering management programs, industry internships]

**For Hybrid:**
Include relevant profiles from both Tech/App AND the physical business type

## First 3 Hires (Post-Founding)

Adapt based on business type:
1. [Role 1] - Why first, key skills needed (e.g., Chef for F&B, Developer for Tech, Designer for Fashion, Engineer for Hardware)
2. [Role 2] - Dependencies
3. [Role 3] - Growth stage

## Personality & Working Style Preferences

For optimal team matching, define the ideal co-founder/team member traits:

**Work Style:**
- Pace: Fast-moving / Methodical / Balanced
- Decision-making: Data-driven / Intuition-based / Collaborative
- Communication: Frequent check-ins / Async updates / Weekly syncs

**Personality Traits (Rank top 3):**
- [ ] Ambitious & competitive
- [ ] Detail-oriented & thorough
- [ ] Creative & innovative
- [ ] Analytical & logical
- [ ] Empathetic & people-focused
- [ ] Resilient & adaptable

**Cultural Fit:**
- Work hours expectations (flexible / structured)
- Equity vs. salary preferences
- Long-term commitment level

## Suggested Invite List

Based on the required skills and personality profile, here are the types of people to invite (ADAPT to business type):

### Priority 1: [Primary Partner Role - based on business type]
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events relevant to business type]
- **Matching criteria**: [Personality traits, availability, interests]

### Priority 2: [Secondary Partner Role - based on business type]
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events]
- **Matching criteria**: [Personality traits, availability, interests]

### Priority 3: [Third Priority Role - based on business type]
- **Profile**: [Specific major, year, background]
- **Skills needed**: [List exact skills from the skill matrix]
- **Where to find**: [Specific clubs, classes, events]
- **Matching criteria**: [Personality traits, availability, interests]
${outputRules}`,
    },
    {
      key: "launchPlan",
      title: "Launch & Growth Plan",
      prompt: `Analyze this startup idea and generate LAUNCH & GROWTH content.

${ideaContext}

${businessTypeContext}

Generate the following sections in clean markdown format, ADAPTING metrics and strategies to the business type:

## Pre-Launch Checklist

Adapt based on business type:

**For Tech/App:**
- Beta user recruitment strategy
- Landing page essentials
- Analytics setup
- Legal/compliance basics

**For F&B:**
- Recipe testing and menu finalization
- Food safety certifications and licenses
- Supplier agreements finalized
- Soft launch with friends & family
- Photography for menu/social media

**For Fashion/Retail:**
- Sample production and quality check
- Product photography and lookbook
- E-commerce or retail setup
- Inventory management system
- Packaging and shipping solution

**For Service:**
- Service process documentation
- Booking/scheduling system
- Initial client acquisition strategy
- Insurance and legal requirements

**For Hardware/Manufacturing:**
- Working prototype completed and tested
- Manufacturing partner identified and quoted
- Bill of materials (BOM) finalized
- Certifications and compliance research (safety, regulatory)
- Packaging design and fulfillment solution
- Pre-order or crowdfunding campaign prepared

**For Hybrid:**
- Cover requirements from both digital and physical components
- Integration testing between app and physical product/service

## Go-To-Market Strategy

Adapt channels based on business type:

**For Tech/App:**
- Primary digital acquisition channel
- Secondary channel
- Referral/viral loops
- Content marketing strategy

**For F&B:**
- Location/delivery radius strategy
- Food delivery platform partnerships (GrabFood, Foodpanda, etc.)
- Social media presence (Instagram, TikTok for food content)
- Local community engagement
- Pop-up or food market events

**For Fashion/Retail:**
- E-commerce vs. physical retail strategy
- Influencer/KOL partnerships
- Pop-up shops and markets
- Wholesale/consignment opportunities
- Social media presence (Instagram, TikTok, Pinterest)

**For Service:**
- Referral programs
- Partnership channels
- Online booking/discovery platforms
- Local marketing

**For Hardware/Manufacturing:**
- Crowdfunding platform strategy (Kickstarter, Indiegogo)
- Pre-order campaigns and waitlists
- Tech/product review outreach (blogs, YouTube)
- Retail and distribution partnerships
- Trade shows and maker fairs

**For Hybrid:**
- Combine strategies from both digital and physical components
- Focus on integrated customer experience

## Pricing Strategy

Develop a pricing strategy that hits the sweet spot for the target market while remaining competitive:

**Target Market Price Sensitivity:** Analyze how price-sensitive the target customers are. Consider their income levels, spending habits, and what they currently pay for alternatives.

**Competitive Pricing Comparison:** Compare your proposed pricing to the real competitors identified earlier:
- Where should you position yourself? (Premium, mid-market, budget-friendly, or value leader)
- What pricing models do competitors use? (Subscription, one-time, freemium, tiered, etc.)
- What's the pricing sweet spot where you can win customers without leaving money on the table?

**Recommended Pricing Model:** Suggest the optimal pricing structure:
- Specific price points or ranges with justification
- Pricing tiers if applicable (e.g., Basic/Pro/Enterprise or Small/Medium/Large)
- Any introductory pricing, discounts, or bundling strategies for launch
- How to communicate value to justify the price

**Pricing Psychology Tips:** Provide 2-3 pricing psychology tactics relevant to this market:
- Anchoring strategies
- Charm pricing (e.g., $9.99 vs $10)
- Decoy options
- Value framing techniques

**When to Raise Prices:** Outline triggers or milestones that would justify a price increase (e.g., after proving product-market fit, adding features, or building brand recognition).

## 12-Month Growth Roadmap

Adapt metrics based on business type:

| Month | Focus | Key Metric | Target |
|-------|-------|------------|--------|

**For Tech/App:**
| 1-3 | Beta / MVP | Active Users | [Number] |
| 4-6 | Retention | Churn Rate | <[X]% |
| 7-9 | Monetization | Revenue | $[Amount] |
| 10-12 | Scaling | Growth Rate | [X]% MoM |

**For F&B:**
| 1-3 | Soft Launch | Orders/Day | [Number] |
| 4-6 | Consistency | Repeat Customers | [X]% |
| 7-9 | Break-even | Food Cost % | <[X]% |
| 10-12 | Expansion | Locations/Menu | [Target] |

**For Fashion/Retail:**
| 1-3 | First Collection | Units Sold | [Number] |
| 4-6 | Retention | Repeat Purchase Rate | [X]% |
| 7-9 | Inventory Health | Sell-through Rate | [X]% |
| 10-12 | Expansion | New SKUs/Channels | [Target] |

**For Service:**
| 1-3 | Launch | Clients Served | [Number] |
| 4-6 | Quality | NPS Score | [Target] |
| 7-9 | Utilization | Booking Rate | [X]% |
| 10-12 | Scaling | Revenue/Team Size | [Target] |

**For Hardware/Manufacturing:**
| 1-3 | Prototype | Working Prototypes | [Number] |
| 4-6 | Pre-orders | Crowdfunding/Pre-orders | [Units] |
| 7-9 | Production | Units Shipped | [Number] |
| 10-12 | Scaling | Manufacturing Cost | -[X]% reduction |

**For Hybrid:**
Include metrics from both Tech/App AND the relevant physical business type

## Marketing Asset Briefs
- Social media ad copy (3 variations tailored to business type)
- Email sequence (Subject lines for 3 emails)
- One-sentence pitch for different platforms
- Visual content strategy (product photos, behind-the-scenes, user-generated content)
${outputRules}`,
    },
    {
      key: "schoolAdvantage",
      title: "University Advantage",
      prompt: `Analyze this startup idea and generate UNIVERSITY ADVANTAGE content.

${ideaContext}

Generate the following sections in clean markdown format. Write in complete sentences with specific, actionable recommendations. DO NOT use placeholder formats like "Name | Focus Area | ---" or table-like separators.

## Campus Resources

**Relevant labs/research centers:** Describe 2-3 types of university labs or research centers that would be relevant (e.g., "Look for your university's Design Lab or Fashion Innovation Center, which often provide access to prototyping equipment and industry connections").

**Specific professors/mentors to approach:** Suggest what types of professors to seek out based on their expertise areas (e.g., "Seek out professors in your business school who specialize in consumer behavior or retail marketing, as they can provide valuable market insights and may serve as advisors").

**University-specific grants/funding:** Describe the types of university funding programs to look for (e.g., "Most universities offer entrepreneurship grants ranging from $1,000-$25,000 through business plan competitions and innovation funds. Check with your school's entrepreneurship center").

**Incubators/accelerators on campus:** Explain what campus incubator programs typically offer and how to find them (e.g., "University incubators typically provide free workspace, mentorship, and funding connections. Look for programs run by your business school or innovation office").

## Student Network Wedge

**Ideal student clubs for early adopters:** Identify 2-3 specific types of student clubs that would be most receptive (e.g., "Fashion-focused clubs, entrepreneurship societies, and business fraternities/sororities are ideal first customers who can provide feedback and spread word-of-mouth").

**Campus events for launch:** Suggest specific event types and strategies (e.g., "Partner with campus fashion shows, entrepreneur pitch nights, or club fairs to showcase your product. Consider sponsoring student organization events for visibility").

**How to leverage alumni network:** Provide actionable strategies (e.g., "Connect with recent alumni through LinkedIn and your university's alumni portal. Many successful alumni actively mentor student entrepreneurs and can open doors to industry contacts").

**Student-specific distribution channels:** Describe channels unique to the university environment (e.g., "Leverage Instagram and TikTok for peer-to-peer marketing, organize pop-up events in high-traffic campus locations, and partner with student influencers").

## Academic Integration

**Relevant courses for project credit:** Identify course types that could provide academic credit while building the startup (e.g., "Capstone courses in entrepreneurship, marketing practicums, and independent study projects can provide academic credit while you develop your business").

**Potential research collaboration:** Suggest research areas that could benefit the startup (e.g., "Partner with business school researchers studying consumer trends or sustainability in fashion for data-driven insights that strengthen your business model").

**Internship/hiring pipeline:** Explain how to build a talent pipeline from campus (e.g., "Recruit from fashion merchandising, marketing, and business programs. Many students seek startup experience for their resumes and will work part-time or for equity").
${outputRules}`,
    },
    {
      key: "fundingPitch",
      title: "Funding & Pitch Deck",
      prompt: `Analyze this startup idea and generate FUNDING & PITCH content.

${ideaContext}

Generate the following sections in clean markdown format:

## Pitch Deck Outline
1. Title & Hook
2. Problem (The Pain)
3. Solution (The Gain)
4. Market Opportunity
5. Product/MVP
6. Traction/Milestones
7. Team (Why us?)
8. The Ask (Funding/Resources)

## Financial Projections (Year 1-3)
- Revenue model (SaaS, Transactional, etc.)
- Key cost drivers
- Break-even analysis
- Funding requirements

## Investor Outreach Strategy
- Ideal investor profile
- Target VC firms/Angel groups
- Pitching timeline

## Outreach Templates

### Cold Outreach Email
Subject: [Product Name] - Solving [Problem] for [Target Users]

Hi [Investor Name],

I'm [Founder Name], building [Product Name] at [University]. We help [target users] [solve problem] by [solution approach].

Our solution: [2 sentences on your approach]

We've [traction metric] and are raising [amount] to [key milestone].

Would you be open to a 15-minute call next week?

Best,
[Your name]
[LinkedIn]

### Warm Intro Request Template

Hi [Connector],

Hope you're doing well! I'm reaching out because I'm raising [amount] for [company name], and I noticed you're connected to [Investor Name] on LinkedIn.

Quick context:
- [One-line description]
- [Key traction metric]
- [Why this investor is a fit]

Would you be comfortable making an intro? Happy to send a forwardable email.

Thanks!
[Your name]

### Forwardable Intro Email

[Connector name], thanks for offering to intro me to [Investor]!

Here's a forwardable blurb:

---

[Investor name],

I'd like to introduce you to [Founder name], a [year] at [University] who's building [product name].

[Product name] helps [target users] [solve problem] by [solution approach]. They've [traction metric] and are raising [amount].

I think this could be interesting for [reason related to investor's thesis].

[Founder], meet [Investor].
${outputRules}`,
    },
  ];
}

export async function generateBusinessPlan(idea: IdeaInput): Promise<BusinessPlanSections> {
  const sectionPrompts = buildSectionPrompts(idea);
  
  console.log(`[AI] Starting sequential generation of ${sectionPrompts.length} sections`);
  
  const results: { key: string; content: string }[] = [];
  
  for (let index = 0; index < sectionPrompts.length; index++) {
    const section = sectionPrompts[index];
    console.log(`[AI] Generating section ${index + 1}/${sectionPrompts.length}: ${section.title}`);
    
    try {
      const client = getAIClient();
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: section.prompt }],
        max_completion_tokens: 8192,
      });
      
      const content = response.choices[0]?.message?.content || `## ${section.title}\n\nGeneration failed. Please try again.`;
      console.log(`[AI] Completed section: ${section.title} (${content.length} chars)`);
      
      results.push({ key: section.key, content });
    } catch (error) {
      console.error(`[AI] Error generating section ${section.title}:`, error);
      results.push({ key: section.key, content: `## ${section.title}\n\nGeneration failed. Please try again.` });
    }
  }
  
  const executiveSummary = await generateExecutiveSummary(idea, results);
  
  const sections: BusinessPlanSections = {
    executiveSummary,
    founderFit: "",
    competitiveLandscape: "",
    riskMoat: "",
    mvpDesign: "",
    teamTalent: "",
    launchPlan: "",
    schoolAdvantage: "",
    fundingPitch: "",
  };
  
  for (const result of results) {
    sections[result.key] = result.content;
  }
  
  console.log("[AI] Business plan generation complete");
  return sections;
}

async function generateExecutiveSummary(
  idea: IdeaInput,
  sectionResults: { key: string; content: string }[]
): Promise<string> {
  const sectionSummaries = sectionResults
    .map((r) => `${r.key}: ${r.content.slice(0, 500)}...`)
    .join("\n\n");

  const prompt = `You are an expert startup advisor at Yassu, "The New-Age Marketplace for University-Native Company Creation."

Based on the detailed analysis sections below, create a compelling EXECUTIVE SUMMARY for this startup:

STARTUP IDEA:
Title: ${idea.title}
Problem: ${idea.problem}
${idea.solution ? `Solution: ${idea.solution}` : ""}
${idea.targetUser ? `Target Users: ${idea.targetUser}` : ""}

ANALYSIS HIGHLIGHTS:
${sectionSummaries}

Generate an Executive Summary in markdown format covering:

## Executive Summary

### The Opportunity
- Problem statement (2-3 sentences, compelling)
- Market size and timing

### The Solution
- Core value proposition
- Key differentiators

### Traction Path
- First milestones to hit
- Path to scale

### The Ask
- What's needed to succeed
- Key risks acknowledged

Keep it to ~400 words. Make it compelling enough to hook an investor or co-founder.`;

  const client = getAIClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_completion_tokens: 8192,
  });

  return response.choices[0]?.message?.content || "## Executive Summary\n\nGeneration pending...";
}
