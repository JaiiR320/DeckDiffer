import type { CardCategory, InvalidDeckCard, ValidatedDeckCard } from "#/lib/decklist";

export type DeckState = {
  rawText: string;
  cards: ValidatedDeckCard[];
  invalidCards: InvalidDeckCard[];
  status: "idle" | "loading" | "ready" | "error";
  errorMessage: string | null;
};

export type EditorRow = {
  oracleId: string;
  name: string;
  category: CardCategory;
  typeLine: string;
  manaValue: number;
  setCode?: string;
  collectorNumber?: string;
  smallImageUrl?: string;
  imageUrl?: string;
  priceUsd?: number;
  baselineQuantity: number;
  currentQuantity: number;
  status: "same" | "added" | "removed" | "changed";
};

export type CategoryDiff = {
  previousName?: string;
};

export type ExportModalState = {
  includeQuantity: boolean;
};
