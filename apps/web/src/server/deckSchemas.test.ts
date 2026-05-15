import { describe, expect, it } from "vitest";
import { updateDeckColorsInputSchema, updateDeckCurrentInputSchema } from "./deckSchemas";

describe("updateDeckCurrentInputSchema", () => {
  it("preserves enriched card data when persisting current deck state", () => {
    const input = {
      deckId: "test-deck",
      categories: [{ id: "instant", name: "Instant" }],
      layout: { lanes: [["instant"]] },
      cards: [
        {
          oracleId: "oracle-1",
          name: "Opt",
          quantity: 2,
          typeLine: "Instant",
          categoryId: "instant",
          manaValue: 1,
          setCode: "DOM",
          collectorNumber: "60",
          smallImageUrl: "small.jpg",
          imageUrl: "normal.jpg",
          priceUsd: 0.25,
          faces: [
            {
              name: "Opt",
              typeLine: "Instant",
              manaCost: "{U}",
              oracleText: "Scry 1. Draw a card.",
              smallImageUrl: "face-small.jpg",
              imageUrl: "face-normal.jpg",
            },
          ],
        },
      ],
    };

    expect(updateDeckCurrentInputSchema.parse(input).cards[0]).toMatchObject({
      smallImageUrl: "small.jpg",
      imageUrl: "normal.jpg",
      priceUsd: 0.25,
      faces: [
        {
          name: "Opt",
          typeLine: "Instant",
          manaCost: "{U}",
          oracleText: "Scry 1. Draw a card.",
          smallImageUrl: "face-small.jpg",
          imageUrl: "face-normal.jpg",
        },
      ],
    });
  });
});

describe("updateDeckColorsInputSchema", () => {
  it("accepts only deck colors", () => {
    expect(updateDeckColorsInputSchema.parse({ deckId: "test-deck", colors: ["U", "B"] })).toEqual({
      deckId: "test-deck",
      colors: ["U", "B"],
    });
    expect(() =>
      updateDeckColorsInputSchema.parse({ deckId: "test-deck", colors: ["U", "C"] }),
    ).toThrow();
  });
});
