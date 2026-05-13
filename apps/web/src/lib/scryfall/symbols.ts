import type { CardSymbol, ScryfallSymbologyResponse } from "./types";

let cardSymbolsCache: Promise<Map<string, CardSymbol>> | null = null;

async function fetchCardSymbols() {
  const response = await fetch("https://api.scryfall.com/symbology", {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Could not load Scryfall card symbols.");
  }

  const payload = (await response.json()) as ScryfallSymbologyResponse;

  return new Map(
    payload.data.map((symbol) => [
      symbol.symbol,
      {
        symbol: symbol.symbol,
        english: symbol.english,
        svgUri: symbol.svg_uri,
      },
    ]),
  );
}

export function getCardSymbols() {
  if (cardSymbolsCache) {
    return cardSymbolsCache;
  }

  cardSymbolsCache = fetchCardSymbols().catch((error) => {
    cardSymbolsCache = null;
    throw error;
  });

  return cardSymbolsCache;
}
