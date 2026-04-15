import { describe, expect, it } from 'vitest'
import { normalizeLegacyDecks, resolveLegacyImportIdentity } from './legacy-deck-import'
import type { DeckItem } from './deck'

describe('resolveLegacyImportIdentity', () => {
  it('creates suffixed copies instead of reusing an existing slug', () => {
    const existingSlugs = new Set(['my-deck', 'my-deck-2'])

    const identity = resolveLegacyImportIdentity('My Deck', existingSlugs)

    expect(identity).toEqual({
      name: 'My Deck (3)',
      slug: 'my-deck-3',
    })
    expect(existingSlugs.has('my-deck-3')).toBe(true)
  })
})

describe('normalizeLegacyDecks', () => {
  it('preserves valid decks while suffixing colliding imports', () => {
    const legacyDecks: DeckItem[] = [
      {
        id: 'my-deck',
        name: 'My Deck',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        saves: [
          {
            id: 'save-1',
            label: 'Save #1',
            savedAt: '2024-01-02T00:00:00.000Z',
            cards: [],
          },
        ],
      },
    ]

    const normalized = normalizeLegacyDecks(legacyDecks, new Set(['my-deck']))

    expect(normalized).toHaveLength(1)
    expect(normalized[0]?.name).toBe('My Deck (2)')
    expect(normalized[0]?.slug).toBe('my-deck-2')
    expect(normalized[0]?.saves).toHaveLength(1)
    expect(normalized[0]?.saves[0]?.label).toBe('Save #1')
  })

  it('skips malformed decks and malformed saves instead of importing them', () => {
    const malformedLegacyDecks = [
      null,
      {
        id: 'blank-name',
        name: '   ',
        createdAt: 'bad-date',
        updatedAt: 'bad-date',
        saves: [],
      },
      {
        id: 'valid-deck',
        name: 'Imported Deck',
        createdAt: 'bad-date',
        updatedAt: '2024-02-01T00:00:00.000Z',
        saves: [
          null,
          {
            id: 'bad-save',
            label: 'Broken Save',
            savedAt: '2024-02-02T00:00:00.000Z',
            cards: 'not-an-array',
          },
          {
            id: 'good-save',
            label: '  ',
            savedAt: 'bad-date',
            cards: [],
          },
        ],
      },
    ] as DeckItem[]

    const normalized = normalizeLegacyDecks(malformedLegacyDecks, new Set())

    expect(normalized).toHaveLength(1)
    expect(normalized[0]?.name).toBe('Imported Deck')
    expect(normalized[0]?.saves).toHaveLength(1)
    expect(normalized[0]?.saves[0]?.label).toBe('Imported save')
    expect(normalized[0]?.updatedAt.toISOString()).toBe('2024-02-01T00:00:00.000Z')
  })
})
