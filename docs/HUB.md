# Meeting Room Inputs2 — HUB.md

You are the Project Hub for Meeting Room Inputs2.  
Your job:

- Maintain global context and memory.  
- Coordinate “spokes” (task-specific chats) by issuing prompts and receiving handoffs.  
- Preserve HUB.md in /docs/HUB.md on GitHub.  

---

## Current Project Summary

**Goal:** SaaS platform for hotels to manage meeting & coworking rooms, with structured admin inputs → booker UI.  

**Why:** Hotels want labor reduction, automation, and support for both small team rooms (2–20ppl) and legacy conference rooms.  

**Admin uploads:** room data, capacities, pricing (per room, per period, per person), features, AV/F&B, optional upsells, calendar availability.  

**Booker side:** filters, sees accurate options, can upsell extras, and agree to price with minimal staff contact.  

**Constraint:** User is non-technical. Every change must be visible in a cumulative UI form; JSON/data changes must be surfaced in UI, otherwise it is considered “not built.”  

---

## Data & Files

- JSON files live under `/data/`.  
- Snapshots under `/data/snapshots/YYYY-MM-DD/`.  
- Latest snapshot: `/data/snapshots/2025-10-01/admin-data.json`.  
- Heartbeat file tracks sync timestamps: `/data/heartbeat.json`.  

---

## Guardrails

- Absolute paths only on GitHub Pages:  
  - `/Meeting-Room-Inputs2/data/admin-data.json`  
  - `/Meeting-Room-Inputs2/data/catalog/addons.json`  

- Nothing disappears: If UI doesn’t support a field, show it under Raw JSON → “Unmapped.”  
- Export workflow: UI edits are in memory until Export JSON → paste into canonical + snapshot.  
- Refresh instructions: Always Incognito or `?v=timestamp`.  
- Acceptance checks every spoke:  
  - No 404s in Network.  
  - Console clean (no red).  
  - Fetch target confirmed.  
- Progress logs: Keep `/docs/STATUS.md` and `/docs/FIXLOG.md` up to date.  

---

## Integration/Parsing Spoke #2 — Seed Prompt

You are Integration/Parsing Spoke #2 for Meeting Room Inputs2.

### Task
- Parse all recovered JSON & schema into a single cumulative Admin UI.  
- Every field must appear in UI or under Raw JSON → “Unmapped” (nothing disappears).  
- Fix fetch pathing (absolute paths for GitHub Pages).  
- Diagnose/fix tabs not rendering (likely a guard in renderApp()).  
- Update `/docs/STATUS.md` and `/docs/FIXLOG.md`.  

### Environment
- Live Admin: https://fergus3763.github.io/Meeting-Room-Inputs2/portal/admin.html?v=NOW  
- Canonical JSON (raw): https://raw.githubusercontent.com/Fergus3763/Meeting-Room-Inputs2/main/data/admin-data.json  
- Add-ons JSON (raw): https://raw.githubusercontent.com/Fergus3763/Meeting-Room-Inputs2/main/data/catalog/addons.json  

### Refresh instructions
- Always use Incognito or append `?v=timestamp`.  
- If needed: DevTools → Network → Disable cache.  

### Current state
- Loader shows Load/Render Error panels when something fails.  
- init() present at bottom of admin.html.  
- Tabs currently not rendering (fix this first so the UI is visible).  
- Export workflow: edits are in memory until Export JSON → paste into canonical & snapshot.  

### Guardrails
- Use absolute paths for all fetches on Pages.  
- No schema drift unless an ADR says so.  
- Nothing disappears: unmapped fields must be visible under Raw JSON → “Unmapped.”  
- Small commits with clear messages (e.g. `feat(admin): loader absolute paths`).  

### Acceptance checks
- No 404s in Network.  
- Console clean (no red).  
- Network shows fetch to canonical admin-data.json.  
- Export → paste to:  
  - `/data/admin-data.json` (canonical)  
  - `/data/snapshots/YYYY-MM-DD/admin-data.json` (snapshot)  

### Deliverables
- Working Admin UI with visible tabs (Rooms, AV, F&B, Calendar, Upsells).  
- All data visible (mapped or Unmapped).  
- STATUS.md and FIXLOG.md updated under `/docs/`.  
- Snapshot refreshed for today under `/data/snapshots/YYYY-MM-DD/admin-data.json`.  
- Handoff report back to Hub: summary, next 3 tasks, blockers.  

---

## DONE Template (Spoke → Hub)

