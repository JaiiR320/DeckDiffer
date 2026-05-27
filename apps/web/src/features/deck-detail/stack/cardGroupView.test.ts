import { describe, expect, it } from "vitest";
import type { DeckCategory } from "#/lib/decklist";
import type { EditorRow } from "../editor/types";
import { buildGeneratedCardGroups } from "./cardGroupView";

const categories: DeckCategory[] = [
  { id: "main", name: "Main", includeInDeck: true },
  { id: "maybe", name: "Maybeboard", includeInDeck: false },
];

describe("buildGeneratedCardGroups", () => {
  it("groups in-deck cards into one mana value stack per lane", () => {
    const result = buildGeneratedCardGroups({
      categories,
      groupView: "manaValue",
      rows: [
        row({ name: "Zero", manaValue: 0 }),
        row({ name: "Three", manaValue: 3 }),
        row({ name: "Side", category: "maybe", manaValue: 1 }),
      ],
    });

    expect(result.categories.map((category) => category.name)).toEqual([
      "MV 0",
      "MV 1",
      "MV 2",
      "MV 3",
    ]);
    expect(result.lanes).toEqual(result.categories.map((category) => [category.id]));
    expect(result.groupedRows[result.categories[0]!.id]?.map((item) => item.name)).toEqual([
      "Zero",
    ]);
    expect(result.groupedRows[result.categories[1]!.id]).toEqual([]);
    expect(result.groupedRows[result.categories[3]!.id]?.map((item) => item.name)).toEqual([
      "Three",
    ]);
  });

  it("groups in-deck cards by primary type priority", () => {
    const result = buildGeneratedCardGroups({
      categories,
      groupView: "type",
      rows: [
        row({ name: "Dryad Arbor", typeLine: "Land Creature - Forest Dryad" }),
        row({ name: "Signet", typeLine: "Artifact" }),
        row({ name: "Sword", typeLine: "Artifact Creature - Equipment Germ" }),
        row({ name: "Scheme", typeLine: "Scheme" }),
        row({ name: "Side", category: "maybe", typeLine: "Creature" }),
      ],
    });

    expect(result.categories.map((category) => category.name)).toEqual([
      "Land",
      "Creature",
      "Artifact",
      "Other",
    ]);
    expect(result.groupedRows[result.categories[0]!.id]?.map((item) => item.name)).toEqual([
      "Dryad Arbor",
    ]);
    expect(result.groupedRows[result.categories[1]!.id]?.map((item) => item.name)).toEqual([
      "Sword",
    ]);
    expect(result.groupedRows[result.categories[2]!.id]?.map((item) => item.name)).toEqual([
      "Signet",
    ]);
    expect(result.groupedRows[result.categories[3]!.id]?.map((item) => item.name)).toEqual([
      "Scheme",
    ]);
  });
});

function row(patch: Partial<EditorRow>): EditorRow {
  return {
    oracleId: patch.name ?? "card",
    name: patch.name ?? "Card",
    category: patch.category ?? "main",
    typeLine: patch.typeLine ?? "Creature",
    manaValue: patch.manaValue ?? 0,
    baselineQuantity: 0,
    currentQuantity: 1,
    status: "same",
    ...patch,
  };
}
