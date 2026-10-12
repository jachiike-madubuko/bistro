// Vercel serverless function. The Airtable token stays on the server.
// GET  /api/ideas  -> approved items only
// POST /api/ideas  -> add up to 10 unapproved items { items: [{ item, category }], website: "" }

const BASE = process.env.AIRTABLE_BASE_ID || "appkc7TflaC5nR9at";
const TABLE = process.env.AIRTABLE_TABLE_ID || "tblLgDHzVyg0KZePf";
const CATEGORIES = ["Candy", "Toys", "Gift Cards", "Accessories", "Other"];
const AT_URL = `https://api.airtable.com/v0/${BASE}/${TABLE}`;

const headers = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
  "Content-Type": "application/json",
});

const clean = (s) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);

export default async function handler(req, res) {
  if (!process.env.AIRTABLE_TOKEN) return res.status(500).json({ error: "not configured" });

  try {
    if (req.method === "GET") {
      const params = new URLSearchParams({ filterByFormula: "{Approved}=1", pageSize: "100" });
      params.append("fields[]", "Item");
      params.append("fields[]", "Category");
      params.append("sort[0][field]", "Submitted");
      params.append("sort[0][direction]", "desc");
      const r = await fetch(`${AT_URL}?${params}`, { headers: headers() });
      if (!r.ok) return res.status(502).json({ error: "upstream" });
      const data = await r.json();
      const items = data.records.map((x) => ({ id: x.id, item: x.fields.Item, category: x.fields.Category || "Other" })).filter((x) => x.item);
      res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
      return res.status(200).json({ items });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (body.website) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields
      const items = Array.isArray(body.items) ? body.items.slice(0, 10) : [];
      const records = items
        .map((x) => ({ item: clean(x?.item), category: CATEGORIES.includes(x?.category) ? x.category : "Other" }))
        .filter((x) => x.item)
        .map((x) => ({ fields: { Item: x.item, Category: x.category } }));
      if (!records.length) return res.status(400).json({ error: "no items" });
      const r = await fetch(AT_URL, { method: "POST", headers: headers(), body: JSON.stringify({ records }) });
      if (!r.ok) return res.status(502).json({ error: "upstream" });
      return res.status(200).json({ ok: true, added: records.length });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method" });
  } catch {
    return res.status(500).json({ error: "server" });
  }
}
