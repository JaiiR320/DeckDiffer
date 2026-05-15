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

  it("uses the selected face name and image for double-faced cards", () => {
    const row: EditorRow = {
      oracleId: "oracle-2",
      name: "Front Face // Back Face",
      category: "land",
      typeLine: "Land",
      manaValue: 0,
      setCode: "MDF",
      collectorNumber: "10",
      baselineQuantity: 0,
      currentQuantity: 1,
      status: "added",
    };

    expect(createDeckTileCover(row, "https://cards.example/back.jpg", "Back Face")).toMatchObject({
      name: "Back Face",
      imageUrl: "https://cards.example/back.jpg",
      setCode: "MDF",
      collectorNumber: "10",
    });
  });
});
