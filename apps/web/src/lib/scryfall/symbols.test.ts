import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardSymbols } from "./symbols";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("getCardSymbols", () => {
  it("fetches and caches Scryfall symbology", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            symbol: "{T}",
            english: "tap this permanent",
            svg_uri: "https://svgs.scryfall.io/card-symbols/T.svg",
          },
          {
            symbol: "{C}",
            english: "one colorless mana",
            svg_uri: "https://svgs.scryfall.io/card-symbols/C.svg",
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const [firstSymbols, secondSymbols] = await Promise.all([getCardSymbols(), getCardSymbols()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.scryfall.com/symbology", {
      headers: { Accept: "application/json" },
    });
    expect(firstSymbols).toBe(secondSymbols);
    expect(firstSymbols.get("{T}")).toEqual({
      symbol: "{T}",
      english: "tap this permanent",
      svgUri: "https://svgs.scryfall.io/card-symbols/T.svg",
    });
  });
});
