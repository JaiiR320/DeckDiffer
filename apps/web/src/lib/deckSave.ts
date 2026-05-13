import type { DeckSave } from "./deck";
import { normalizeStackLayout } from "./deckLayout";
import { normalizeDeckCard, normalizeDeckCategories } from "./decklist";

export function normalizeDeckSave(save: DeckSave): DeckSave {
  const categories = normalizeDeckCategories(save.categories);
  const cards = save.cards.map((card) => normalizeDeckCard(card, categories));

  return {
    ...save,
    categories,
    cards,
    layout: normalizeStackLayout(save.layout, categories),
  };
}
