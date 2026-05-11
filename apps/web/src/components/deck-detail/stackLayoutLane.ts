import type { DeckStackLayout } from "../../lib/deck";

export function addEmptyStackLane(currentLayout: DeckStackLayout): DeckStackLayout {
  return { lanes: [...currentLayout.lanes, []] };
}

export function removeStackLane(
  currentLayout: DeckStackLayout,
  laneIndex: number,
): DeckStackLayout {
  const lane = currentLayout.lanes[laneIndex];
  if (!lane || lane.length > 0) {
    return currentLayout;
  }

  return { lanes: currentLayout.lanes.filter((_, index) => index !== laneIndex) };
}
