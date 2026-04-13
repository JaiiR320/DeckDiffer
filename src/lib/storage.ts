import type { DeckItem } from './deck'

const STORAGE_KEY = 'deckdiffer:decks'

/**
 * Loads all decks from localStorage.
 * Returns empty array if no decks exist or if parsing fails.
 */
export function loadDecks(): DeckItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return []
    }
    const parsed = JSON.parse(stored) as DeckItem[]
    // Basic validation - ensure it's an array
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    // If parsing fails, return empty array
    return []
  }
}

/**
 * Saves all decks to localStorage.
 */
export function saveDecks(decks: DeckItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(decks))
  } catch (error) {
    console.error('Failed to save decks to localStorage:', error)
  }
}

/**
 * Loads a single deck by its ID (slug).
 * Returns undefined if not found.
 */
export function loadDeckById(id: string): DeckItem | undefined {
  const decks = loadDecks()
  return decks.find((deck) => deck.id === id)
}

/**
 * Inserts a new deck or updates an existing one (matched by ID).
 * Updates the deck's updatedAt timestamp before saving.
 */
export function upsertDeck(deck: DeckItem): void {
  const decks = loadDecks()
  const existingIndex = decks.findIndex((d) => d.id === deck.id)

  const deckToSave = {
    ...deck,
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    decks[existingIndex] = deckToSave
  } else {
    decks.push(deckToSave)
  }

  saveDecks(decks)
}

/**
 * Deletes a deck by its ID.
 * Returns true if a deck was deleted, false otherwise.
 */
export function deleteDeck(id: string): boolean {
  const decks = loadDecks()
  const initialLength = decks.length
  const filtered = decks.filter((deck) => deck.id !== id)

  if (filtered.length === initialLength) {
    return false
  }

  saveDecks(filtered)
  return true
}
