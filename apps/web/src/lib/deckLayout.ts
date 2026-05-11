import { CARD_CATEGORIES, type CardCategory } from "./decklist";
import type { DeckStackLayout } from "./deck";

const categorySet = new Set<string>(CARD_CATEGORIES);

export function defaultStackLayout(): DeckStackLayout {
  return {
    lanes: [
      ["Land"],
      ["Creature"],
      ["Artifact", "Enchantment"],
      ["Instant", "Sorcery"],
      ["Planeswalker", "Battle", "Other"],
    ],
  };
}

export function normalizeStackLayout(layout: unknown): DeckStackLayout {
  if (!isStackLayoutLike(layout)) {
    return defaultStackLayout();
  }

  const seen = new Set<CardCategory>();
  const lanes = layout.lanes.map((lane) =>
    lane.filter((category): category is CardCategory => {
      if (!categorySet.has(category) || seen.has(category as CardCategory)) {
        return false;
      }

      seen.add(category as CardCategory);
      return true;
    }),
  );

  for (const category of CARD_CATEGORIES) {
    if (!seen.has(category)) {
      lanes.push([category]);
    }
  }

  return lanes.length > 0 ? { lanes } : defaultStackLayout();
}

function isStackLayoutLike(layout: unknown): layout is { lanes: string[][] } {
  return (
    !!layout &&
    typeof layout === "object" &&
    Array.isArray((layout as { lanes?: unknown }).lanes) &&
    (layout as { lanes: unknown[] }).lanes.every(
      (lane) => Array.isArray(lane) && lane.every((category) => typeof category === "string"),
    )
  );
}
