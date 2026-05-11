import { describe, expect, it } from "vitest";
import { buildEditorRows } from "./editorRows";

describe("buildEditorRows", () => {
  it("returns no diff rows for identical baseline and working cards", () => {
    const cards = [
      {
        oracleId: "card-1",
        name: "Island",
        quantity: 1,
        typeLine: "Basic Land - Island",
        category: "Land" as const,
      },
    ];

    expect(buildEditorRows(cards, cards).every((row) => row.status === "same")).toBe(true);
  });

  it("marks added, changed, and removed rows when cards differ", () => {
    const baselineCards = [
      {
        oracleId: "card-1",
        name: "Island",
        quantity: 1,
        typeLine: "Basic Land - Island",
        category: "Land" as const,
      },
      {
        oracleId: "card-2",
        name: "Counterspell",
        quantity: 1,
        typeLine: "Instant",
        category: "Instant" as const,
      },
    ];
    const workingCards = [
      {
        oracleId: "card-1",
        name: "Island",
        quantity: 2,
        typeLine: "Basic Land - Island",
        category: "Land" as const,
      },
      {
        oracleId: "card-3",
        name: "Opt",
        quantity: 1,
        typeLine: "Instant",
        category: "Instant" as const,
      },
    ];

    expect(
      buildEditorRows(baselineCards, workingCards)
        .map((row) => row.status)
        .sort(),
    ).toEqual(["added", "changed", "removed"]);
  });

  it("preserves image URLs from working and baseline cards", () => {
    const baselineCards = [
      {
        oracleId: "card-1",
        name: "Counterspell",
        quantity: 1,
        typeLine: "Instant",
        category: "Instant" as const,
        manaValue: 2,
        imageUrl: "https://cards.example/counterspell.jpg",
      },
    ];
    const workingCards = [
      {
        oracleId: "card-2",
        name: "Opt",
        quantity: 1,
        typeLine: "Instant",
        category: "Instant" as const,
        manaValue: 1,
        smallImageUrl: "https://cards.example/opt-small.jpg",
        imageUrl: "https://cards.example/opt.jpg",
      },
    ];

    const rows = buildEditorRows(baselineCards, workingCards);

    expect(rows.find((row) => row.name === "Counterspell")?.imageUrl).toBe(
      "https://cards.example/counterspell.jpg",
    );
    expect(rows.find((row) => row.name === "Opt")?.smallImageUrl).toBe(
      "https://cards.example/opt-small.jpg",
    );
    expect(rows.find((row) => row.name === "Counterspell")?.manaValue).toBe(2);
  });
});
