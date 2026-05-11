import type { DeckStackLayout } from "../../lib/deck";

export function toggleEmptyStackLaneInLayout(currentLayout: DeckStackLayout): DeckStackLayout {
  let emptyLaneIndex = -1;

  for (let index = currentLayout.lanes.length - 1; index >= 0; index -= 1) {
    if (currentLayout.lanes[index]?.length === 0) {
      emptyLaneIndex = index;
      break;
    }
  }

  return emptyLaneIndex >= 0
    ? { lanes: currentLayout.lanes.filter((_, index) => index !== emptyLaneIndex) }
    : { lanes: [...currentLayout.lanes, []] };
}
