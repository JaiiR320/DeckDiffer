import type { DeckStackLayout } from "#/lib/deck";

export function addEmptyStackLane(currentLayout: DeckStackLayout): DeckStackLayout {
  return { ...currentLayout, lanes: [...currentLayout.lanes, []] };
}

export function removeStackLane(
  currentLayout: DeckStackLayout,
  laneIndex: number,
): DeckStackLayout {
  const lane = currentLayout.lanes[laneIndex];
  if (!lane || lane.length > 0) {
    return currentLayout;
  }

  return { ...currentLayout, lanes: currentLayout.lanes.filter((_, index) => index !== laneIndex) };
}
