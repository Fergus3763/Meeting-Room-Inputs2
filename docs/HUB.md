# Hotel Meetings SaaS — Project Hub (public)

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
