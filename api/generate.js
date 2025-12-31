export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { input } = req.body || {};
  if (!input) return res.status(400).json({ error: "Missing input" });

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) return res.status(500).json({ error: "Missing GEMINI_API_KEY env var" });

  const SYSTEM_PROMPT =
    "You are an expert marketing assistant for small business owners; provide clean, professional, and actionable advice.";

  const MODEL = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: input }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    });

    const raw = await r.text();
    if (!r.ok) return res.status(r.status).json({ error: raw || "Gemini API error" });

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

