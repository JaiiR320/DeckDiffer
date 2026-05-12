import { deckSaves, decks } from "#/db/schema";
import type { DeckItem, DeckSave } from "#/lib/deck";

type DeckRow = typeof decks.$inferSelect;
export type DeckSaveRow = typeof deckSaves.$inferSelect;

function mapDeckSave(save: DeckSaveRow): DeckSave {
  return {
    id: save.id,
    label: save.label,
    savedAt: save.savedAt.toISOString(),
    categories: save.categories ?? undefined,
    cards: save.cards,
    layout: save.layout ?? undefined,
  };
}

export function mapDeck(deck: DeckRow, saves: DeckSaveRow[]): DeckItem {
  return {
    id: deck.slug,
    name: deck.name,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
    categories: deck.categories ?? undefined,
    cards: deck.cards ?? undefined,
    layout: deck.layout ?? undefined,
    saves: saves.map(mapDeckSave),
  };
}
