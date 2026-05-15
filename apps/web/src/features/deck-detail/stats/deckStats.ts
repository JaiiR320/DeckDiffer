import type { DeckCategory, ValidatedDeckCard } from "#/lib/decklist";
import type { DeckColor } from "#/lib/deck";

export const MANA_COLORS = ["W", "U", "B", "R", "G", "C"] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

export type ManaColorCounts = Record<ManaColor, number>;

type ManaCurveBucket = {
  label: string;
  count: number;
};

export type DeckStats = {
  deckCardTotal: number;
  spellCardTotal: number;
  totalManaValue: number;
  averageManaValue: number;
  manaCurve: ManaCurveBucket[];
  costColors: ManaColorCounts;
  landProductionColors: ManaColorCounts;
  allProductionColors: ManaColorCounts;
};

const BASIC_LAND_MANA: Array<[string, ManaColor]> = [
  ["Plains", "W"],
  ["Island", "U"],
  ["Swamp", "B"],
  ["Mountain", "R"],
  ["Forest", "G"],
];

const MANA_CURVE_LABELS = ["0", "1", "2", "3", "4", "5", "6", "7", "8+"];
const MANA_COLOR_SET = new Set<string>(MANA_COLORS);

export function buildDeckStats(
  cards: ValidatedDeckCard[],
  categories: DeckCategory[],
  deckColors: DeckColor[] | undefined = undefined,
): DeckStats {
  const includedCategoryIds = new Set<string>();
  for (const category of categories) {
    if (category.includeInDeck !== false) {
      includedCategoryIds.add(category.id);
    }
  }
  const stats: DeckStats = {
    deckCardTotal: 0,
    spellCardTotal: 0,
    totalManaValue: 0,
    averageManaValue: 0,
    manaCurve: MANA_CURVE_LABELS.map((label) => ({ label, count: 0 })),
    costColors: emptyManaColorCounts(),
    landProductionColors: emptyManaColorCounts(),
    allProductionColors: emptyManaColorCounts(),
  };

  for (const card of cards) {
    if (card.categoryId && !includedCategoryIds.has(card.categoryId)) {
      continue;
    }

    const quantity = card.quantity;
    const isLand = isLandTypeLine(card.typeLine);
    stats.deckCardTotal += quantity;

    if (!isLand) {
      const manaValue = card.manaValue ?? 0;
      stats.spellCardTotal += quantity;
      stats.totalManaValue += manaValue * quantity;
      stats.manaCurve[getManaCurveBucketIndex(manaValue)]!.count += quantity;
      addManaCounts(stats.costColors, getManaCostColors(card.manaCost), quantity);
    }

    const producedMana = filterProducedManaColors(getProducedManaColors(card, isLand), deckColors);
    if (producedMana.length > 0) {
      addManaCounts(stats.allProductionColors, producedMana, quantity);
      if (isLand) {
        addManaCounts(stats.landProductionColors, producedMana, quantity);
      }
    }
  }

  stats.averageManaValue =
    stats.spellCardTotal > 0 ? stats.totalManaValue / stats.spellCardTotal : 0;
  return stats;
}

function filterProducedManaColors(colors: ManaColor[], deckColors: DeckColor[] | undefined) {
  if (!deckColors || deckColors.length === 0) return colors;

  const deckColorSet = new Set<string>(deckColors);
  return colors.filter((color) => color === "C" || deckColorSet.has(color));
}

export function getManaCostColors(manaCost: string | undefined): ManaColor[] {
  if (!manaCost) return [];

  const colors: ManaColor[] = [];
  for (const match of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const parts = match[1]?.split("/") ?? [];
    for (const part of parts) {
      if (isManaColor(part)) {
        colors.push(part);
      }
    }
  }

  return colors;
}

function getProducedManaColors(card: ValidatedDeckCard, isLand: boolean): ManaColor[] {
  const producedMana = card.producedMana?.filter(isManaColor) ?? [];
  if (producedMana.length > 0) return producedMana;

  if (!isLand) return [];

  const basicLandMana: ManaColor[] = [];
  for (const [landType, color] of BASIC_LAND_MANA) {
    if (hasTypeWord(card.typeLine, landType)) {
      basicLandMana.push(color);
    }
  }

  return basicLandMana;
}

function isLandTypeLine(typeLine: string) {
  return hasTypeWord(typeLine, "Land");
}

function hasTypeWord(typeLine: string, word: string) {
  return new RegExp(`(?:^|[^A-Za-z])${word}(?:$|[^A-Za-z])`).test(typeLine);
}

function getManaCurveBucketIndex(manaValue: number) {
  return manaValue >= 8 ? 8 : Math.max(0, Math.floor(manaValue));
}

function emptyManaColorCounts(): ManaColorCounts {
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
}

function addManaCounts(target: ManaColorCounts, colors: ManaColor[], quantity: number) {
  for (const color of colors) {
    target[color] += quantity;
  }
}

function isManaColor(value: string): value is ManaColor {
  return MANA_COLOR_SET.has(value);
}
