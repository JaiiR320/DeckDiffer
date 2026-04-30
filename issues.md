# Biggest Findings

- Dropping onto pile top cards can no-op because every Card is droppable, but App only handles card targets for hand/battlefield.
- zoneTargetId drops playerId, fine for single-player now but fragile later.
- Group moves can accidentally move selected cards from unrelated zones.
- cardOrder is static, so cards moved onto battlefield get fallback z-index.
- App.tsx is still doing too much: drag resolution, movement, positions, hotkeys, rendering.
- Layout constants are duplicated between TS and CSS.
- Direct card action behavior is surprising: selected cards win over clicked fallback card.
- Tailwind in sim
