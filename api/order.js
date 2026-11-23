module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false });

  let data = req.body;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  if (!data || typeof data !== "object") data = {};

  const email = String(data.email || "").trim();
  const name = String(data.name || "").trim();
  if (!email || !name) return res.status(400).json({ ok: false, error: "missing" });

  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return res.status(400).json({ ok: false, error: "empty" });
  const lines = items.map((item) => {
    const q = item.qty || 1;
    return `${item.title || item.slug} — ${item.frame || "black"}, ${item.size || "16×20"} ×${q}`;
  });
  const ship = [
    name,
    data.address,
    data.apt,
    [data.city, data.state, data.zip].filter(Boolean).join(", "),
    data.country,
  ].filter(Boolean).join("\n");

  const message = [
    "FRAIMOUS order",
    "",
    lines.join("\n"),
    "",
    data.total ? `prints ${data.total}` : "",
    data.shipLine || "",
    "",
    "ship to",
    ship,
    "",
    `customer ${email}`,
    data.placedAt || "",
  ].filter((x, i, a) => !(x === "" && (i === 0 || a[i - 1] === ""))).join("\n");

  try {
    const r = await fetch("https://formsubmit.co/ajax/[email removed]", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://fraimous.com",
        Referer: "https://fraimous.com/checkout",
      },
      body: JSON.stringify({
        name: name || "FRAIMOUS order",
        email,
        _subject: items.length === 1
          ? `FRAIMOUS order — ${items[0].title || items[0].slug}`
          : `FRAIMOUS order — ${items.length} prints`,
        _template: "box",
        message,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ ok: false, error: "mail" });
    return res.status(200).json({ ok: true, activate: /activate|confirm/i.test(JSON.stringify(out)) });
  } catch (err) {
    return res.status(502).json({ ok: false, error: "mail" });
  }
};
