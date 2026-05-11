import { afterEach, describe, expect, it, vi } from "vitest";
import { validateDeckEntries } from "./validation";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("validateDeckEntries", () => {
  it("stores image URLs on validated cards", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "Island",
            oracle_id: "oracle-5",
            id: "card-5",
            type_line: "Basic Land - Island",
            cmc: 0,
            set: "und",
            collector_number: "90",
            image_uris: {
              small: "https://cards.scryfall.io/small/front/i/s/island.jpg",
              normal: "https://cards.scryfall.io/normal/front/i/s/island.jpg",
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { validCards } = await validateDeckEntries([
      {
        lineNumber: 1,
        quantity: 1,
        name: "Island",
      },
    ]);

    expect(validCards[0]).toMatchObject({
      name: "Island",
      manaValue: 0,
      smallImageUrl: "https://cards.scryfall.io/small/front/i/s/island.jpg",
      imageUrl: "https://cards.scryfall.io/normal/front/i/s/island.jpg",
    });
  });
});
