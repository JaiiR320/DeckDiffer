import { describe, expect, it } from "vitest";
import { CARD_CATEGORIES } from "./decklist";
import { defaultStackLayout, normalizeStackLayout } from "./deckLayout";

describe("normalizeStackLayout", () => {
  it("falls back to one category per lane when layout is missing", () => {
    expect(normalizeStackLayout(undefined)).toEqual(defaultStackLayout());
  });

  it("preserves empty lanes", () => {
    expect(normalizeStackLayout({ lanes: [["Creature"], [], ["Land"]] }).lanes[1]).toEqual([]);
  });

  it("drops duplicate and unknown categories", () => {
    const layout = normalizeStackLayout({
      lanes: [["Creature", "Creature", "Bad"], ["Land"]],
    });

    expect(layout.lanes[0]).toEqual(["Creature"]);
    expect(layout.lanes[1]).toEqual(["Land"]);
    expect(layout.lanes.flat()).not.toContain("Bad");
  });

  it("appends missing categories", () => {
    const layout = normalizeStackLayout({ lanes: [["Land"]] });

    expect(layout.lanes.flat()).toEqual(CARD_CATEGORIES);
  });
});
