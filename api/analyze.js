import { createClient } from "redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function getRedis() {
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).set(CORS).end();
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { prompt, max_tokens = 4000 } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  let rawText;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: data.error?.message || "Claude API error" });
    }

    rawText = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach Claude API: " + err.message });
  }

  // Try to parse JSON and save to Redis
  let redis;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed.team_a && parsed.team_b && !parsed.error) {
      const key =
        "match:" +
        [parsed.team_a, parsed.team_b]
          .map((t) => t.toLowerCase().trim())
          .sort()
          .join("|");
      redis = await getRedis();
      await redis.set(key, JSON.stringify({ data: parsed, savedAt: Date.now() }), { EX: 86400 });
    }
  } catch {
    // Not valid JSON or not a match analysis — skip saving
  } finally {
    if (redis) await redis.quit().catch(() => {});
  }

  return res.status(200).json({ text: rawText });
}
