import type { DeckCardSortDirection } from "#/lib/deck";

export function applySortDirection(value: number, direction: DeckCardSortDirection) {
  return direction === "asc" ? value : -value;
}

export function comparePrices(
  leftPrice: number | undefined,
  rightPrice: number | undefined,
  direction: DeckCardSortDirection,
) {
  if (leftPrice === undefined && rightPrice === undefined) return 0;
  if (leftPrice === undefined) return 1;
  if (rightPrice === undefined) return -1;
  return applySortDirection(leftPrice - rightPrice, direction);
}

export function compareEdhrecRanks(
  leftRank: number | null | undefined,
  rightRank: number | null | undefined,
  direction: DeckCardSortDirection,
) {
  if (leftRank == null && rightRank == null) return 0;
  if (leftRank == null) return 1;
  if (rightRank == null) return -1;
  return applySortDirection(leftRank - rightRank, direction);
}
