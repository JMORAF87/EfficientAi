export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { input } = req.body || {};
  if (!input) return res.status(400).json({ error: "Missing input" });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY env var" });

  // --- MODE DETECTION (simple but effective) ---
  function detectMode(text) {
    const t = String(text).toLowerCase();
    if (/(store|shop|located|local|restaurant|cafe|gym|salon|clinic|tahoe|near me)/.test(t)) return "local_business";
    if (/(book|author|kdp|amazon|etsy|course|gumroad|newsletter|substack)/.test(t)) return "creator_product";
    return "general";
  }
  const mode = detectMode(input);

  // --- SYSTEM PROMPT: enforce blueprint output ---
  const BASE_SYSTEM_PROMPT = `
You are an expert marketing strategist for small business owners.
Your job is to produce an execution-ready marketing blueprint, not generic tips.

Rules:
- Ask 3–6 clarifying questions ONLY if missing info prevents a usable plan. Otherwise proceed with reasonable assumptions and state them.
- Output MUST follow this structure, with clear headers:

1) Assumptions (if needed)
2) Goal + success metrics (numbers)
3) Positioning + offer (USP + 1–3 offers)
4) 14-Day Launch Plan (day-by-day actions)
5) 90-Day Growth Plan (week-by-week actions)
6) Channel Playbooks (Google/SEO, Social, Email/SMS, Partnerships, Ads)
7) Budget Tiers ($0, $200, $500+): what to do in each
8) Templates & Scripts (posts, ad copy, email, SMS, review request, partnership pitch)
9) Tracking Dashboard (KPIs + how to measure)
10) Risks + mitigations

- Every section must include step-by-step actions and checklists.
- No fluff. Make it realistic and reliable.
  `.trim();

  const MODE_RULES = {
    local_business: `
Focus on local customer acquisition:
- Google Business Profile optimization steps + review generation system
- Local SEO keywords + landing page outline
- Partnerships/referrals (hotels, guides, rentals, gyms, churches, schools)
- In-store conversion (signage, bundles, scripts)
- Seasonal promo calendar and events
    `.trim(),
    creator_product: `
Focus on product marketing:
- Platform SEO (Amazon/KDP/Etsy) + review strategy
- Simple funnel (lead magnet → email sequence → offer)
- Launch week schedule + content batches
- Influencer/affiliate outreach scripts
    `.trim(),
    general: `
Choose the best go-to-market plan based on the business details and constraints.
    `.trim(),
  };

  const SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}\n\nMode: ${mode}\n${MODE_RULES[mode]}`;

  // --- WRAP USER INPUT to force “blueprint-level” output ---
  const wrappedUserPrompt = `
Create an execution-ready marketing blueprint using the required structure.

Business details:
${input}

Hard requirements:
- Include step-by-step actions with checklists
- Include example copy (posts, ads, email, SMS)
- Include a simple KPI tracking table
- Include a 14-day day-by-day plan + 90-day weekly plan
- Provide 3 budget tiers: $0, $200, $500+
  `.trim();

  const MODEL = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: wrappedUserPrompt }] }],
        generationConfig: {
          temperature: 0.5,         // more “operator”, less ramble
          maxOutputTokens: 1400     // allow full blueprint
        },
      }),
    });

    const raw = await r.text();

    // Make Gemini errors readable in your UI
    if (!r.ok) {
      // Try to parse Google's JSON error to show the real message
      try {
        const j = JSON.parse(raw);
        const msg = j?.error?.message || raw;
        return res.status(r.status).json({ error: msg });
      } catch {
        return res.status(r.status).json({ error: raw || "Gemini API error" });
      }
    }

    const json = JSON.parse(raw);
    const output = (json?.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("")
      .trim();

    return res.status(200).json({ output });
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

