import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardPreview } from "./preview";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getCardPreview", () => {
  it("fetches and caches a specific print when set data is available", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Lightning Bolt",
        oracle_id: "oracle-1",
        id: "card-1",
        type_line: "Instant",
        cmc: 1,
        edhrec_rank: 7,
        set: "lea",
        collector_number: "161",
        prices: { usd: "2.50" },
        image_uris: {
          small: "https://cards.scryfall.io/small/front/l/b/lightning-bolt.jpg",
          normal: "https://cards.scryfall.io/normal/front/l/b/lightning-bolt.jpg",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const [firstPreview, secondPreview] = await Promise.all([
      getCardPreview({
        name: "Lightning Bolt",
        setCode: "LEA",
        collectorNumber: "161",
      }),
      getCardPreview({
        name: "Lightning Bolt",
        setCode: "LEA",
        collectorNumber: "161",
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.scryfall.com/cards/lea/161", {
      headers: { Accept: "application/json" },
    });
    expect(firstPreview).toEqual(secondPreview);
    expect(firstPreview?.imageUrl).toContain("lightning-bolt.jpg");
    expect(firstPreview?.manaValue).toBe(1);
    expect(firstPreview?.priceUsd).toBe(2.5);
    expect(firstPreview?.edhrecRank).toBe(7);
  });

  it("falls back to exact-name lookup when a specific print is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: "Counterspell",
          oracle_id: "oracle-2",
          id: "card-2",
          type_line: "Instant",
          set: "7ed",
          collector_number: "67",
          card_faces: [
            {
              image_uris: {
                small: "https://cards.scryfall.io/small/front/c/o/counterspell.jpg",
                normal: "https://cards.scryfall.io/normal/front/c/o/counterspell.jpg",
              },
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const preview = await getCardPreview({
      name: "Counterspell",
      setCode: "TMP",
      collectorNumber: "999",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.scryfall.com/cards/tmp/999", {
      headers: { Accept: "application/json" },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.scryfall.com/cards/named?exact=Counterspell",
      { headers: { Accept: "application/json" } },
    );
    expect(preview?.name).toBe("Counterspell");
    expect(preview?.imageUrl).toContain("counterspell.jpg");
  });

  it("keeps two-sided card faces separate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Arlinn Kord // Arlinn, Embraced by the Moon",
        oracle_id: "oracle-3",
        id: "card-3",
        type_line: "Legendary Planeswalker - Arlinn",
        set: "soi",
        collector_number: "243",
        card_faces: [
          {
            name: "Arlinn Kord",
            mana_cost: "{2}{R}{G}",
            type_line: "Legendary Planeswalker - Arlinn",
            oracle_text: "+1: Until end of turn, up to one target creature gets +2/+2.",
            image_uris: {
              small: "https://cards.scryfall.io/small/front/a/r/arlinn-kord.jpg",
              normal: "https://cards.scryfall.io/normal/front/a/r/arlinn-kord.jpg",
            },
          },
          {
            name: "Arlinn, Embraced by the Moon",
            type_line: "Legendary Planeswalker - Arlinn",
            oracle_text: "+1: Creatures you control get +1/+1 and gain trample.",
            image_uris: {
              small: "https://cards.scryfall.io/small/back/a/r/arlinn-moon.jpg",
              normal: "https://cards.scryfall.io/normal/back/a/r/arlinn-moon.jpg",
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const preview = await getCardPreview({
      name: "Arlinn Kord",
      setCode: "SOI",
      collectorNumber: "243",
    });

    expect(preview?.name).toBe("Arlinn Kord");
    expect(preview?.manaCost).toBe("{2}{R}{G}");
    expect(preview?.oracleText).toBe(
      "+1: Until end of turn, up to one target creature gets +2/+2.",
    );
    expect(preview?.imageUrl).toContain("arlinn-kord.jpg");
    expect(preview?.faces).toEqual([
      {
        name: "Arlinn Kord",
        typeLine: "Legendary Planeswalker - Arlinn",
        manaCost: "{2}{R}{G}",
        oracleText: "+1: Until end of turn, up to one target creature gets +2/+2.",
        smallImageUrl: "https://cards.scryfall.io/small/front/a/r/arlinn-kord.jpg",
        imageUrl: "https://cards.scryfall.io/normal/front/a/r/arlinn-kord.jpg",
      },
      {
        name: "Arlinn, Embraced by the Moon",
        typeLine: "Legendary Planeswalker - Arlinn",
        oracleText: "+1: Creatures you control get +1/+1 and gain trample.",
        smallImageUrl: "https://cards.scryfall.io/small/back/a/r/arlinn-moon.jpg",
        imageUrl: "https://cards.scryfall.io/normal/back/a/r/arlinn-moon.jpg",
      },
    ]);
  });
});
