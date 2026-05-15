import { describe, expect, it } from "vitest";
import type { DeckTileCover } from "./deck";
import type { DeckCategory, ValidatedDeckCard } from "./decklist";
import { createCommanderDeckCover, shouldRefreshCommanderCover } from "./deckCover";

const commanderCategory: DeckCategory = { id: "cmd", name: " Commander ", kind: "custom" };
const mainCategory: DeckCategory = { id: "main", name: "Main", kind: "custom" };

function card(overrides: Partial<ValidatedDeckCard> = {}): ValidatedDeckCard {
  return {
    oracleId: "oracle-1",
    name: "Commander One",
    quantity: 1,
    typeLine: "Legendary Creature",
    categoryId: "cmd",
    setCode: "TST",
    collectorNumber: "1",
    imageUrl: "https://cards.example/one.jpg",
    ...overrides,
  };
}

describe("createCommanderDeckCover", () => {
  it("returns null without a commander category", () => {
    expect(createCommanderDeckCover([mainCategory], [card()])).toBeNull();
  });

  it("creates a single commander cover from one commander card", () => {
    expect(createCommanderDeckCover([commanderCategory], [card()])).toEqual({
      oracleId: "oracle-1",
      setCode: "TST",
      collectorNumber: "1",
      name: "Commander One",
      imageUrl: "https://cards.example/one.jpg",
      source: "commander",
      kind: "single",
    });
  });

  it("creates a split commander cover from two commander cards", () => {
    expect(
      createCommanderDeckCover(
        [commanderCategory],
        [
          card(),
          card({
            oracleId: "oracle-2",
            name: "Commander Two",
            imageUrl: "https://cards.example/two.jpg",
          }),
        ],
      ),
    ).toEqual({
      source: "commander",
      kind: "split",
      cards: [
        expect.objectContaining({ name: "Commander One" }),
        expect.objectContaining({ name: "Commander Two" }),
      ],
    });
  });

  it("ignores commander cards without images", () => {
    expect(
      createCommanderDeckCover([commanderCategory], [card({ imageUrl: undefined })]),
    ).toBeNull();
  });
});

describe("shouldRefreshCommanderCover", () => {
  it("refreshes missing and commander covers without overwriting manual covers", () => {
    const manualCover: DeckTileCover = {
      oracleId: "manual",
      name: "Manual",
      imageUrl: "https://cards.example/manual.jpg",
      source: "manual",
      kind: "single",
    };

    expect(shouldRefreshCommanderCover(undefined)).toBe(true);
    expect(shouldRefreshCommanderCover({ ...manualCover, source: "commander" })).toBe(true);
    expect(shouldRefreshCommanderCover(manualCover)).toBe(false);
    expect(shouldRefreshCommanderCover({ oracleId: "legacy", name: "Legacy", imageUrl: "x" })).toBe(
      false,
    );
  });
});
