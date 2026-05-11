export const CARD_CATEGORIES = [
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Planeswalker",
  "Battle",
  "Other",
] as const;

export type CardCategory = string;

export type DeckCategory = {
  id: CardCategory;
  name: string;
  kind?: "default" | "custom";
};

const DEFAULT_CATEGORY_IDS: Record<(typeof CARD_CATEGORIES)[number], CardCategory> = {
  Land: "land",
  Creature: "creature",
  Artifact: "artifact",
  Enchantment: "enchantment",
  Instant: "instant",
  Sorcery: "sorcery",
  Planeswalker: "planeswalker",
  Battle: "battle",
  Other: "other",
};

export function defaultDeckCategories(): DeckCategory[] {
  return CARD_CATEGORIES.map((name) => ({ id: DEFAULT_CATEGORY_IDS[name], name, kind: "default" }));
}

export function createCategoryId(name: string, categories: DeckCategory[]) {
  const baseId =
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "category";
  const ids = new Set(categories.map((category) => category.id));

  if (!ids.has(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let nextId = `${baseId}-${suffix}`;
  while (ids.has(nextId)) {
    suffix += 1;
    nextId = `${baseId}-${suffix}`;
  }

  return nextId;
}

export function normalizeCategoryNameForCompare(name: string) {
  return name.trim().toLowerCase();
}

export function hasCategoryName(
  categories: DeckCategory[],
  name: string,
  exceptCategoryId?: string,
) {
  const normalizedName = normalizeCategoryNameForCompare(name);
  return categories.some(
    (category) =>
      category.id !== exceptCategoryId &&
      normalizeCategoryNameForCompare(category.name) === normalizedName,
  );
}

export function createCategoryName(name: string, categories: DeckCategory[]) {
  const baseName = name.trim() || "Category";

  if (!hasCategoryName(categories, baseName)) {
    return baseName;
  }

  let suffix = 2;
  let nextName = `${baseName} ${suffix}`;
  while (hasCategoryName(categories, nextName)) {
    suffix += 1;
    nextName = `${baseName} ${suffix}`;
  }

  return nextName;
}

export function defaultCategoryIdForName(name: string) {
  return DEFAULT_CATEGORY_IDS[name as (typeof CARD_CATEGORIES)[number]] ?? "other";
}

export type ParsedDeckEntry = {
  lineNumber: number;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
};

export type ParsedDeckError = {
  lineNumber: number;
  text: string;
  reason: string;
};

export type ValidatedDeckCard = {
  oracleId: string;
  name: string;
  quantity: number;
  typeLine: string;
  categoryId?: CardCategory;
  category?: CardCategory;
  manaValue?: number;
  setCode?: string;
  collectorNumber?: string;
  smallImageUrl?: string;
  imageUrl?: string;
};

export type DeckExportOptions = {
  includeQuantity: boolean;
  includeSet: boolean;
  includeCollectorNumber: boolean;
  setStyle: "brackets" | "parentheses";
};

export type InvalidDeckCard = {
  lineNumber: number;
  quantity: number;
  name: string;
  reason: string;
};

export function parseDecklist(rawText: string) {
  const entries: ParsedDeckEntry[] = [];
  const errors: ParsedDeckError[] = [];
  const lines = rawText.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const text = line.trim();
    if (!text) {
      continue;
    }

    const quantityMatch = text.match(/^(?:(\d+)x?\s+)?(.*)$/i);
    const quantityText = quantityMatch?.[1];
    const remainder = quantityMatch?.[2]?.trim();

    if (!remainder) {
      errors.push({
        lineNumber: index + 1,
        text,
        reason: "Could not parse this line.",
      });
      continue;
    }

    const quantity = quantityText ? Number(quantityText) : 1;

    let collectorNumber: string | undefined;
    let setCode: string | undefined;
    let name = remainder;

    const collectorMatch = name.match(/\s+(\d+[a-zA-Z]?)$/);
    if (collectorMatch) {
      collectorNumber = collectorMatch[1];
      name = name.slice(0, -collectorMatch[0].length).trim();
    }

    const setMatch = name.match(/\s*(?:\[([^\]]+)\]|\(([^)]+)\))$/);
    if (setMatch) {
      setCode = (setMatch[1] ?? setMatch[2])?.trim().toUpperCase();
      name = name.slice(0, -setMatch[0].length).trim();
    }

    if (!name || Number.isNaN(quantity) || quantity < 1) {
      errors.push({
        lineNumber: index + 1,
        text,
        reason: "Expected a card name and positive quantity.",
      });
      continue;
    }

    entries.push({
      lineNumber: index + 1,
      quantity,
      name,
      setCode,
      collectorNumber,
    });
  }

  return { entries, errors };
}

