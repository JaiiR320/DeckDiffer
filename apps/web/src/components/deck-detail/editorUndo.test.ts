import { describe, expect, it } from "vitest";
import {
  EDITOR_UNDO_LIMIT,
  type EditorSnapshot,
  type EditorUndoState,
  pushUndoSnapshot,
  redoEditorSnapshot,
  undoEditorSnapshot,
} from "./editorUndo";

function snapshot(id: number): EditorSnapshot {
  return {
    categories: [{ id: `category-${id}`, name: `Category ${id}`, kind: "custom" }],
    stackLayout: { lanes: [[`category-${id}`]] },
    workingCards: [
      {
        oracleId: `card-${id}`,
        name: `Card ${id}`,
        quantity: id,
        typeLine: "Artifact",
        categoryId: `category-${id}`,
      },
    ],
  };
}

describe("editorUndo", () => {
  it("undo restores previous snapshots and queues redo", () => {
    const undoState: EditorUndoState = {
      undoStack: [snapshot(1), snapshot(2)],
      redoStack: [],
    };

    const result = undoEditorSnapshot(undoState, snapshot(3));

    expect(result?.snapshot).toEqual(snapshot(2));
    expect(result?.undoState.undoStack).toEqual([snapshot(1)]);
    expect(result?.undoState.redoStack).toEqual([snapshot(3)]);
  });

  it("redo restores undone snapshots and queues undo", () => {
    const undoState: EditorUndoState = {
      undoStack: [snapshot(1)],
      redoStack: [snapshot(3)],
    };

    const result = redoEditorSnapshot(undoState, snapshot(2));

    expect(result?.snapshot).toEqual(snapshot(3));
    expect(result?.undoState.undoStack).toEqual([snapshot(1), snapshot(2)]);
    expect(result?.undoState.redoStack).toEqual([]);
  });

  it("new edits clear redo", () => {
    const undoState: EditorUndoState = {
      undoStack: [snapshot(1)],
      redoStack: [snapshot(3)],
    };

    expect(pushUndoSnapshot(undoState, snapshot(2))).toEqual({
      undoStack: [snapshot(1), snapshot(2)],
      redoStack: [],
    });
  });

  it("caps undo snapshots", () => {
    const undoState = Array.from({ length: EDITOR_UNDO_LIMIT + 5 }, (_, index) =>
      snapshot(index),
    ).reduce<EditorUndoState>(pushUndoSnapshot, { undoStack: [], redoStack: [] });

    expect(undoState.undoStack).toHaveLength(EDITOR_UNDO_LIMIT);
    expect(undoState.undoStack[0]).toEqual(snapshot(5));
  });
});
