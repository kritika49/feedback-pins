import { getStore } from "@netlify/blobs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const store = getStore({ name: "comments", consistency: "strong" });

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const all = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" })));
    return json(all.filter(Boolean));
  }

  if (req.method === "POST") {
    let b;
    try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
    const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);
    const list = (v, n, len) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, n).map((x) => x.slice(0, len)) : []);
    const anchor = (a) => ({ selector: str(a && a.selector, 2000), tag: str(a && a.tag, 30), snippet: str(a && a.snippet, 40), inLayer: a && a.inLayer ? 1 : 0, vw: num(a && a.vw) });
    // App state from __protoNav.snap(): kept only if it is a small plain object.
    let nav = null;
    if (b.nav && typeof b.nav === "object" && !Array.isArray(b.nav)) { const j = JSON.stringify(b.nav); if (j.length <= 2000) nav = JSON.parse(j); }
    const c = {
      id: crypto.randomUUID(),
      view: str(b.view, 200),
      scroller: str(b.scroller, 2000),
      sx: num(b.sx),
      sy: num(b.sy),
      selector: str(b.selector, 2000),
      tag: str(b.tag, 30),
      snippet: str(b.snippet, 40),
      dx: num(b.dx),
      dy: num(b.dy),
      label: str(b.label, 80),
      app: str(b.app, 20),
      ctx: str(b.ctx, 300),
      ctxLabel: str(b.ctxLabel, 160),
      sig: str(b.sig, 200),
      path: str(b.path, 300),
      vw: num(b.vw),
      tabs: list(b.tabs, 6, 40),
      inLayer: b.inLayer ? 1 : 0,
      openers: Array.isArray(b.openers) ? b.openers.slice(0, 4).map(anchor) : [],
      nav,
      author: str(b.author, 60),
      body: str(b.body, 2000),
      ts: Date.now(),
    };
    if (!c.scroller || !c.author || !c.body) return json({ error: "missing fields" }, 400);
    await store.setJSON(c.id, c);
    return json(c, 201);
  }

  if (req.method === "DELETE") {
    const id = new URL(req.url).searchParams.get("id");
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad id" }, 400);
    await store.delete(id);
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
};
