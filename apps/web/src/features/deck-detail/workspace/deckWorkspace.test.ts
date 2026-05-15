import { describe, expect, it } from "vitest";
import type { DeckItem, DeckSave } from "#/lib/deck";
import type { ValidatedDeckCard } from "#/lib/decklist";
import type { EditorSnapshot } from "../editor/editorUndo";
import {
  deckWorkspaceTransitions,
  type DeckWorkspaceState,
  type DeckWorkspaceTransitionResult,
  type DeckWorkspaceTransitionName,
  type PersistenceIntent,
} from "./deckWorkspace";

const TRANSITION_NAMES: DeckWorkspaceTransitionName[] = [
  "hydrateDeckWorkspace",
  "editCurrentDecklist",
  "undoCurrentDecklistEdit",
  "redoCurrentDecklistEdit",
  "markCurrentDecklistSaved",
  "loadSaveAsCurrentDecklist",
  "enterCompareMode",
  "exitCompareMode",
  "setCardSort",
  "reverseCardSortDirection",
  "createCategoryInLane",
  "renameCategory",
  "removeEmptyCategory",
  "moveCardToCategory",
  "moveAllCardsBetweenCategories",
  "applyValidatedImport",
];

describe("deckWorkspace", () => {
  it("exports the locked Deck Workspace transition names", () => {
    expect(Object.keys(deckWorkspaceTransitions)).toEqual(TRANSITION_NAMES);
  });

  it("hydrates current decklist from current deck data and baseline from latest save", () => {
    const latestSave = save("save-1", "2026-01-01T00:00:00.000Z", snapshot("save-card", 2));
    const deck = deckItem({ saves: [latestSave], current: snapshot("current-card", 3) });

    const workspace: DeckWorkspaceState = deckWorkspaceTransitions.hydrateDeckWorkspace(deck);

    expect(workspace.deck).toBe(deck);
    expect(workspace.current.workingCards).toEqual([card("current-card", 3)]);
    expect(workspace.baseline.workingCards).toEqual([card("save-card", 2)]);
    expect(workspace.compare).toBeNull();
  });

  it("returns persistence intents from current decklist edits", () => {
    const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(
      deckItem({ current: snapshot("a", 1) }),
    );

    const result: DeckWorkspaceTransitionResult = deckWorkspaceTransitions.editCurrentDecklist(
      workspace,
      (current) => ({
        ...current,
        workingCards: [card("a", 2)],
      }),
    );

    const expectedIntent: PersistenceIntent = {
      kind: "persist-current",
      snapshot: result.workspace.current,
    };
    expect(result.intent).toEqual(expectedIntent);
    expect(result.workspace.undoStack).toEqual([workspace.current]);
    expect(workspace.current.workingCards).toEqual([card("a", 1)]);
  });

  it("does not request persistence when an edit leaves the current decklist unchanged", () => {
    const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(
      deckItem({ current: snapshot("a", 1) }),
    );

    const result = deckWorkspaceTransitions.editCurrentDecklist(workspace, (current) => current);

    expect(result.workspace).toBe(workspace);
    expect(result.intent).toEqual({ kind: "none" });
  });

  it("loads a Save as the Current Decklist through a persistence intent", () => {
    const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(
      deckItem({ current: snapshot("current", 1) }),
    );
    const targetSave = save("save-2", "2026-01-02T00:00:00.000Z", snapshot("loaded", 4));

    const result = deckWorkspaceTransitions.loadSaveAsCurrentDecklist(workspace, targetSave);

    expect(result.workspace.current.workingCards).toEqual([card("loaded", 4)]);
    expect(result.workspace.baseline).toEqual(result.workspace.current);
    expect(result.intent).toEqual({ kind: "persist-current", snapshot: result.workspace.current });
  });

  it("enters Compare Mode without persistence and displays the newer Save", () => {
    const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(
      deckItem({ current: snapshot("current", 1) }),
    );
    const newerSave = save("newer", "2026-01-03T00:00:00.000Z", snapshot("newer-card", 3));
    const olderSave = save("older", "2026-01-01T00:00:00.000Z", snapshot("older-card", 1));

    const result = deckWorkspaceTransitions.enterCompareMode(workspace, newerSave, olderSave);

    expect(result.intent).toEqual({ kind: "none" });
    expect(result.workspace.compare).toMatchObject({ saveA: olderSave, saveB: newerSave });
    expect(result.workspace.current.workingCards).toEqual([card("newer-card", 3)]);
  });

  it("moves cards by named transition instead of exposing raw card mutation", () => {
    const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(
      deckItem({ current: snapshot("a", 1) }),
    );

    const result = deckWorkspaceTransitions.moveCardToCategory(workspace, "a", "artifact");

    expect(result.workspace.current.workingCards[0]?.categoryId).toBe("artifact");
    expect(result.intent.kind).toBe("persist-current");
  });
});

function deckItem({
  saves = [],
  current,
}: {
  saves?: DeckSave[];
  current?: EditorSnapshot;
}): DeckItem {
  return {
    id: "deck-1",
    name: "Deck 1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
    categories: current?.categories,
    cards: current?.workingCards,
    layout: current?.stackLayout,
    saves,
  };
}

function save(id: string, savedAt: string, editorSnapshot: EditorSnapshot): DeckSave {
  return {
    id,
    label: id,
    savedAt,
    categories: editorSnapshot.categories,
    cards: editorSnapshot.workingCards,
    layout: editorSnapshot.stackLayout,
  };
}

function snapshot(oracleId: string, quantity: number): EditorSnapshot {
  return {
    categories: [
      { id: "creature", name: "Creature", kind: "default" },
      { id: "artifact", name: "Artifact", kind: "default" },
    ],
    stackLayout: { lanes: [["creature"], ["artifact"]] },
    workingCards: [card(oracleId, quantity)],
  };
}

function card(oracleId: string, quantity: number): ValidatedDeckCard {
  return {
    oracleId,
    name: oracleId,
    quantity,
    typeLine: "Creature",
    categoryId: "creature",
  };
}
