import { describe, expect, it } from "vitest";
import { defaultDeckCategories } from "./decklist";
import { defaultStackLayout, normalizeStackLayout } from "./deckLayout";

describe("normalizeStackLayout", () => {
  it("falls back to the default five-lane layout when layout is missing", () => {
    expect(normalizeStackLayout(undefined)).toEqual(defaultStackLayout());
  });

  it("starts with five default lanes", () => {
    expect(defaultStackLayout().lanes).toEqual([
      ["land"],
      ["creature"],
      ["artifact", "enchantment"],
      ["instant", "sorcery"],
      ["planeswalker", "battle", "other"],
    ]);
    expect(defaultStackLayout().showRemovedCardGhosts).toBe(true);
  });

  it("preserves the removed-card ghost display setting", () => {
    expect(normalizeStackLayout({ lanes: [["Land"]], showRemovedCardGhosts: false })).toMatchObject(
      {
        showRemovedCardGhosts: false,
      },
    );
  });

  it("preserves empty lanes", () => {
    expect(normalizeStackLayout({ lanes: [["Creature"], [], ["Land"]] }).lanes[1]).toEqual([]);
  });

  it("drops duplicate and unknown categories", () => {
    const layout = normalizeStackLayout({
      lanes: [["Creature", "Creature", "Bad"], ["Land"]],
    });

    expect(layout.lanes[0]).toEqual(["creature"]);
    expect(layout.lanes[1]).toEqual(["land"]);
    expect(layout.lanes.flat()).not.toContain("Bad");
  });

  it("appends missing categories", () => {
    const layout = normalizeStackLayout({ lanes: [["Land"]] });

    expect(layout.lanes.flat()).toEqual(defaultDeckCategories().map((category) => category.id));
  });
});
