import { afterEach, describe, expect, it, vi } from "vitest";
import { searchCards } from "./search";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("searchCards", () => {
  it("includes image URLs in search results", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ object: "error" }) })
      .mockResolvedValueOnce({
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.scryfall.com/cards/named?exact=opt", {
      headers: { Accept: "application/json" },
    });
    expect(results[0]).toMatchObject({
      name: "Opt",
      manaValue: 1,
      smallImageUrl: "https://cards.scryfall.io/small/front/o/p/opt.jpg",
      imageUrl: "https://cards.scryfall.io/normal/front/o/p/opt.jpg",
    });
  });

  it("returns exact named matches before broader search", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Fact or Fiction",
        oracle_id: "oracle-fact-fiction",
        id: "card-fact-fiction",
        type_line: "Instant",
        cmc: 4,
        set: "cmm",
        collector_number: "91",
        image_uris: {
          small: "https://cards.scryfall.io/small/front/fact.jpg",
          normal: "https://cards.scryfall.io/normal/front/fact.jpg",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCards("fact or fiction");

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/named?exact=fact%20or%20fiction",
      { headers: { Accept: "application/json" } },
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      name: "Fact or Fiction",
      imageUrl: "https://cards.scryfall.io/normal/front/fact.jpg",
    });
  });

  it("falls back to card search when exact lookup misses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ object: "error" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              name: "Counterspell",
              oracle_id: "oracle-counterspell",
              id: "card-counterspell",
              type_line: "Instant",
              cmc: 2,
              set: "dmr",
              collector_number: "45",
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCards("counter");

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.scryfall.com/cards/search?unique=cards&order=name&q=counter",
      { headers: { Accept: "application/json" } },
    );
    expect(results[0]?.name).toBe("Counterspell");
  });

  it("includes two-sided card faces in search results", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ object: "error" }) })
      .mockResolvedValueOnce({
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

  it("returns exact split card matches", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Fire // Ice",
        oracle_id: "oracle-fire-ice",
        id: "card-fire-ice",
        type_line: "Instant // Instant",
        cmc: 4,
        set: "mh2",
        collector_number: "290",
        card_faces: [
          {
            name: "Fire",
            type_line: "Instant",
            image_uris: { small: "fire-small.jpg", normal: "fire.jpg" },
          },
          {
            name: "Ice",
            type_line: "Instant",
            image_uris: { small: "ice-small.jpg", normal: "ice.jpg" },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const results = await searchCards("fire // ice");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/named?exact=fire%20%2F%2F%20ice",
      { headers: { Accept: "application/json" } },
    );
    expect(results[0]?.name).toBe("Fire // Ice");
  });
});
