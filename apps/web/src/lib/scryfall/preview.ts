import { normalizeCardQuery } from "./query";
import type { CardPreviewFace, CardPreviewLookup, CardPreviewResult, ScryfallCard } from "./types";

const cardPreviewCache = new Map<string, Promise<CardPreviewResult | null>>();

function toCardPreviewResult(card: ScryfallCard): CardPreviewResult | null {
  const faces: CardPreviewFace[] = [];
  const parsedPrice = card.prices?.usd ? Number(card.prices.usd) : undefined;

  for (const face of card.card_faces ?? []) {
    const smallImageUrl = face.image_uris?.small;
    const imageUrl = face.image_uris?.normal;

    if (!smallImageUrl || !imageUrl) {
      continue;
    }

    faces.push({
      name: face.name ?? card.name,
      typeLine: face.type_line ?? card.type_line,
      manaCost: face.mana_cost,
      oracleText: face.oracle_text,
      smallImageUrl,
      imageUrl,
    });
  }

  const previewFaces = faces.length > 1 ? faces : undefined;
  const frontFace = previewFaces?.[0];
  const faceWithImage = faces?.[0];
  const smallImageUrl =
    frontFace?.smallImageUrl ?? card.image_uris?.small ?? faceWithImage?.smallImageUrl;
  const imageUrl = frontFace?.imageUrl ?? card.image_uris?.normal ?? faceWithImage?.imageUrl;

  if (!smallImageUrl || !imageUrl) {
    return null;
  }

  return {
    name: frontFace?.name ?? card.name,
    typeLine: frontFace?.typeLine ?? card.type_line,
    manaCost: frontFace?.manaCost ?? card.mana_cost,
    oracleText:
      frontFace?.oracleText ??
      card.oracle_text ??
      card.card_faces?.flatMap((face) => (face.oracle_text ? [face.oracle_text] : [])).join("\n\n"),
    setCode: card.set?.toUpperCase(),
    collectorNumber: card.collector_number,
    smallImageUrl,
    imageUrl,
    priceUsd: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
    faces: previewFaces,
  };
}

function getCardPreviewCacheKey({ name, setCode, collectorNumber }: CardPreviewLookup) {
  if (setCode && collectorNumber) {
    return `print::${setCode.toLowerCase()}::${collectorNumber.toLowerCase()}`;
  }

  return `name::${normalizeCardQuery(name).toLowerCase()}`;
}

async function fetchCardPreview({ name, setCode, collectorNumber }: CardPreviewLookup) {
  const headers = { Accept: "application/json" };

  if (setCode && collectorNumber) {
    const printResponse = await fetch(
      `https://api.scryfall.com/cards/${encodeURIComponent(setCode.toLowerCase())}/${encodeURIComponent(collectorNumber.toLowerCase())}`,
      { headers },
    );

    if (printResponse.ok) {
      return toCardPreviewResult((await printResponse.json()) as ScryfallCard);
    }
  }

  const namedResponse = await fetch(
    `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(normalizeCardQuery(name))}`,
    { headers },
  );

  if (!namedResponse.ok) {
    return null;
  }

  return toCardPreviewResult((await namedResponse.json()) as ScryfallCard);
}

export function getCardPreview(lookup: CardPreviewLookup) {
  const cacheKey = getCardPreviewCacheKey(lookup);
  const cachedPreview = cardPreviewCache.get(cacheKey);

  if (cachedPreview) {
    return cachedPreview;
  }

  const previewPromise = fetchCardPreview(lookup).catch(() => null);
  cardPreviewCache.set(cacheKey, previewPromise);
  return previewPromise;
}
