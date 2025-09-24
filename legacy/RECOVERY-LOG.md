# Recovery Log
- build-002: index, _redirects
- build-003: index, _redirects, admin-data-legacy.json
# Recovery Log
**Date:** (fill in)

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
