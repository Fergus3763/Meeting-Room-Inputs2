# Recovery Log
- build-002: index, _redirects
- build-003: index, _redirects, admin-data-legacy.json
- **Legacy builds archived:**  
[001](../build-001/) · [002](../build-002/) · [003](../build-003/) · [004](../build-004/) · [005](../build-005/) · [006](../build-006/) · [007](../build-007/) · [008](../build-008/) · [009](../build-009/) · [010](../build-010/) · [011](../build-011/) · [012](../build-012/) · [013](../build-013/) · [014](../build-014/) · [015](../build-015/) · [016](../build-016/) · [017](../build-017/) · [018](../build-018/)  
**Misc JSONs:** [legacy/misc](../misc/)

# Recovery Log
**Date:** (24/09/2025) Portal misc link verified; release created.”

## Summary
- Kept one backup: `data/admin-data-BACKUP.json` (or dated file).
- Added legacy builds: 001–018 in `/legacy/build-XXX/`.
- Added orphan JSONs in `/legacy/misc/` as `admin-data-legacy-*.json`.
- Updated `portal.html` with links to builds 001–018 and “Legacy Misc (JSON)”.

## Notes
- Official app data file (“canonical”): `/data/admin-data.json`.
- If a legacy build isn’t responsive on GitHub Pages, add  
  `<base href="/Meeting-Room-Inputs2/legacy/build-XXX/">` inside `<head>` and hard refresh.

## Next
- Optional: test a legacy JSON by temporarily pasting it into `data/admin-data.json` (backup exists).
