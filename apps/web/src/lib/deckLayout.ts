import {
  CARD_CATEGORIES,
  defaultCategoryIdForName,
  defaultDeckCategories,
  type CardCategory,
  type DeckCategory,
} from "./decklist";
import type { DeckStackLayout } from "./deck";

export function defaultStackLayout(): DeckStackLayout {
  return {
    lanes: [
      ["land"],
      ["creature"],
      ["artifact", "enchantment"],
      ["instant", "sorcery"],
      ["planeswalker", "battle", "other"],
    ],
    showRemovedCardGhosts: true,
  };
}

export function normalizeStackLayout(
  layout: unknown,
  categories: DeckCategory[] = defaultDeckCategories(),
): DeckStackLayout {
  if (!isStackLayoutLike(layout)) {
    return normalizeStackLayout(defaultStackLayout(), categories);
  }

  const categorySet = new Set(categories.map((category) => category.id));
  const legacyNames = new Map(
    CARD_CATEGORIES.map((name) => [name, defaultCategoryIdForName(name)]),
  );
  const seen = new Set<CardCategory>();
  const lanes = layout.lanes.map((lane) =>
    lane.flatMap((category) => {
      const categoryId = legacyNames.get(category as (typeof CARD_CATEGORIES)[number]) ?? category;
      if (!categorySet.has(categoryId) || seen.has(categoryId)) {
        return [];
      }

      seen.add(categoryId);
      return [categoryId];
    }),
  );

  for (const category of categories) {
    if (!seen.has(category.id)) {
      lanes.push([category.id]);
    }
  }

  return lanes.length > 0
    ? { lanes, showRemovedCardGhosts: layout.showRemovedCardGhosts !== false }
    : defaultStackLayout();
}

function isStackLayoutLike(
  layout: unknown,
): layout is { lanes: string[][]; showRemovedCardGhosts?: boolean } {
  return (
    !!layout &&
    typeof layout === "object" &&
    Array.isArray((layout as { lanes?: unknown }).lanes) &&
    (layout as { lanes: unknown[] }).lanes.every(
      (lane) => Array.isArray(lane) && lane.every((category) => typeof category === "string"),
    )
  );
}
