import type { DeckStackLayout } from "../../../lib/deck";
import { CARD_CATEGORIES, type CardCategory } from "../../../lib/decklist";

export type DropPreview = {
  category: CardCategory;
  laneIndex: number;
  insertIndex: number;
  height: number;
};

export function moveLayoutByPointer(
  layout: DeckStackLayout,
  sourceId: string | number,
  pointerX: number,
  pointerY: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
): DeckStackLayout {
  if (!CARD_CATEGORIES.includes(sourceId as CardCategory)) {
    return layout;
  }

  const sourceCategory = sourceId as CardCategory;
  const lanes = layout.lanes.map((lane) => lane.filter((category) => category !== sourceCategory));
  const { laneIndex, insertIndex } = getDropPlacement(
    layout,
    sourceCategory,
    pointerX,
    pointerY,
    laneElements,
    categoryElements,
  );
  lanes[laneIndex]?.splice(insertIndex, 0, sourceCategory);

  return { lanes };
}

export function getDropPlacement(
  layout: DeckStackLayout,
  sourceCategory: CardCategory,
  pointerX: number,
  pointerY: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
) {
  const lanes = layout.lanes.map((lane) => lane.filter((category) => category !== sourceCategory));
  const laneIndex = getPointerLaneIndex(lanes, pointerX, laneElements);
  const insertIndex = getPointerCategoryIndex(lanes[laneIndex] ?? [], pointerY, categoryElements);

  return { laneIndex, insertIndex };
}

export function getPlaceholderRenderIndex(
  lane: CardCategory[],
  laneIndex: number,
  preview: DropPreview | null,
) {
  if (!preview || preview.laneIndex !== laneIndex) {
    return -1;
  }

  const sourceIndex = lane.indexOf(preview.category);

  if (sourceIndex === preview.insertIndex) {
    return -1;
  }

  if (sourceIndex !== -1 && sourceIndex <= preview.insertIndex) {
    return preview.insertIndex + 1;
  }

  return preview.insertIndex;
}

function getPointerLaneIndex(
  lanes: CardCategory[][],
  pointerX: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
) {
  let nearestLaneIndex = 0;
  let nearestLaneDistance = Number.POSITIVE_INFINITY;

  for (const [laneIndex, element] of laneElements) {
    const rect = element.getBoundingClientRect();

    if (pointerX >= rect.left && pointerX <= rect.right) {
      return laneIndex;
    }

    const distance = Math.abs(pointerX - (rect.left + rect.width / 2));
    if (distance < nearestLaneDistance) {
      nearestLaneDistance = distance;
      nearestLaneIndex = laneIndex;
    }
  }

  return Math.min(nearestLaneIndex, Math.max(0, lanes.length - 1));
}

function getPointerCategoryIndex(
  lane: CardCategory[],
  pointerY: number,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
) {
  for (const [index, category] of lane.entries()) {
    const element = categoryElements.get(category);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (pointerY < rect.top + rect.height / 2) {
      return index;
    }
  }

  return lane.length;
}
