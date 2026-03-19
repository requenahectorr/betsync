import { createClient } from "redis";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let redis;
  try {
    redis = await getRedis();
    const keys = await redis.keys("match:*");

    const entries = await Promise.all(
      keys.map(async (key) => {
        try {
          const raw = await redis.get(key);
          if (!raw) return null;
          const entry = JSON.parse(raw);
          return { key, data: entry.data, savedAt: entry.savedAt };
        } catch {
          return null;
        }
      })
    );

    const analyses = entries
      .filter(Boolean)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    return res.status(200).json({ analyses });
  } catch {
    return res.status(200).json({ analyses: [] });
  } finally {
    if (redis) await redis.quit().catch(() => {});
  }
}
