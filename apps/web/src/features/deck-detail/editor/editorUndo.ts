import type { DeckStackLayout } from "#/lib/deck";
import type { DeckCategory, ValidatedDeckCard } from "#/lib/decklist";

export const EDITOR_UNDO_LIMIT = 20;

export type EditorSnapshot = {
  categories: DeckCategory[];
  stackLayout: DeckStackLayout;
  workingCards: ValidatedDeckCard[];
};

export type EditorUndoState = {
  redoStack: EditorSnapshot[];
  undoStack: EditorSnapshot[];
};

export function pushUndoSnapshot(
  undoState: EditorUndoState,
  snapshot: EditorSnapshot,
): EditorUndoState {
  return {
    undoStack: [...undoState.undoStack, snapshot].slice(-EDITOR_UNDO_LIMIT),
    redoStack: [],
  };
}

export function undoEditorSnapshot(undoState: EditorUndoState, currentSnapshot: EditorSnapshot) {
  const snapshot = undoState.undoStack.at(-1);
  if (!snapshot) {
    return null;
  }

  return {
    snapshot,
    undoState: {
      undoStack: undoState.undoStack.slice(0, -1),
      redoStack: [...undoState.redoStack, currentSnapshot].slice(-EDITOR_UNDO_LIMIT),
    },
  };
}

export function redoEditorSnapshot(undoState: EditorUndoState, currentSnapshot: EditorSnapshot) {
  const snapshot = undoState.redoStack.at(-1);
  if (!snapshot) {
    return null;
  }

  return {
    snapshot,
    undoState: {
      undoStack: [...undoState.undoStack, currentSnapshot].slice(-EDITOR_UNDO_LIMIT),
      redoStack: undoState.redoStack.slice(0, -1),
    },
  };
}
