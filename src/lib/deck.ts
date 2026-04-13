import type { ValidatedDeckCard } from './decklist'

export type DeckSave = {
  id: string // crypto.randomUUID()
  savedAt: string // ISO-8601
  label: string // "Save #N" or user-provided
  cards: ValidatedDeckCard[]
}

export type DeckItem = {
  id: string // slugified name, e.g., "my-commander-deck"
  name: string
  createdAt: string // ISO-8601
  updatedAt: string // ISO-8601
  saves: DeckSave[] // oldest-first
}

/**
 * Converts a deck name to a URL-safe slug for use as the deck ID.
 * "My Commander Deck" → "my-commander-deck"
 */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars except underscores, spaces, hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
}

/**
 * Creates a new DeckItem with a slugified ID and empty saves array.
 */
export function createDeck(name: string): DeckItem {
  const now = new Date().toISOString()
  return {
    id: slugifyName(name),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    saves: [],
  }
}

/**
 * Creates a new DeckSave with the given cards and optional label.
 * If no label is provided, generates "Save #N" based on saveCount.
 */
export function createDeckSave(
  cards: ValidatedDeckCard[],
  label?: string,
  saveCount?: number,
): DeckSave {
  const finalLabel = label?.trim() || `Save #${(saveCount ?? 0) + 1}`
  return {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    label: finalLabel,
    cards: [...cards], // Shallow copy to prevent accidental mutation
  }
}

/**
 * Returns the most recent save for a deck, or null if no saves exist.
 */
export function getLatestSave(deck: DeckItem): DeckSave | null {
  if (deck.saves.length === 0) {
    return null
  }
  return deck.saves[deck.saves.length - 1]
}

/**
 * Updates a deck's updatedAt timestamp and returns the modified deck.
 */
export function touchDeck(deck: DeckItem): DeckItem {
  return {
    ...deck,
    updatedAt: new Date().toISOString(),
  }
}
