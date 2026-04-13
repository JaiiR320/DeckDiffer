import {
  type InvalidDeckCard,
  type ParsedDeckEntry,
  type ValidatedDeckCard,
  getCardCategory,
} from './decklist'

type ScryfallCard = {
  name: string
  oracle_id: string | null
  id: string
  type_line: string
}

type ScryfallCollectionResponse = {
  data: ScryfallCard[]
  not_found?: Array<{ name?: string }>
}

type ScryfallSearchResponse = {
  data: ScryfallCard[]
}

export type SearchCardResult = {
  oracleId: string
  name: string
  typeLine: string
  category: ReturnType<typeof getCardCategory>
}

const SCRYFALL_COLLECTION_LIMIT = 75

function chunkNames(names: string[], size: number) {
  const chunks: string[][] = []

  for (let index = 0; index < names.length; index += size) {
    chunks.push(names.slice(index, index + size))
  }

  return chunks
}

async function fetchCardCollection(names: string[]) {
  const response = await fetch('https://api.scryfall.com/cards/collection', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      identifiers: names.map((name) => ({ name })),
    }),
  })

  if (!response.ok) {
    throw new Error('Could not validate cards with Scryfall.')
  }

  return (await response.json()) as ScryfallCollectionResponse
}

export async function searchCards(query: string) {
  const response = await fetch(
    `https://api.scryfall.com/cards/search?unique=cards&order=name&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    return [] as SearchCardResult[]
  }

  const payload = (await response.json()) as ScryfallSearchResponse

  return payload.data.slice(0, 8).map((card) => ({
    oracleId: card.oracle_id ?? card.id,
    name: card.name,
    typeLine: card.type_line,
    category: getCardCategory(card.type_line),
  }))
}

export async function validateDeckEntries(entries: ParsedDeckEntry[]) {
  if (entries.length === 0) {
    return {
      validCards: [] as ValidatedDeckCard[],
      invalidCards: [] as InvalidDeckCard[],
    }
  }

  const uniqueNames = [...new Set(entries.map((entry) => entry.name))]

  const payloads: ScryfallCollectionResponse[] = []

  for (const chunk of chunkNames(uniqueNames, SCRYFALL_COLLECTION_LIMIT)) {
    payloads.push(await fetchCardCollection(chunk))
  }

  const allCards = payloads.flatMap((payload) => payload.data)
  const allNotFound = payloads.flatMap((payload) => payload.not_found ?? [])
  const cardByName = new Map(allCards.map((card) => [card.name.toLowerCase(), card]))
  const invalidNames = new Set(
    allNotFound.map((entry) => entry.name?.toLowerCase()).filter(Boolean),
  )

  const validCards: ValidatedDeckCard[] = []
  const invalidCards: InvalidDeckCard[] = []

  for (const entry of entries) {
    const exactMatch = cardByName.get(entry.name.toLowerCase())
    const fallbackMatch = allCards.find((card) => card.name.toLowerCase() === entry.name.toLowerCase())
    const matchedCard = exactMatch ?? fallbackMatch

    if (!matchedCard || invalidNames.has(entry.name.toLowerCase())) {
      invalidCards.push({
        lineNumber: entry.lineNumber,
        quantity: entry.quantity,
        name: entry.name,
        reason: 'Card not found on Scryfall.',
      })
      continue
    }

    validCards.push({
      oracleId: matchedCard.oracle_id ?? matchedCard.id,
      name: matchedCard.name,
      quantity: entry.quantity,
      typeLine: matchedCard.type_line,
      category: getCardCategory(matchedCard.type_line),
    })
  }

  return { validCards, invalidCards }
}
