import { getCardCategory, getDefaultCategoryId } from "../decklist";
import { normalizeCardQuery } from "./query";
import type {
  ScryfallCard,
  ScryfallErrorResponse,
  ScryfallSearchResponse,
  SearchCardResult,
} from "./types";

function toSearchCardResult(card: ScryfallCard): SearchCardResult {
  const imageUris = card.image_uris ?? card.card_faces?.find((face) => face.image_uris)?.image_uris;
  const parsedPrice = card.prices?.usd ? Number(card.prices.usd) : undefined;

  return {
    oracleId: card.oracle_id ?? card.id,
    name: card.name,
    typeLine: card.type_line,
    category: getCardCategory(card.type_line),
    categoryId: getDefaultCategoryId(card.type_line),
    manaValue: card.cmc ?? 0,
    setCode: card.set?.toUpperCase(),
    collectorNumber: card.collector_number,
    smallImageUrl: imageUris?.small,
    imageUrl: imageUris?.normal,
    priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
  };
}

export async function searchCards(query: string) {
  const normalizedQuery = normalizeCardQuery(query);
  const headers = { Accept: "application/json" };

  if (normalizedQuery.includes("//")) {
    const namedResponse = await fetch(
      `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(normalizedQuery)}`,
      { headers },
    );

    if (namedResponse.ok) {
      const card = (await namedResponse.json()) as ScryfallCard;
      return [toSearchCardResult(card)];
    }

    const namedError = (await namedResponse.json()) as ScryfallErrorResponse;
    if (namedError.object !== "error") {
      return [] as SearchCardResult[];
    }
  }

  const response = await fetch(
    `https://api.scryfall.com/cards/search?unique=cards&order=name&q=${encodeURIComponent(normalizedQuery)}`,
    { headers },
  );

  if (!response.ok) {
    const fallbackResponse = await fetch(
      `https://api.scryfall.com/cards/search?unique=cards&order=name&q=${encodeURIComponent(`name:"${normalizedQuery}"`)}`,
      { headers },
    );

    if (!fallbackResponse.ok) {
      return [] as SearchCardResult[];
    }

    const fallbackPayload = (await fallbackResponse.json()) as ScryfallSearchResponse;
    return fallbackPayload.data.slice(0, 8).map(toSearchCardResult);
  }

  const payload = (await response.json()) as ScryfallSearchResponse;

  return payload.data.slice(0, 8).map(toSearchCardResult);
}
