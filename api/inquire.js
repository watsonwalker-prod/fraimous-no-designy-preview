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

  const kind = String(data.kind || "").trim().toLowerCase();
  const email = String(data.email || "").trim();
  const name = String(data.name || "").trim();
  const note = String(data.note || data.message || "").trim();
  const slug = String(data.slug || "").trim();
  const title = String(data.title || slug).trim();
  const provider = String(data.provider || "").trim();
  const source = String(data.source || "").trim();

  const isNotify = kind === "notify";
  const isJoin = kind === "join" || kind === "list";

  if (isJoin) {
    if (!email) return res.status(400).json({ ok: false, error: "missing" });
  } else if (isNotify) {
    if (!email || !slug) return res.status(400).json({ ok: false, error: "missing" });
  } else if (!email || !name || !note) {
    return res.status(400).json({ ok: false, error: "missing" });
  }

  const to = isJoin ? "hello@fraimous.com" : "[email removed]";
  const subject = isJoin
    ? "FRAIMOUS list — " + email
    : isNotify
      ? "FRAIMOUS notify — " + (title || slug)
      : "FRAIMOUS inquire — " + name;

  const message = isJoin
    ? ["FRAIMOUS list", "", email, name, provider && ("provider: " + provider), source && ("source: " + source)]
        .filter(Boolean)
        .join("\n")
    : isNotify
      ? ["FRAIMOUS notify", "", email, slug, title].join("\n")
      : ["FRAIMOUS inquire", "", name, email, "", note].join("\n");

  const fromName = isJoin
    ? (name || "FRAIMOUS list")
    : isNotify
      ? (title || "FRAIMOUS notify")
      : (name || "FRAIMOUS inquire");

  try {
    const r = await fetch("https://formsubmit.co/ajax/" + to, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Origin: "https://fraimous.com",
        Referer: "https://fraimous.com/",
      },
      body: JSON.stringify({
        name: fromName,
        email,
        _subject: subject,
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
