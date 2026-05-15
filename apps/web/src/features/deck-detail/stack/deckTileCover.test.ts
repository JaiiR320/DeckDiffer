import { describe, expect, it } from "vitest";
import type { EditorRow } from "../editor/types";
import { createDeckTileCover } from "./deckTileCover";

describe("createDeckTileCover", () => {
  it("stores the selected printing identity with name and image", () => {
    const row: EditorRow = {
      oracleId: "oracle-1",
      name: "Lightning Bolt",
      category: "instant",
      typeLine: "Instant",
      manaValue: 1,
      setCode: "SLD",
      collectorNumber: "123",
      baselineQuantity: 0,
      currentQuantity: 1,
      status: "added",
    };

    expect(createDeckTileCover(row, "https://cards.example/bolt.jpg")).toEqual({
      oracleId: "oracle-1",
      setCode: "SLD",
      collectorNumber: "123",
      name: "Lightning Bolt",
      imageUrl: "https://cards.example/bolt.jpg",
    });
  });
});
