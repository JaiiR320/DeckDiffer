import { describe, expect, it } from "vitest";
import type { DeckCategory, ValidatedDeckCard } from "#/lib/decklist";
import { buildDeckStats, getManaCostColors } from "./deckStats";

const categories: DeckCategory[] = [
  { id: "main", name: "Main" },
  { id: "side", name: "Side", includeInDeck: false },
];

function card(patch: Partial<ValidatedDeckCard>): ValidatedDeckCard {
  return {
    oracleId: patch.name ?? "card",
    name: patch.name ?? "Card",
    quantity: 1,
    typeLine: "Creature",
    categoryId: "main",
    manaValue: 0,
    ...patch,
  };
}

describe("buildDeckStats", () => {
  it("builds a quantity-weighted spell mana curve", () => {
    const stats = buildDeckStats(
      [
        card({ name: "One", quantity: 2, manaValue: 1 }),
        card({ name: "Two", quantity: 3, manaValue: 2 }),
        card({ name: "Eight", quantity: 1, manaValue: 8 }),
        card({ name: "Island", quantity: 20, typeLine: "Basic Land - Island" }),
      ],
      categories,
    );

    expect(stats.deckCardTotal).toBe(26);
    expect(stats.spellCardTotal).toBe(6);
    expect(stats.totalManaValue).toBe(16);
    expect(stats.averageManaValue).toBeCloseTo(2.666);
    expect(stats.manaCurve.map((bucket) => bucket.count)).toEqual([0, 2, 3, 0, 0, 0, 0, 0, 1]);
  });

  it("ignores cards in categories excluded from deck stats", () => {
    const stats = buildDeckStats(
      [
        card({ name: "Main", quantity: 1, manaValue: 2 }),
        card({ name: "Side", categoryId: "side", quantity: 4, manaValue: 4 }),
      ],
      categories,
    );

    expect(stats.deckCardTotal).toBe(1);
    expect(stats.totalManaValue).toBe(2);
  });

  it("counts cost and production color splits", () => {
    const stats = buildDeckStats(
      [
        card({ name: "Spell", quantity: 2, manaCost: "{1}{W/U}{R}", manaValue: 3 }),
        card({ name: "Island", quantity: 3, typeLine: "Basic Land - Island" }),
        card({ name: "Signet", quantity: 1, typeLine: "Artifact", producedMana: ["U", "R"] }),
      ],
      categories,
    );

    expect(stats.costColors).toEqual({ W: 2, U: 2, B: 0, R: 2, G: 0, C: 0 });
    expect(stats.landProductionColors).toEqual({ W: 0, U: 3, B: 0, R: 0, G: 0, C: 0 });
    expect(stats.allProductionColors).toEqual({ W: 0, U: 4, B: 0, R: 1, G: 0, C: 0 });
  });

  it("clamps production to pinned deck colors", () => {
    const stats = buildDeckStats(
      [
        card({
          name: "Command Tower",
          quantity: 1,
          typeLine: "Land",
          producedMana: ["W", "U", "B", "R", "G"],
        }),
        card({ name: "Sol Ring", quantity: 1, typeLine: "Artifact", producedMana: ["C"] }),
      ],
      categories,
      ["U", "B"],
    );

    expect(stats.landProductionColors).toEqual({ W: 0, U: 1, B: 1, R: 0, G: 0, C: 0 });
    expect(stats.allProductionColors).toEqual({ W: 0, U: 1, B: 1, R: 0, G: 0, C: 1 });
  });
});

describe("getManaCostColors", () => {
  it("counts colored symbols and ignores generic symbols", () => {
    expect(getManaCostColors("{2}{W}{U/B}{C}")).toEqual(["W", "U", "B", "C"]);
  });
});
