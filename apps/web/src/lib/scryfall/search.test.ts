import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCards } from "./search";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("searchCards", () => {
  it("includes image URLs in search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "Opt",
            oracle_id: "oracle-4",
            id: "card-4",
            type_line: "Instant",
            cmc: 1,
            set: "dom",
            collector_number: "60",
            image_uris: {
              small: "https://cards.scryfall.io/small/front/o/p/opt.jpg",
              normal: "https://cards.scryfall.io/normal/front/o/p/opt.jpg",
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCards("opt");

    expect(results[0]).toMatchObject({
      name: "Opt",
      manaValue: 1,
      smallImageUrl: "https://cards.scryfall.io/small/front/o/p/opt.jpg",
      imageUrl: "https://cards.scryfall.io/normal/front/o/p/opt.jpg",
    });
  });
});
