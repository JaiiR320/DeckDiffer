import { slugifyName, type DeckItem } from './deck'
import type { ValidatedDeckCard } from './decklist'

export type LegacyDeckImportSave = {
  label: string
  savedAt: Date
  cards: ValidatedDeckCard[]
}

export type LegacyDeckImport = {
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  saves: LegacyDeckImportSave[]
}

export function parseImportDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? fallback : parsed
}

export function resolveLegacyImportIdentity(name: string, existingSlugs: Set<string>) {
  const trimmedName = name.trim() || 'Deck'
  const baseSlug = slugifyName(trimmedName) || 'deck'
  let nextName = trimmedName
  let nextSlug = baseSlug
  let suffix = 2

  while (existingSlugs.has(nextSlug)) {
    nextName = `${trimmedName} (${suffix})`
    nextSlug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  existingSlugs.add(nextSlug)

  return {
    name: nextName,
    slug: nextSlug,
  }
}

export function normalizeLegacyDecks(legacyDecks: DeckItem[], existingSlugs: Set<string>) {
  const normalizedDecks: LegacyDeckImport[] = []

  for (const legacyDeck of legacyDecks) {
    if (!legacyDeck || typeof legacyDeck.name !== 'string' || !legacyDeck.name.trim()) {
      continue
    }

    const fallbackCreatedAt = new Date()
    const createdAt = parseImportDate(legacyDeck.createdAt, fallbackCreatedAt)
    const updatedAt = parseImportDate(legacyDeck.updatedAt, createdAt)
    const identity = resolveLegacyImportIdentity(legacyDeck.name, existingSlugs)
    const rawSaves = Array.isArray(legacyDeck.saves) ? legacyDeck.saves : []
    const saves: LegacyDeckImportSave[] = []

    for (const save of rawSaves) {
      if (!save || !Array.isArray(save.cards)) {
        continue
      }

      saves.push({
        label: typeof save.label === 'string' && save.label.trim() ? save.label.trim() : 'Imported save',
        savedAt: parseImportDate(save.savedAt, updatedAt),
        cards: save.cards,
      })
    }

    normalizedDecks.push({
      name: identity.name,
      slug: identity.slug,
      createdAt,
      updatedAt,
      saves,
    })
  }

  return normalizedDecks
}
