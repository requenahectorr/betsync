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

  let redis;
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

    redis = await getRedis();
    const raw = await redis.get(key);

    if (!raw) {
      return res.status(200).json({ cached: false });
    }

    const entry = JSON.parse(raw);
    return res.status(200).json({ cached: true, data: entry.data, savedAt: entry.savedAt });
  } catch {
    return res.status(200).json({ cached: false });
  } finally {
    if (redis) await redis.quit().catch(() => {});
  }
}
