import { kv } from "@vercel/kv";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).set(CORS).end();
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { team_a, team_b } = req.body || {};

    if (!team_a || !team_b) {
      return res.status(200).json({ cached: false });
    }

    const key =
      "match:" +
      [team_a, team_b]
        .map((t) => t.toLowerCase().trim())
        .sort()
        .join("|");

    const raw = await kv.get(key);

    if (!raw) {
      return res.status(200).json({ cached: false });
    }

    const entry = typeof raw === "string" ? JSON.parse(raw) : raw;
    return res.status(200).json({ cached: true, data: entry.data, savedAt: entry.savedAt });
  } catch {
    return res.status(200).json({ cached: false });
  }
}
