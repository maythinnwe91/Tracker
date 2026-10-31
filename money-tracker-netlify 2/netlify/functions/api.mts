import { getStore } from "@netlify/blobs";
import type { Config, Context } from "@netlify/functions";

// Entries that existed in the Claude version of the app, copied in on first load.
const SEED = {"entries":[{"id":"mvvyjih39ix8","t":1793424331335,"type":"recv","date":"2026-10-29","note":"KBZ Transfer","mmk":20000000},{"id":"mvvykeavhuxs","t":1793424372583,"type":"ex","date":"2026-10-31","note":"ဘတ် တစ်သိန်း ငွေလဲပြီး","thb":100000,"mmk":14285714},{"id":"mvvyl22dmlg5","t":1793424403381,"type":"out","date":"2026-10-30","note":"Yapaiboon Pharmacy","thb":23393},{"id":"mvvylihvtfu0","t":1793424424675,"type":"out","date":"2026-10-31","note":"RVT pharmacy","thb":43068}]}.entries;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const store = () => getStore({ name: "money-tracker", consistency: "strong" });

async function ensureSeeded() {
  const s = store();
  const done = await s.get("meta/seeded");
  if (done) return;
  for (const e of SEED) await s.setJSON("entries/" + e.id, e);
  await s.set("meta/seeded", "1");
}

function clean(body: any) {
  const type = body?.type;
  if (!["recv", "ex", "out"].includes(type)) return null;
  const date = String(body.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const mmk = Number(body.mmk), thb = Number(body.thb);
  const e: Record<string, unknown> = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    t: Date.now(),
    type,
    date,
    note: String(body.note || "").slice(0, 200),
  };
  if (type === "recv" || type === "ex") {
    if (!(mmk > 0) || mmk > 1e12) return null;
    e.mmk = Math.round(mmk);
  }
  if (type === "ex" || type === "out") {
    if (!(thb > 0) || thb > 1e10) return null;
    e.thb = Math.round(thb * 100) / 100;
  }
  return e;
}

export default async (req: Request, context: Context) => {
  const path = new URL(req.url).pathname;

  if (path === "/api/entries" && req.method === "GET") {
    await ensureSeeded();
    const s = store();
    const { blobs } = await s.list({ prefix: "entries/" });
    const entries = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean);
    return json({ entries });
  }

  if (path === "/api/entries" && req.method === "POST") {
    let body: unknown;
    try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
    const e = clean(body);
    if (!e) return json({ error: "invalid_entry" }, 400);
    await ensureSeeded();
    await store().setJSON("entries/" + e.id, e);
    return json({ entry: e }, 201);
  }

  const m = path.match(/^\/api\/entries\/([A-Za-z0-9]+)$/);
  if (m && req.method === "DELETE") {
    await store().delete("entries/" + m[1]);
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
};

export const config: Config = {
  path: ["/api/entries", "/api/entries/*"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
