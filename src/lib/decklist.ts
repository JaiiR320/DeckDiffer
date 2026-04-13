export const CARD_CATEGORIES = [
  'Land',
  'Creature',
  'Artifact',
  'Enchantment',
  'Instant',
  'Sorcery',
  'Planeswalker',
  'Battle',
  'Other',
] as const

export type CardCategory = (typeof CARD_CATEGORIES)[number]

export type ParsedDeckEntry = {
  lineNumber: number
  quantity: number
  name: string
}

export type ParsedDeckError = {
  lineNumber: number
  text: string
  reason: string
}

export type ValidatedDeckCard = {
  oracleId: string
  name: string
  quantity: number
  typeLine: string
  category: CardCategory
}

export type InvalidDeckCard = {
  lineNumber: number
  quantity: number
  name: string
  reason: string
}

export type GroupedDeckCards = Record<CardCategory, ValidatedDeckCard[]>

export function createEmptyGroupedDeck(): GroupedDeckCards {
  return {
    Land: [],
    Creature: [],
    Artifact: [],
    Enchantment: [],
    Instant: [],
    Sorcery: [],
    Planeswalker: [],
    Battle: [],
    Other: [],
  }
}

export function parseDecklist(rawText: string) {
  const entries: ParsedDeckEntry[] = []
  const errors: ParsedDeckError[] = []
  const lines = rawText.split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    const text = line.trim()
    if (!text) {
      continue
    }

    const match = text.match(/^(?:(\d+)x?\s+)?(.+)$/i)
    if (!match) {
      errors.push({
        lineNumber: index + 1,
        text,
        reason: 'Could not parse this line.',
      })
      continue
    }

    const quantityText = match[1]
    const name = match[2]?.trim()
    const quantity = quantityText ? Number(quantityText) : 1

    if (!name || Number.isNaN(quantity) || quantity < 1) {
      errors.push({
        lineNumber: index + 1,
        text,
        reason: 'Expected a card name and positive quantity.',
      })
      continue
    }

    entries.push({
      lineNumber: index + 1,
      quantity,
      name,
    })
  }

  return { entries, errors }
}

export function getCardCategory(typeLine: string): CardCategory {
  if (typeLine.includes('Land')) return 'Land'
  if (typeLine.includes('Creature')) return 'Creature'
  if (typeLine.includes('Artifact')) return 'Artifact'
  if (typeLine.includes('Enchantment')) return 'Enchantment'
  if (typeLine.includes('Instant')) return 'Instant'
  if (typeLine.includes('Sorcery')) return 'Sorcery'
  if (typeLine.includes('Planeswalker')) return 'Planeswalker'
  if (typeLine.includes('Battle')) return 'Battle'
  return 'Other'
}

export function groupValidatedCards(cards: ValidatedDeckCard[]) {
  const groupedDeck = createEmptyGroupedDeck()
  const mergedCards = mergeValidatedCards(cards)

  for (const card of mergedCards) {
    groupedDeck[card.category].push(card)
  }

  for (const category of CARD_CATEGORIES) {
    groupedDeck[category].sort((left, right) => left.name.localeCompare(right.name))
  }

  return groupedDeck
}

export function mergeValidatedCards(cards: ValidatedDeckCard[]) {
  const mergedCards = new Map<string, ValidatedDeckCard>()

  for (const card of cards) {
    const existingCard = mergedCards.get(card.oracleId)

    if (existingCard) {
      existingCard.quantity += card.quantity
      continue
    }

    mergedCards.set(card.oracleId, { ...card })
  }

  return [...mergedCards.values()]
}

export function formatDeckExport(cards: ValidatedDeckCard[]) {
  const groupedDeck = groupValidatedCards(cards)

  return CARD_CATEGORIES.flatMap((category) => {
    const categoryCards = groupedDeck[category]
    if (categoryCards.length === 0) {
      return []
    }

    return [category, ...categoryCards.map((card) => `${card.quantity} ${card.name}`), '']
  })
    .join('\n')
    .trim()
}
