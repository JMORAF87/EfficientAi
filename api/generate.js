export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { input, businessType } = req.body || {};
  
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: "Missing or invalid 'input' field" });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Server configuration error: GEMINI_API_KEY not set" });
  }

  // ============================================================================
  // MODE DETECTION & CONFIGURATION
  // ============================================================================
  function detectMode(text, explicitType) {
    // Prioritize explicit businessType from frontend
    if (explicitType === 'local') return 'local_business';
    if (explicitType === 'product') return 'online_product';
    if (explicitType === 'creator') return 'creator_product';
    
    // Fallback: keyword detection
    const t = String(text).toLowerCase();
    if (/(store|shop|local|restaurant|cafe|gym|salon|clinic|tahoe|truckee|brick|mortar)/.test(t)) {
      return 'local_business';
    }
    if (/(book|author|kdp|amazon|etsy|course|gumroad|newsletter|substack|creator|influencer)/.test(t)) {
      return 'creator_product';
    }
    if (/(saas|app|software|ecommerce|online store|shopify|product)/.test(t)) {
      return 'online_product';
    }
    return 'general';
  }

  const mode = detectMode(input, businessType);

  // ============================================================================
  // SYSTEM PROMPT: Enforce blueprint structure (NOT generic advice)
  // ============================================================================
  const BASE_SYSTEM_PROMPT = `You are an expert marketing strategist and execution consultant for small business owners.

YOUR MISSION:
Create an EXECUTION-READY marketing blueprint—not generic advice, not theory, but a practical plan the owner can implement TODAY.

CRITICAL RULES:
1. Output must be CONCRETE: numbers, timelines, exact actions, checklists, copy templates
2. NO generic fluff like "build brand awareness" or "engage on social media"
3. Every recommendation must include: WHO does it, WHEN, HOW (exact steps), and WHY (expected outcome)
4. If information is missing, state your assumptions clearly at the start
5. Prioritize high-impact, low-cost tactics first

REQUIRED OUTPUT STRUCTURE (use exactly these headers):

═══════════════════════════════════════════════════════════
📋 MARKETING BLUEPRINT
═══════════════════════════════════════════════════════════

🎯 **ASSUMPTIONS** (if any details were missing)
- List any assumptions you made about the business
- Keep this brief (3-5 bullet points max)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **GOAL & SUCCESS METRICS**
Primary Goal: [Specific, measurable 30-day goal]
Key Metrics:
  • [Metric 1]: [Target number] (e.g., 50 new customers)
  • [Metric 2]: [Target number] (e.g., 20 Google reviews)
  • [Metric 3]: [Target number] (e.g., 500 email subscribers)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 **POSITIONING & OFFER STRUCTURE**
Core Message: [One sentence that differentiates this business]
Main Offers:
  1. [Offer name] - $[price] - [Who it's for]
  2. [Offer name] - $[price] - [Who it's for]
Entry Offer: [Low-risk way to try the business]
Upsell Path: [How to increase customer value]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ **7-DAY QUICK WIN PLAN** (Day-by-Day)

**Day 1 (Today - 60 minutes):**
[ ] Action 1: [Exact task with tool/platform]
[ ] Action 2: [Exact task with tool/platform]
[ ] Action 3: [Exact task with tool/platform]
Expected Result: [What you'll have by end of day]

**Day 2 (60 minutes):**
[Same format]

**Day 3 (60 minutes):**
[Continue through Day 7]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 **30-DAY EXECUTION PLAN** (Week-by-Week)

**Week 1: [Focus theme]**
[ ] [Specific action with deadline]
[ ] [Specific action with deadline]
[ ] [Specific action with deadline]
Target: [What success looks like this week]

**Week 2: [Focus theme]**
[Same format through Week 4]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 **90-DAY GROWTH PLAN** (Week-by-Week)

**Weeks 5-8: [Phase name & objective]**
[Weekly breakdown with specific actions]

**Weeks 9-12: [Phase name & objective]**
[Weekly breakdown with specific actions]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

