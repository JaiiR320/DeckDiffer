import { describe, expect, it } from "vitest";
import type { DeckSave } from "#/lib/deck";
import { groupSaveHistoryItems, isAutoSaveLabel } from "./SaveHistoryPanel";

function save(id: string, label: string): DeckSave {
  return {
    cards: [],
    id,
    label,
    savedAt: "2026-05-15T00:00:00.000Z",
  };
}

describe("isAutoSaveLabel", () => {
  it("matches generated save labels", () => {
    expect(isAutoSaveLabel("Save #1")).toBe(true);
    expect(isAutoSaveLabel("Save #001")).toBe(true);
  });

  it("does not match user labels", () => {
    expect(isAutoSaveLabel("save #1")).toBe(false);
    expect(isAutoSaveLabel("Save #1 edited")).toBe(false);
    expect(isAutoSaveLabel("Release Save #1")).toBe(false);
  });
});

describe("groupSaveHistoryItems", () => {
  it("keeps every save visible when collapse is disabled", () => {
    const saves = [save("3", "Save #3"), save("2", "Release A"), save("1", "Save #1")];

    expect(groupSaveHistoryItems(saves, false)).toEqual([
      { kind: "save", save: saves[0] },
      { kind: "save", save: saves[1] },
      { kind: "save", save: saves[2] },
    ]);
  });

  it("collapses a single unnamed run", () => {
    const saves = [save("3", "Save #3"), save("2", "Save #2"), save("1", "Release A")];

    expect(groupSaveHistoryItems(saves, true)).toEqual([
      { count: 2, id: "collapsed-3-2", kind: "collapsed" },
      { kind: "save", save: saves[2] },
    ]);
  });

  it("collapses separate unnamed runs independently", () => {
    const saves = [
      save("9", "Save #9"),
      save("8", "Save #8"),
      save("7", "Release A"),
      save("6", "Save #7"),
      save("5", "Release B"),
    ];

    expect(groupSaveHistoryItems(saves, true)).toEqual([
      { count: 2, id: "collapsed-9-2", kind: "collapsed" },
      { kind: "save", save: saves[2] },
      { count: 1, id: "collapsed-6-1", kind: "collapsed" },
      { kind: "save", save: saves[4] },
    ]);
  });

  it("keeps all named saves visible", () => {
    const saves = [save("2", "Release B"), save("1", "Release A")];

    expect(groupSaveHistoryItems(saves, true)).toEqual([
      { kind: "save", save: saves[0] },
      { kind: "save", save: saves[1] },
    ]);
  });

  it("collapses all unnamed saves into one group", () => {
    const saves = [save("3", "Save #3"), save("2", "Save #2"), save("1", "Save #1")];

    expect(groupSaveHistoryItems(saves, true)).toEqual([
      { count: 3, id: "collapsed-3-3", kind: "collapsed" },
    ]);
  });
});
