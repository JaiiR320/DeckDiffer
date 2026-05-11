import type { CardCategory } from "#/lib/decklist";

export function laneId(index: number) {
  return `lane-${index}`;
}

export function cardDragId(oracleId: string, category: CardCategory) {
  return `card:${category}:${oracleId}`;
}

export function cardCategoryDropId(category: CardCategory) {
  return `card-category:${category}`;
}