export function getCardCategory(typeLine: string): CardCategory {
  if (typeLine.includes("Land")) return "Land";
  if (typeLine.includes("Creature")) return "Creature";
  if (typeLine.includes("Artifact")) return "Artifact";
  if (typeLine.includes("Enchantment")) return "Enchantment";
  if (typeLine.includes("Instant")) return "Instant";
  if (typeLine.includes("Sorcery")) return "Sorcery";
  if (typeLine.includes("Planeswalker")) return "Planeswalker";
  if (typeLine.includes("Battle")) return "Battle";
  return "Other";
}

export function getDefaultCategoryId(typeLine: string) {
  return defaultCategoryIdForName(getCardCategory(typeLine));
}

export function normalizeDeckCategories(categories: unknown): DeckCategory[] {
  if (!Array.isArray(categories)) {
    return defaultDeckCategories();
  }

  const normalized: DeckCategory[] = [];
  const seen = new Set<string>();
  for (const category of categories) {
    if (!category || typeof category !== "object") {
      continue;
    }

    const id = String((category as { id?: unknown }).id ?? "").trim();
    const name = String((category as { name?: unknown }).name ?? "").trim();
    if (!id || !name || seen.has(id)) {
      continue;
    }

    seen.add(id);
    normalized.push({ id, name, kind: (category as DeckCategory).kind });
  }

  return normalized.length > 0 ? normalized : defaultDeckCategories();
}

export function normalizeDeckCard(card: ValidatedDeckCard, categories = defaultDeckCategories()) {
  const categoryIds = new Set(categories.map((category) => category.id));
  const legacyId = card.category ? defaultCategoryIdForName(card.category) : undefined;
  const categoryId = card.categoryId ?? legacyId ?? getDefaultCategoryId(card.typeLine);
  const fallbackCategoryId = categoryIds.has("other") ? "other" : categories[0]?.id;

  return {
    ...card,
    categoryId: categoryIds.has(categoryId) ? categoryId : fallbackCategoryId,
  };
}

export function mergeValidatedCards(cards: ValidatedDeckCard[]) {
  const mergedCards = new Map<string, ValidatedDeckCard>();

  for (const card of cards) {
    const existingCard = mergedCards.get(card.oracleId);

    if (existingCard) {
      existingCard.quantity += card.quantity;
      continue;
    }

    mergedCards.set(card.oracleId, { ...card });
  }

  return [...mergedCards.values()];
}

export function formatDeckExport(cards: ValidatedDeckCard[]) {
  return formatDecklist(cards, {
    includeQuantity: true,
    includeSet: false,
    includeCollectorNumber: false,
    setStyle: "brackets",
  });
}

export function formatDecklist(cards: ValidatedDeckCard[], options: DeckExportOptions) {
  const mergedCards = mergeValidatedCards(cards).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  const rows = mergedCards.flatMap((card) => {
    const suffixParts: string[] = [];

    if (options.includeSet && card.setCode) {
      suffixParts.push(
        options.setStyle === "parentheses" ? `(${card.setCode})` : `[${card.setCode}]`,
      );
    }

    if (options.includeSet && options.includeCollectorNumber && card.collectorNumber) {
      suffixParts.push(card.collectorNumber);
    }

    const cardText = [card.name, ...suffixParts].join(" ").trim();

    if (options.includeQuantity) {
      return [`${card.quantity} ${cardText}`];
    }

    return Array.from({ length: card.quantity }, () => cardText);
  });

  return rows.join("\n").trim();
}
