import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardPrintings } from "./printings";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getCardPrintings", () => {
  it("loads paged printings and maps price and image fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: "list",
          has_more: true,
          next_page: "https://api.scryfall.com/cards/search?page=2",
          data: [
            {
              id: "print-1",
              oracle_id: "oracle-printings-test-1",
              name: "Bedevil",
              type_line: "Instant",
              set: "rna",
              set_name: "Ravnica Allegiance",
              collector_number: "157",
              released_at: "2019-01-25",
              edhrec_rank: 801,
              prices: { usd: "1.29" },
              image_uris: { small: "small-1.jpg", normal: "normal-1.jpg" },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          object: "list",
          has_more: false,
          data: [
            {
              id: "print-2",
              oracle_id: "oracle-printings-test-1",
              name: "Bedevil",
              type_line: "Instant",
              set: "dmc",
              set_name: "Dominaria United Commander",
              collector_number: "144",
              released_at: "2022-09-09",
              prices: { usd: null },
              card_faces: [{ image_uris: { small: "small-2.jpg", normal: "normal-2.jpg" } }],
            },
          ],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const printings = await getCardPrintings("oracle-printings-test-1");

    expect(printings).toEqual([
      {
        scryfallId: "print-1",
        oracleId: "oracle-printings-test-1",
        name: "Bedevil",
        setCode: "RNA",
        setName: "Ravnica Allegiance",
        collectorNumber: "157",
        releasedAt: "2019-01-25",
        priceUsd: 1.29,
        edhrecRank: 801,
        smallImageUrl: "small-1.jpg",
        imageUrl: "normal-1.jpg",
      },
      {
        scryfallId: "print-2",
        oracleId: "oracle-printings-test-1",
        name: "Bedevil",
        setCode: "DMC",
        setName: "Dominaria United Commander",
        collectorNumber: "144",
        releasedAt: "2022-09-09",
        priceUsd: undefined,
        edhrecRank: null,
        smallImageUrl: "small-2.jpg",
        imageUrl: "normal-2.jpg",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
