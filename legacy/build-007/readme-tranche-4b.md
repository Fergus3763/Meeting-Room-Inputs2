# Tranche 4B — Drop-in Pack

This pack adds:
- Venue-wide inventory check for extras (shared stock).
- Preview-time rules: minimum duration, earliest start / latest end, lead time, cutoff, blackouts, and per-room extra allow-list.
- Duplicate & reorder rooms helpers.
- Debounced updates to remove typing lag.
- A tiny Preview component showing how to wire inventory + rules and disable the "Proceed" button.

## Files

```
src/types/booking.ts
src/engines/inventory.ts
src/engines/constraints.ts
src/utils/rooms.ts
src/hooks/useDebounced.ts
src/components/PreviewIntegrationExample.tsx  (example only)
```

## Quick integration (3 steps)

1) **Add files** from this pack to matching paths in your project.

2) **Use in your preview UI** (pseudo-code):
```tsx
import PreviewIntegrationExample from "./src/components/PreviewIntegrationExample";

<PreviewIntegrationExample
  venue={{ stock: { Projector: 3, LapelMic: 4 } }}
  rooms={rooms}
  draftBookings={draftBookings}
  extrasCatalog={[{ id: "Projector" }, { id: "LapelMic" }]}
  onProceed={() => {/* go next */}}
/>
```

3) **Duplicate & reorder** (example):
```tsx
import { duplicateRoom, move } from "./src/utils/rooms";
setRooms(rs => duplicateRoom(rs, targetRoomId));  // duplicate
setRooms(rs => move(rs, fromIndex, toIndex));     // reorder
```

### Notes
- If multiple extras share one stock pool, give them the same `stockKey`.
- If you allow multiple time ranges in one draft, run `checkInventoryForWindow` for each range or expand to a time-allocator later.
- Show rule issues next to the affected room and in a top banner for clarity.

### Suggested commit
```
feat(4B): venue inventory + preview rules + duplicate/reorder + debounce
```

