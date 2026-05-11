import { describe, expect, it } from "vitest";
import { buildDeckEditorModel } from "../deck-detail/deckEditorModel";
import { hasCategoryName, type DeckCategory } from "../../lib/decklist";
import { buildEditorRows, groupEditorRows } from "./editorRows";

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

  it("marks category moves as removed from the old category and added to the new category", () => {
    const baselineCards = [
      {
        oracleId: "card-1",
        name: "Dryad Arbor",
        quantity: 1,
        typeLine: "Land Creature - Forest Dryad",
        category: "Land" as const,
      },
    ];
    const workingCards = [
      {
        oracleId: "card-1",
        name: "Dryad Arbor",
        quantity: 1,
        typeLine: "Land Creature - Forest Dryad",
        category: "Creature" as const,
      },
    ];

    const groupedRows = groupEditorRows(buildEditorRows(baselineCards, workingCards));

    expect(groupedRows.land[0]?.status).toBe("removed");
    expect(groupedRows.creature[0]?.status).toBe("added");
    expect(groupedRows.creature[0]?.name).toBe("Dryad Arbor");
  });

  it("keeps category renames as one unchanged card row", () => {
    const baselineCategories: DeckCategory[] = [{ id: "ramp", name: "Ramp", kind: "custom" }];
    const workingCategories: DeckCategory[] = [{ id: "ramp", name: "Mana", kind: "custom" }];
    const cards = [
      {
        oracleId: "card-1",
        name: "Sol Ring",
        quantity: 1,
        typeLine: "Artifact",
        categoryId: "ramp",
      },
    ];

    const rows = buildEditorRows(cards, cards, workingCategories, baselineCategories);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("same");
  });

  it("marks quantity changes within the same category name as changed", () => {
    const categories: DeckCategory[] = [{ id: "ramp", name: "Ramp", kind: "custom" }];
    const baselineCards = [
      {
        oracleId: "card-1",
        name: "Sol Ring",
        quantity: 1,
        typeLine: "Artifact",
        categoryId: "ramp",
      },
    ];
    const workingCards = [{ ...baselineCards[0], quantity: 2 }];

    expect(buildEditorRows(baselineCards, workingCards, categories)[0]?.status).toBe("changed");
  });
});

describe("buildDeckEditorModel", () => {
  it("returns category rename metadata", () => {
    const baselineCategories: DeckCategory[] = [{ id: "ramp", name: "Ramp", kind: "custom" }];
    const categories: DeckCategory[] = [{ id: "ramp", name: "Mana", kind: "custom" }];
    const cards = [
      {
        oracleId: "card-1",
        name: "Sol Ring",
        quantity: 1,
        typeLine: "Artifact",
        categoryId: "ramp",
      },
    ];

    const model = buildDeckEditorModel({
      baselineDeck: {
        rawText: "",
        cards,
        invalidCards: [],
        status: "ready",
        errorMessage: null,
      },
      baselineCategories,
      categories,
      compareMode: false,
      compareSaves: null,
      workingCards: cards,
    });

    expect(model.categoryDiffs.ramp?.previousName).toBe("Ramp");
    expect(model.groupedRows.ramp).toHaveLength(1);
    expect(model.groupedRows.ramp[0]?.status).toBe("same");
  });
});

describe("hasCategoryName", () => {
  it("compares category names case-insensitively after trimming", () => {
    const categories: DeckCategory[] = [{ id: "ramp", name: "Ramp", kind: "custom" }];

    expect(hasCategoryName(categories, " ramp ")).toBe(true);
    expect(hasCategoryName(categories, "RAMP")).toBe(true);
    expect(hasCategoryName(categories, "Ramp", "ramp")).toBe(false);
  });
});
