import type { CardCategory, DeckCategory, ValidatedDeckCard } from "./decklist";

export type DeckCardSort = "manaValue" | "alphabetical";
export type DeckCardSortDirection = "asc" | "desc";

export type DeckStackLayout = {
  lanes: CardCategory[][];
  showRemovedCardGhosts?: boolean;
  cardSort?: DeckCardSort;
  cardSortDirection?: DeckCardSortDirection;
};

export type DeckSave = {
  id: string; // crypto.randomUUID()
  savedAt: string; // ISO-8601
  label: string; // "Save #N" or user-provided
  categories?: DeckCategory[];
  cards: ValidatedDeckCard[];
  layout?: DeckStackLayout;
};

export type DeckItem = {
  id: string; // slugified name, e.g., "my-commander-deck"
  name: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  categories?: DeckCategory[];
  cards?: ValidatedDeckCard[];
  layout?: DeckStackLayout;
  saves: DeckSave[]; // oldest-first
};

/**
 * Converts a deck name to a URL-safe slug for use as the deck ID.
 * "My Commander Deck" → "my-commander-deck"
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars except underscores, spaces, hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Returns the most recent save for a deck, or null if no saves exist.
 */
export function getLatestSave(deck: DeckItem): DeckSave | null {
  if (deck.saves.length === 0) {
    return null;
  }
  return deck.saves[deck.saves.length - 1];
}
