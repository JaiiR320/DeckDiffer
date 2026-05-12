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

  it("includes two-sided card faces in search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "Arlinn Kord // Arlinn, Embraced by the Moon",
            oracle_id: "oracle-5",
            id: "card-5",
            type_line: "Legendary Planeswalker - Arlinn",
            cmc: 4,
            set: "soi",
            collector_number: "243",
            card_faces: [
              {
                name: "Arlinn Kord",
                type_line: "Legendary Planeswalker - Arlinn",
                image_uris: { small: "front-small.jpg", normal: "front.jpg" },
              },
              {
                name: "Arlinn, Embraced by the Moon",
                type_line: "Legendary Planeswalker - Arlinn",
                image_uris: { small: "back-small.jpg", normal: "back.jpg" },
              },
            ],
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCards("arlinn");

    expect(results[0]?.imageUrl).toBe("front.jpg");
    expect(results[0]?.faces?.[1]?.imageUrl).toBe("back.jpg");
  });
});
