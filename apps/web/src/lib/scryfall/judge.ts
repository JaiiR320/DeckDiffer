import { searchCards } from "./search";
import { normalizeCardQuery } from "./query";
import type {
  JudgeCardContext,
  ScryfallAutocompleteResponse,
  ScryfallErrorResponse,
  ScryfallJudgeCard,
  ScryfallListResponse,
  ScryfallRuling,
} from "./types";

function parseReferencedCardNames(message: string) {
  const matches = message.matchAll(/\[\[([^\]]+)\]\]/g);
  const names = new Set<string>();

  for (const match of matches) {
    const name = normalizeCardQuery(match[1] ?? "");
    if (name) {
      names.add(name);
    }
  }

  return [...names];
}

export function stripCardReferenceMarkup(message: string) {
  return message
    .replace(/\[\[([^\]]+)\]\]/g, (_, cardName: string) => normalizeCardQuery(cardName))
    .trim();
}

function toJudgeCardContext(card: ScryfallJudgeCard, rulings: ScryfallRuling[]): JudgeCardContext {
  const cardFaces = Array.isArray(card.card_faces)
    ? card.card_faces.flatMap((face) => {
        if (!face || typeof face !== "object") {
          return [];
        }

        const faceRecord = face as Record<string, unknown>;

        return [{
          object: typeof faceRecord.object === "string" ? faceRecord.object : null,
          name: typeof faceRecord.name === "string" ? faceRecord.name : null,
          mana_cost: typeof faceRecord.mana_cost === "string" ? faceRecord.mana_cost : null,
          type_line: typeof faceRecord.type_line === "string" ? faceRecord.type_line : null,
          oracle_text: typeof faceRecord.oracle_text === "string" ? faceRecord.oracle_text : null,
          colors: Array.isArray(faceRecord.colors)
            ? faceRecord.colors.filter((value): value is string => typeof value === "string")
            : null,
          color_indicator: Array.isArray(faceRecord.color_indicator)
            ? faceRecord.color_indicator.filter((value): value is string => typeof value === "string")
            : null,
          power: typeof faceRecord.power === "string" ? faceRecord.power : null,
          toughness: typeof faceRecord.toughness === "string" ? faceRecord.toughness : null,
          loyalty: typeof faceRecord.loyalty === "string" ? faceRecord.loyalty : null,
          defense: typeof faceRecord.defense === "string" ? faceRecord.defense : null,
        }];
      })
    : null;

  return {
    object: typeof card.object === "string" ? card.object : null,
    id: typeof card.id === "string" ? card.id : null,
    name: card.name,
    layout: typeof card.layout === "string" ? card.layout : null,
    mana_cost: typeof card.mana_cost === "string" ? card.mana_cost : null,
    cmc: typeof card.cmc === "number" ? card.cmc : null,
    type_line: typeof card.type_line === "string" ? card.type_line : null,
    oracle_text: typeof card.oracle_text === "string" ? card.oracle_text : null,
    colors: Array.isArray(card.colors)
      ? card.colors.filter((value): value is string => typeof value === "string")
      : null,
    card_faces: cardFaces,
    color_identity: Array.isArray(card.color_identity)
      ? card.color_identity.filter((value): value is string => typeof value === "string")
      : null,
    keywords: Array.isArray(card.keywords)
      ? card.keywords.filter((value): value is string => typeof value === "string")
      : null,
    legalities:
      card.legalities && typeof card.legalities === "object"
        ? Object.fromEntries(
            Object.entries(card.legalities).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : null,
    rulings,
  };
}

async function fetchNamedCard(name: string, mode: "exact" | "fuzzy") {
  const response = await fetch(
    `https://api.scryfall.com/cards/named?${mode}=${encodeURIComponent(normalizeCardQuery(name))}`,
    { headers: { Accept: "application/json" } },
  );

  if (response.ok) {
    return (await response.json()) as ScryfallJudgeCard;
  }

  if (response.status === 404) {
    return null;
  }

  const errorPayload = (await response.json()) as ScryfallErrorResponse;
  throw new Error(errorPayload.details || `Could not find ${name} on Scryfall.`);
}

async function fetchCardSuggestions(name: string) {
  const response = await fetch(
    `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(normalizeCardQuery(name))}`,
    { headers: { Accept: "application/json" } },
  );

  if (response.ok) {
    const payload = (await response.json()) as ScryfallAutocompleteResponse;
    return [...new Set(payload.data.filter(Boolean))].slice(0, 5);
  }

  const searchResults = await searchCards(name);
  return [...new Set(searchResults.map((card) => card.name))].slice(0, 5);
}

async function fetchCardRulings(rulingsUri: string) {
  const response = await fetch(rulingsUri, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error("Could not load card rulings from Scryfall.");
  }

  const payload = (await response.json()) as ScryfallListResponse<ScryfallRuling>;
  return payload.data;
}

export async function fetchJudgeCardContexts(question: string) {
  const cardNames = parseReferencedCardNames(question);
  const results = await Promise.all(
    cardNames.map(async (name) => {
      const card = (await fetchNamedCard(name, "exact")) ?? (await fetchNamedCard(name, "fuzzy"));

      if (!card) {
        return {
          kind: "unresolved" as const,
          unresolved: {
            name,
            suggestions: await fetchCardSuggestions(name),
          },
        };
      }

      const rulings =
        typeof card.rulings_uri === "string" ? await fetchCardRulings(card.rulings_uri) : [];

      return {
        kind: "resolved" as const,
        card: toJudgeCardContext(card, rulings),
      };
    }),
  );

  return {
    cards: results.flatMap((result) => (result.kind === "resolved" ? [result.card] : [])),
    unresolved: results.flatMap((result) =>
      result.kind === "unresolved" ? [result.unresolved] : [],
    ),
  };
}
