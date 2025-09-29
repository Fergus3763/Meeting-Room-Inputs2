# Hotel Meetings SaaS — Project Hub (public)
## Project Purpose & Scope (read first)

**What we’re building**
A hotel-facing, self-serve platform (SaaS) that lets venues publish **meeting rooms** with all pertinent data and variables and lets bookers configure and price them **end-to-end** (room, layouts, durations, included items, and paid add-ons like AV/F&B) **without human back-and-forth**.

**Problem we’re solving**
Meeting-room bookings are slow and labour-intensive because there are many variables and hidden rules. We are targeting the meeting room on-demand market, typically 1-30 persons. Hotels with multiple meeting/conference rooms will likely have property management system requring significant human interaction. this does not facilitate the on-demand/instant booker. Hotels will won’t adopt a second system, so our product must handle **all sizes** (2–20 core focus, but also legacy large rooms) and **complexity**, while still enabling quick, automated quotes for small teams.

**Target users**
- **Hotel/Venue Admins** — maintain room data, hours, pricing, included items, and optional add-ons (AV, F&B, services).
- **Room Bookers** — configure a meeting and get a reliable, transparent price.

**Owner & working style**
- Product owner is **non-technical**. Please give **plain-English**, **2–3 step** instructions, with **exact paths/filenames** and copy-paste snippets.
- Avoid jargon, no background work; surface every required action explicitly.

**Scope (now)**
- Canonical data in repo at `/data/admin-data.json` (snapshots in `/data/snapshots/YYYY-MM-DD/`).
- Baseline UI served from `portal.html`, reading canonical JSON.
- Add-ons catalog standardized in `/data/catalog/addons.json` (schema in `docs/schemas/addons.schema.json`).
- Legacy deploys parked under `/legacy/` for reference only.

**Out of scope (now)**
- Payments, authentication, PMS/CRS integrations, multi-tenant billing.

**Constraints / guardrails**
- Keep **one canonical JSON** source of truth (`/data/admin-data.json`).
- Every substantial change → snapshot to `/data/snapshots/YYYY-MM-DD/admin-data.json`.
- Update `/data/heartbeat.json` so we can spot stale hubs.
- Open an **Issue** for visible chunks of work; reference files and exact paths.

**Success criteria (near-term)**
- Baseline UI loads **only** from `/data/admin-data.json` (no stray/dated JSON).
- Add-ons toggling (included vs optional) supported and priced correctly.
- Hotels can maintain hours, capacities, pricing, and add-ons without code.

---

**Quick Links**
- Portal (live): https://fergus3763.github.io/Meeting-Room-Inputs2/portal.html
- Canonical JSON: https://github.com/Fergus3763/Meeting-Room-Inputs2/blob/main/data/admin-data.json
- Snapshots: https://github.com/Fergus3763/Meeting-Room-Inputs2/tree/main/data/snapshots
- Issues: https://github.com/Fergus3763/Meeting-Room-Inputs2/issues
- Recovery Log: https://github.com/Fergus3763/Meeting-Room-Inputs2/blob/main/legacy/RECOVERY-LOG.md

**Status Block (last updated):**
<paste the current Status Block from the Hub doc here>
2025-09-25: Snapshot saved; heartbeat bumped; starting Integration/Parsing spoke.
docs: update Hub status + next tasks (2025-09-25)

**Status Block (last updated):** 2025-09-25 (Europe/Dublin)

**Progress**
- Canonical JSON updated: [`/data/admin-data.json`](https://github.com/Fergus3763/Meeting-Room-Inputs2/blob/main/data/admin-data.json).
- Snapshot saved: [`/data/snapshots/2025-09-25/admin-data.json`](https://github.com/Fergus3763/Meeting-Room-Inputs2/blob/main/data/snapshots/2025-09-25/admin-data.json).
- Heartbeat bumped: [`/data/heartbeat.json`](https://github.com/Fergus3763/Meeting-Room-Inputs2/blob/main/data/heartbeat.json) (hubISO & snapshotISO).
- Open Issues: 
  - #1 — Pick baseline UI (confirm **Legacy Build 014** is the baseline).
  - #2 — Standardize fetch + paths in Baseline UI (point to `/data/admin-data.json`).

**Next 3 Tasks**
1. Start Integration/Parsing Spoke:
   - Confirm Build 014 renders cleanly.
   - Ensure it loads data from `/data/admin-data.json` (no hard-coded older paths).
2. Wire add-ons catalog:
   - Load `/data/catalog/addons.json` into Admin toggles (include/optional) for Room & F&B/AV.
3. Recovery follow-ups:
   - Inventory remaining legacy builds; note deltas vs. canonical JSON for later merge.

**Maintenance ritual**
- After each working session: update this Status Block, snapshot to `/data/snapshots/YYYY-MM-DD/admin-data.json`, bump `/data/heartbeat.json` (hubISO & snapshotISO), and paste links above.

**Notes**
This mirrors the private Hub in ChatGPT so any spoke can find the latest status.
