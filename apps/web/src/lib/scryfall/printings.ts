import type { CardPrintingOption, ScryfallCard, ScryfallListResponse } from "./types";

const cardPrintingsCache = new Map<string, Promise<CardPrintingOption[]>>();

function getCardImageUris(card: ScryfallCard) {
  return card.image_uris ?? card.card_faces?.find((face) => face.image_uris)?.image_uris;
}

function toCardPrintingOption(card: ScryfallCard): CardPrintingOption {
  const imageUris = getCardImageUris(card);
  const parsedPrice = card.prices?.usd ? Number(card.prices.usd) : undefined;

  return {
    scryfallId: card.id,
    oracleId: card.oracle_id ?? card.id,
    name: card.name,
    setCode: card.set.toUpperCase(),
    setName: card.set_name ?? card.set.toUpperCase(),
    collectorNumber: card.collector_number,
    releasedAt: card.released_at ?? "",
    priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
    smallImageUrl: imageUris?.small,
    imageUrl: imageUris?.normal,
  };
}

async function fetchPrintingsPage(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error("Could not load card printings from Scryfall.");
  }

  return (await response.json()) as ScryfallListResponse<ScryfallCard>;
}

async function fetchPrintingsFrom(url: string): Promise<CardPrintingOption[]> {
  const payload = await fetchPrintingsPage(url);
  const printings = payload.data.map(toCardPrintingOption);

  if (!payload.next_page) {
    return printings;
  }

  return [...printings, ...(await fetchPrintingsFrom(payload.next_page))];
}

function fetchCardPrintings(oracleId: string) {
  const url = `https://api.scryfall.com/cards/search?unique=prints&order=released&q=${encodeURIComponent(`oracleid:${oracleId}`)}`;
  return fetchPrintingsFrom(url);
}

export function getCardPrintings(oracleId: string) {
  const cachedPrintings = cardPrintingsCache.get(oracleId);
  if (cachedPrintings) {
    return cachedPrintings;
  }

  const printingsPromise = fetchCardPrintings(oracleId).catch((error) => {
    cardPrintingsCache.delete(oracleId);
    throw error;
  });
  cardPrintingsCache.set(oracleId, printingsPromise);
  return printingsPromise;
}
