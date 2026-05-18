import {
  getCardCategory,
  getDefaultCategoryId,
  type InvalidDeckCard,
  type ParsedDeckEntry,
  type ValidatedDeckCard,
} from "../decklist";
import { getCardPreviewFaces } from "./preview";
import { getCollectionLookupName, normalizeCardQuery } from "./query";
import type { ScryfallCard, ScryfallCollectionResponse } from "./types";

const SCRYFALL_COLLECTION_LIMIT = 75;

async function fetchCardCollectionByEntries(entries: ParsedDeckEntry[]) {
  const response = await fetch("https://api.scryfall.com/cards/collection", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifiers: entries.map((entry) =>
        entry.setCode
          ? { name: getCollectionLookupName(entry.name), set: entry.setCode.toLowerCase() }
          : { name: getCollectionLookupName(entry.name) },
      ),
    }),
  });

  if (!response.ok) {
    throw new Error("Could not validate cards with Scryfall.");
  }

  return (await response.json()) as ScryfallCollectionResponse;
}

function getCardImageUris(card: ScryfallCard) {
  return card.image_uris ?? card.card_faces?.find((face) => face.image_uris)?.image_uris;
}

export async function validateDeckEntries(entries: ParsedDeckEntry[]) {
  if (entries.length === 0) {
    return {
      validCards: [] as ValidatedDeckCard[],
      invalidCards: [] as InvalidDeckCard[],
    };
  }

  const uniqueEntries = [
    ...new Map(
      entries.map((entry) => [
        `${getCollectionLookupName(entry.name).toLowerCase()}::${entry.setCode ?? ""}`,
        entry,
      ]),
    ).values(),
  ];

  const entryBatches: ParsedDeckEntry[][] = [];
  for (let index = 0; index < uniqueEntries.length; index += SCRYFALL_COLLECTION_LIMIT) {
    entryBatches.push(uniqueEntries.slice(index, index + SCRYFALL_COLLECTION_LIMIT));
  }

  const payloads = await Promise.all(entryBatches.map(fetchCardCollectionByEntries));

  const allCards = payloads.flatMap((payload) => payload.data);
  const allNotFound = payloads.flatMap((payload) => payload.not_found ?? []);
  const cardByKey = new Map(
    allCards.map((card) => [`${card.name.toLowerCase()}::${card.set?.toUpperCase() ?? ""}`, card]),
  );
  const cardByNormalizedName = new Map<string, ScryfallCard>();
  const cardByNormalizedNameAndSet = new Map<string, ScryfallCard>();
  const invalidNames = new Set<string>();

  for (const card of allCards) {
    const cardName = card.name.toLowerCase();
    cardByNormalizedName.set(cardName, card);
    cardByNormalizedName.set(normalizeCardQuery(card.name).toLowerCase(), card);
    cardByNormalizedNameAndSet.set(`${cardName}::${card.set?.toUpperCase() ?? ""}`, card);
    cardByNormalizedNameAndSet.set(
      `${normalizeCardQuery(card.name).toLowerCase()}::${card.set?.toUpperCase() ?? ""}`,
      card,
    );
  }

  for (const entry of allNotFound) {
    if (entry.name) {
      invalidNames.add(entry.name.toLowerCase());
    }
  }

  const validCards: ValidatedDeckCard[] = [];
  const invalidCards: InvalidDeckCard[] = [];

  for (const entry of entries) {
    const lookupName = getCollectionLookupName(entry.name);
    const exactMatch = cardByKey.get(`${lookupName.toLowerCase()}::${entry.setCode ?? ""}`);
    const fallbackMatch = entry.setCode
      ? (cardByNormalizedNameAndSet.get(`${lookupName.toLowerCase()}::${entry.setCode}`) ??
        cardByNormalizedNameAndSet.get(
          `${normalizeCardQuery(entry.name).toLowerCase()}::${entry.setCode}`,
        ))
      : (cardByNormalizedName.get(lookupName.toLowerCase()) ??
        cardByNormalizedName.get(normalizeCardQuery(entry.name).toLowerCase()));
    const matchedCard = exactMatch ?? fallbackMatch;

    if (!matchedCard || invalidNames.has(lookupName.toLowerCase())) {
      invalidCards.push({
        lineNumber: entry.lineNumber,
        quantity: entry.quantity,
        name: entry.name,
        reason: entry.setCode
          ? `Card not found on Scryfall for set ${entry.setCode}.`
          : "Card not found on Scryfall.",
      });
      continue;
    }

    const imageUris = getCardImageUris(matchedCard);
    const faces = getCardPreviewFaces(matchedCard);
    const parsedPrice = matchedCard.prices?.usd ? Number(matchedCard.prices.usd) : undefined;

    validCards.push({
      oracleId: matchedCard.oracle_id ?? matchedCard.id,
      name: matchedCard.name,
      quantity: entry.quantity,
      typeLine: matchedCard.type_line,
      categoryId: getDefaultCategoryId(matchedCard.type_line),
      category: getCardCategory(matchedCard.type_line),
      manaCost: matchedCard.mana_cost,
      manaValue: matchedCard.cmc ?? 0,
      producedMana: matchedCard.produced_mana,
      setCode: matchedCard.set?.toUpperCase(),
      collectorNumber: matchedCard.collector_number,
      smallImageUrl: imageUris?.small,
      imageUrl: imageUris?.normal,
      ...(faces ? { faces } : {}),
      priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
      edhrecRank: matchedCard.edhrec_rank ?? null,
    });
  }

  return { validCards, invalidCards };
}
