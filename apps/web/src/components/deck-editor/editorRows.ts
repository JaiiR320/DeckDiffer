import {
  type CardCategory,
  defaultDeckCategories,
  normalizeDeckCard,
  type DeckCategory,
  mergeValidatedCards,
  type ValidatedDeckCard,
} from "../../lib/decklist";
import type { EditorRow } from "./types";

export function buildEditorRows(
  baselineCards: ValidatedDeckCard[],
  workingCards: ValidatedDeckCard[],
  categories: DeckCategory[] = defaultDeckCategories(),
) {
  const baseline = mergeValidatedCards(
    baselineCards.map((card) => normalizeDeckCard(card, categories)),
  );
  const working = mergeValidatedCards(
    workingCards.map((card) => normalizeDeckCard(card, categories)),
  );
  const categoryOrder = new Map(categories.map((category, index) => [category.id, index]));
  const baselineById = new Map(baseline.map((card) => [card.oracleId, card]));
  const workingById = new Map(working.map((card) => [card.oracleId, card]));
  const allIds = new Set([...baselineById.keys(), ...workingById.keys()]);
  const rows: EditorRow[] = [];

  for (const oracleId of allIds) {
    const baselineCard = baselineById.get(oracleId);
    const workingCard = workingById.get(oracleId);
    const baselineQuantity = baselineCard?.quantity ?? 0;
    const currentQuantity = workingCard?.quantity ?? 0;

    rows.push({
      oracleId,
      name: workingCard?.name ?? baselineCard?.name ?? "Unknown Card",
      category: workingCard?.categoryId ?? baselineCard?.categoryId ?? "other",
      typeLine: workingCard?.typeLine ?? baselineCard?.typeLine ?? "",
      manaValue: workingCard?.manaValue ?? baselineCard?.manaValue ?? 0,
      setCode: workingCard?.setCode ?? baselineCard?.setCode,
      collectorNumber: workingCard?.collectorNumber ?? baselineCard?.collectorNumber,
      smallImageUrl: workingCard?.smallImageUrl ?? baselineCard?.smallImageUrl,
      imageUrl: workingCard?.imageUrl ?? baselineCard?.imageUrl,
      baselineQuantity,
      currentQuantity,
      status:
        baselineQuantity === 0
          ? "added"
          : currentQuantity === 0
            ? "removed"
            : baselineQuantity !== currentQuantity
              ? "changed"
              : "same",
    });
  }

  return rows.sort((left, right) => {
    const categoryCompare =
      (categoryOrder.get(left.category) ?? Number.MAX_SAFE_INTEGER) -
      (categoryOrder.get(right.category) ?? Number.MAX_SAFE_INTEGER);
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return left.name.localeCompare(right.name);
  });
}

export function groupEditorRows(
  rows: EditorRow[],
  categories: DeckCategory[] = defaultDeckCategories(),
) {
  const grouped = Object.fromEntries(categories.map((category) => [category.id, []])) as Record<
    CardCategory,
    EditorRow[]
  >;

  for (const row of rows) {
    (grouped[row.category] ??= []).push(row);
  }

  return grouped;
}
