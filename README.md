# MT Monitoring Status

Public status page of [portfolio.mtmonitoring.org](https://portfolio.mtmonitoring.org),
served at **https://status.mtmonitoring.org** from GitHub Pages, so it keeps
working when the server is down. DNS (Websupport):
`CNAME status → mirekk1312.github.io`; the `CNAME` file holds the domain.

- `index.html` – the page (static, no dependencies). It reads the live state
  from the public UptimeRobot status page API
  (`stats.uptimerobot.com/api/getMonitorList/Ft8MC8FEW6`, no key) and falls
  back to `status.json`.
- `notice.json` – the outage announcement. Set `"active": true`, edit the
  text and `"updated"`, commit. The page shows it within a minute or two.
  Set `"active": false` when the outage is over. `"severity"`: `"outage"`
  (red) or `"info"` (orange, e.g. planned maintenance).
- `scripts/fetch-status.mjs` – reads the UptimeRobot API (read-only key in the
  `UPTIMEROBOT_API_KEY` secret) and writes `status.json` (fallback state and
  the incident list).
- `.github/workflows/status.yml` – rebuilds the page every 5 minutes (GitHub
  may delay scheduled runs) and on every push. It adds an empty "keepalive"
  commit after 50 days without commits, because GitHub turns scheduled
  workflows off after 60.
