// Writes _site/status.json from the UptimeRobot API (read-only key in the
// UPTIMEROBOT_API_KEY secret). Only names, states and uptime go out - no
// monitor URLs. On any error it writes {"error": ...} so the page still
// deploys and shows the notice. Node 20+, no dependencies.
import { mkdirSync, writeFileSync } from "node:fs";

const DAYS = 30;
const DAY = 86400;
const out = "_site/status.json";
mkdirSync("_site", { recursive: true });

async function main() {
  const key = process.env.UPTIMEROBOT_API_KEY;
  if (!key) throw new Error("UPTIMEROBOT_API_KEY is not set");
  const now = Math.floor(Date.now() / 1000);
  const today = now - (now % DAY); // UTC midnight
  const days = [];
  for (let i = DAYS - 1; i >= 0; i--) days.push(today - i * DAY);
  const ranges = days.map((d) => `${d}_${Math.min(d + DAY, now)}`).join("-");

  const r = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({
      api_key: key, format: "json", logs: "1", logs_start_date: String(today - (DAYS - 1) * DAY),
      custom_uptime_ratios: String(DAYS), custom_uptime_ranges: ranges,
    }),
  });
  const data = await r.json();
  if (data.stat !== "ok") throw new Error(`UptimeRobot: ${JSON.stringify(data.error || data)}`);

  const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
  const monitors = data.monitors.map((m) => {
    const daily = String(m.custom_uptime_ranges || "").split("-");
    return {
      name: m.friendly_name,
      status: m.status,
      uptime30: num(m.custom_uptime_ratio),
      // Days before the monitor existed have no data.
      days: days.map((d, i) => ({ date: d, uptime: d + DAY <= m.create_datetime ? null : num(daily[i]) })),
      // Logs come newest first; the newest down log of a monitor that is down
      // now is still ongoing (its duration only counts up to now).
      incidents: (m.logs || []).filter((l) => l.type === 1)
        .map((l, i) => ({ start: l.datetime, duration: i === 0 && m.status >= 8 ? null : l.duration || null })),
    };
  });
  writeFileSync(out, JSON.stringify({ generated: now, monitors }));
  console.log(`status.json: ${monitors.map((m) => `${m.name}=${m.status}`).join(", ")}`);
}

main().catch((e) => {
  console.error(e.message);
  writeFileSync(out, JSON.stringify({ generated: Math.floor(Date.now() / 1000), error: "status unavailable" }));
});
