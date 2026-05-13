import { describe, expect, it } from "vitest";
import type { DeckItem } from "./deck";
import { createDeckExport, getExportableDeckCards } from "./deckExport";
import type { ValidatedDeckCard } from "./decklist";

const lightningBolt: ValidatedDeckCard = {
  oracleId: "bolt",
  name: "Lightning Bolt",
  quantity: 2,
  typeLine: "Instant",
  categoryId: "instant",
};

const island: ValidatedDeckCard = {
  oracleId: "island",
  name: "Island",
  quantity: 1,
  typeLine: "Basic Land — Island",
  categoryId: "land",
};

function deck(overrides: Partial<DeckItem> = {}): DeckItem {
  return {
    id: "izzet-spells",
    name: "Izzet Spells!",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    saves: [],
    ...overrides,
  };
}

describe("Deck export", () => {
  it("uses current cards before the latest save", () => {
    const result = createDeckExport(
      deck({
        cards: [lightningBolt],
        saves: [
          {
            id: "save-1",
            label: "Save #1",
            savedAt: "2026-01-01T00:00:00.000Z",
            cards: [island],
          },
        ],
      }),
    );

    expect(result).toEqual({
      ok: true,
      filename: "izzet-spells.txt",
      text: "2 Lightning Bolt",
    });
  });

  it("falls back to the latest save when current cards are missing", () => {
    const result = createDeckExport(
      deck({
        saves: [
          {
            id: "save-1",
            label: "Save #1",
            savedAt: "2026-01-01T00:00:00.000Z",
            cards: [island],
          },
        ],
      }),
    );

    expect(result).toMatchObject({ ok: true, text: "1 Island" });
  });

  it("filters cards by include-in-Deck categories", () => {
    expect(
      getExportableDeckCards(
        deck({
          cards: [lightningBolt, island],
          categories: [
            { id: "instant", name: "Instant", includeInDeck: true },
            { id: "land", name: "Land", includeInDeck: false },
          ],
        }),
      ),
    ).toEqual([lightningBolt]);
  });

  it("supports quantity-free exports", () => {
    const result = createDeckExport(deck({ cards: [lightningBolt] }), { includeQuantity: false });

    expect(result).toMatchObject({ ok: true, text: "Lightning Bolt\nLightning Bolt" });
  });

  it("returns a reason for empty exports", () => {
    expect(createDeckExport(deck())).toEqual({
      ok: false,
      reason: "No cards to export. Import or add cards first.",
    });
  });
});
