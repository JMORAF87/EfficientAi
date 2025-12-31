export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { input } = await request.json().catch(() => ({}));
  if (!input) {
    return new Response(JSON.stringify({ error: "Missing input" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY env var" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // System prompt you requested
  const SYSTEM_PROMPT =
    "You are an expert marketing assistant for small business owners; provide clean, professional, and actionable advice.";

  // Model pick: fast/cheap. You can change to gemini-2.5-flash if you want.
  const MODEL = "gemini-2.0-flash";

  // REST endpoint format (Gemini docs)
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: input }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return new Response(JSON.stringify({ error: errText || "Gemini API error" }), {
        status: r.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await r.json();
    const output =
      json?.candidates?.[0]?.content?.parts?.map(p => p.text).join("")?.trim() || "";

    return new Response(JSON.stringify({ output }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
