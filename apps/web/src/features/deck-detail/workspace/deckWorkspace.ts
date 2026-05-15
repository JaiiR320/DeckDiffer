import { getLatestSave, type DeckCardSort, type DeckItem, type DeckSave } from "#/lib/deck";
import { normalizeStackLayout } from "#/lib/deckLayout";
import {
  createCategoryId,
  createCategoryName,
  defaultDeckCategories,
  normalizeDeckCategories,
  type CardCategory,
  type InvalidDeckCard,
  type ValidatedDeckCard,
} from "#/lib/decklist";
import { normalizeDeckSave } from "#/lib/deckSave";
import { applyValidatedDeckImport, type ImportMode } from "../editor/deckImport";
import {
  type EditorSnapshot,
  pushUndoSnapshot,
  redoEditorSnapshot,
  undoEditorSnapshot,
} from "../editor/editorUndo";
import type { DeckState } from "../editor/types";

export type DeckWorkspaceState = {
  deck: DeckItem;
  current: EditorSnapshot;
  baseline: EditorSnapshot;
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];
  compare: null | {
    saveA: DeckSave;
    saveB: DeckSave;
    display: EditorSnapshot;
  };
  importStatus: DeckState;
};

// UI callers read the Deck Workspace state, but change it only through named transitions.
// Raw categories, stack layout, and working cards remain implementation details of the Module.
export type PersistenceIntent =
  | { kind: "none" }
  | { kind: "persist-current"; snapshot: EditorSnapshot };

export type DeckWorkspaceTransitionResult = {
  workspace: DeckWorkspaceState;
  intent: PersistenceIntent;
};

export type DeckWorkspaceTransitionName =
  | "hydrateDeckWorkspace"
  | "editCurrentDecklist"
  | "undoCurrentDecklistEdit"
  | "redoCurrentDecklistEdit"
  | "markCurrentDecklistSaved"
  | "loadSaveAsCurrentDecklist"
  | "enterCompareMode"
  | "exitCompareMode"
  | "setCardSort"
  | "reverseCardSortDirection"
  | "createCategoryInLane"
  | "renameCategory"
  | "removeEmptyCategory"
  | "moveCardToCategory"
  | "moveAllCardsBetweenCategories"
  | "applyValidatedImport";

export const deckWorkspaceTransitions = {
  hydrateDeckWorkspace,
  editCurrentDecklist,
  undoCurrentDecklistEdit,
  redoCurrentDecklistEdit,
  markCurrentDecklistSaved,
  loadSaveAsCurrentDecklist,
  enterCompareMode,
  exitCompareMode,
  setCardSort,
  reverseCardSortDirection,
  createCategoryInLane,
  renameCategory,
  removeEmptyCategory,
  moveCardToCategory,
  moveAllCardsBetweenCategories,
  applyValidatedImport,
} satisfies Record<DeckWorkspaceTransitionName, unknown>;

const noPersistence: PersistenceIntent = { kind: "none" };

const emptyImportStatus: DeckState = {
  rawText: "",
  cards: [],
  invalidCards: [],
  status: "idle",
  errorMessage: null,
};

function hydrateDeckWorkspace(deck: DeckItem): DeckWorkspaceState {
  const latestSave = getLatestSave(deck);
  const baseline = latestSave ? getSnapshotFromSave(latestSave) : getEmptySnapshot();
  const current = getSnapshotFromCurrentDeck(deck, baseline) ?? baseline;

  return {
    deck,
    current,
    baseline,
    undoStack: [],
    redoStack: [],
    compare: null,
    importStatus: {
      ...emptyImportStatus,
      cards: baseline.workingCards,
      status: latestSave || current.workingCards.length > 0 ? "ready" : "idle",
    },
  };
}

function editCurrentDecklist(
  workspace: DeckWorkspaceState,
  edit: (current: EditorSnapshot) => EditorSnapshot,
): DeckWorkspaceTransitionResult {
  const nextCurrent = edit(workspace.current);
  if (isSameSnapshot(workspace.current, nextCurrent)) {
    return { workspace, intent: noPersistence };
  }

  const nextUndoState = pushUndoSnapshot(workspace, workspace.current);
  const nextWorkspace = {
    ...workspace,
    current: nextCurrent,
    undoStack: nextUndoState.undoStack,
    redoStack: nextUndoState.redoStack,
    compare: null,
  };

  return { workspace: nextWorkspace, intent: { kind: "persist-current", snapshot: nextCurrent } };
}

function undoCurrentDecklistEdit(workspace: DeckWorkspaceState): DeckWorkspaceTransitionResult {
  const result = undoEditorSnapshot(workspace, workspace.current);
  if (!result) return { workspace, intent: noPersistence };

  const nextWorkspace = {
    ...workspace,
    current: result.snapshot,
    undoStack: result.undoState.undoStack,
    redoStack: result.undoState.redoStack,
    compare: null,
  };

  return {
    workspace: nextWorkspace,
    intent: { kind: "persist-current", snapshot: result.snapshot },
  };
}

function redoCurrentDecklistEdit(workspace: DeckWorkspaceState): DeckWorkspaceTransitionResult {
  const result = redoEditorSnapshot(workspace, workspace.current);
  if (!result) return { workspace, intent: noPersistence };

  const nextWorkspace = {
    ...workspace,
    current: result.snapshot,
    undoStack: result.undoState.undoStack,
    redoStack: result.undoState.redoStack,
    compare: null,
  };

  return {
    workspace: nextWorkspace,
    intent: { kind: "persist-current", snapshot: result.snapshot },
  };
}

function markCurrentDecklistSaved(
  workspace: DeckWorkspaceState,
  deck: DeckItem,
): DeckWorkspaceTransitionResult {
  return {
    workspace: {
      ...workspace,
      deck,
      baseline: workspace.current,
      undoStack: [],
      redoStack: [],
      compare: null,
      importStatus: {
        ...workspace.importStatus,
        cards: workspace.current.workingCards,
        status: "ready",
        errorMessage: null,
      },
    },
    intent: noPersistence,
  };
}

function loadSaveAsCurrentDecklist(
  workspace: DeckWorkspaceState,
  save: DeckSave,
): DeckWorkspaceTransitionResult {
  const snapshot = getSnapshotFromSave(save);
  return {
    workspace: {
      ...workspace,
      current: snapshot,
      baseline: snapshot,
      undoStack: [],
      redoStack: [],
      compare: null,
      importStatus: {
        ...workspace.importStatus,
        cards: snapshot.workingCards,
        status: "ready",
        errorMessage: null,
      },
    },
    intent: { kind: "persist-current", snapshot },
  };
}

function enterCompareMode(
  workspace: DeckWorkspaceState,
  saveA: DeckSave,
  saveB: DeckSave,
): DeckWorkspaceTransitionResult {
  const [olderSave, newerSave] = orderSavesForCompare(saveA, saveB);
  const display = getSnapshotFromSave(newerSave);

  return {
    workspace: {
      ...workspace,
      current: display,
      undoStack: [],
      redoStack: [],
      compare: { saveA: olderSave, saveB: newerSave, display },
    },
    intent: noPersistence,
  };
}

function exitCompareMode(workspace: DeckWorkspaceState): DeckWorkspaceTransitionResult {
  const current =
    getSnapshotFromCurrentDeck(workspace.deck, workspace.baseline) ?? workspace.current;

  return {
    workspace: { ...workspace, current, undoStack: [], redoStack: [], compare: null },
    intent: noPersistence,
  };
}

function setCardSort(
  workspace: DeckWorkspaceState,
  cardSort: DeckCardSort,
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => ({
    ...current,
    stackLayout: { ...current.stackLayout, cardSort },
  }));
}

function reverseCardSortDirection(workspace: DeckWorkspaceState): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => ({
    ...current,
    stackLayout: {
      ...current.stackLayout,
      cardSortDirection: current.stackLayout.cardSortDirection === "asc" ? "desc" : "asc",
    },
  }));
}

function createCategoryInLane(
  workspace: DeckWorkspaceState,
  laneIndex: number,
  name = "Category",
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => {
    const categoryName = createCategoryName(name, current.categories);
    const category = {
      id: createCategoryId(categoryName, current.categories),
      name: categoryName,
      kind: "custom" as const,
    };
    const lanes = current.stackLayout.lanes.map((lane, index) =>
      index === laneIndex ? [...lane, category.id] : lane,
    );

    return {
      ...current,
      categories: [...current.categories, category],
      stackLayout: {
        ...current.stackLayout,
        lanes: lanes[laneIndex] ? lanes : [...lanes, [category.id]],
      },
    };
  });
}

function renameCategory(
  workspace: DeckWorkspaceState,
  categoryId: CardCategory,
  name: string,
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => ({
    ...current,
    categories: current.categories.map((category) =>
      category.id === categoryId
        ? {
            ...category,
            name: createCategoryName(
              name,
              current.categories.filter((c) => c.id !== categoryId),
            ),
          }
        : category,
    ),
  }));
}

function removeEmptyCategory(
  workspace: DeckWorkspaceState,
  categoryId: CardCategory,
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => {
    if (current.workingCards.some((card) => card.categoryId === categoryId)) return current;

    return {
      ...current,
      categories: current.categories.filter((category) => category.id !== categoryId),
      stackLayout: {
        ...current.stackLayout,
        lanes: current.stackLayout.lanes.map((lane) => lane.filter((id) => id !== categoryId)),
      },
    };
  });
}

function moveCardToCategory(
  workspace: DeckWorkspaceState,
  oracleId: string,
  categoryId: CardCategory,
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => ({
    ...current,
    workingCards: current.workingCards.map((card) =>
      card.oracleId === oracleId ? { ...card, categoryId } : card,
    ),
  }));
}

function moveAllCardsBetweenCategories(
  workspace: DeckWorkspaceState,
  fromCategoryId: CardCategory,
  toCategoryId: CardCategory,
): DeckWorkspaceTransitionResult {
  return editCurrentDecklist(workspace, (current) => ({
    ...current,
    workingCards: current.workingCards.map((card) =>
      card.categoryId === fromCategoryId ? { ...card, categoryId: toCategoryId } : card,
    ),
  }));
}

function applyValidatedImport(
  workspace: DeckWorkspaceState,
  options: {
    mode: ImportMode;
    validCards: ValidatedDeckCard[];
    warnings: InvalidDeckCard[];
    rawText: string;
  },
): DeckWorkspaceTransitionResult {
  const result = applyValidatedDeckImport({
    ...options,
    baselineDeck: workspace.importStatus,
    workingCards: workspace.current.workingCards,
  });
  const nextCurrent = { ...workspace.current, workingCards: result.workingCards };
  const nextUndoState = pushUndoSnapshot(workspace, workspace.current);

  return {
    workspace: {
      ...workspace,
      current: nextCurrent,
      importStatus: result.baselineDeck,
      undoStack: nextUndoState.undoStack,
      redoStack: nextUndoState.redoStack,
      compare: null,
    },
    intent: { kind: "persist-current", snapshot: nextCurrent },
  };
}

function getEmptySnapshot(): EditorSnapshot {
  const categories = defaultDeckCategories();
  return { categories, stackLayout: normalizeStackLayout(undefined, categories), workingCards: [] };
}

function getSnapshotFromSave(save: DeckSave): EditorSnapshot {
  const normalizedSave = normalizeDeckSave(save);
  const categories = normalizeDeckCategories(normalizedSave.categories);

  return {
    categories,
    stackLayout: normalizeStackLayout(normalizedSave.layout, categories),
    workingCards: normalizedSave.cards,
  };
}

function getSnapshotFromCurrentDeck(
  deck: DeckItem,
  fallback: Pick<EditorSnapshot, "categories" | "stackLayout">,
): EditorSnapshot | null {
  if (!deck.cards) return null;

  const currentSave = normalizeDeckSave({
    id: "current",
    label: "Current",
    savedAt: deck.updatedAt,
    categories: deck.categories ?? fallback.categories,
    cards: deck.cards,
    layout: deck.layout ?? fallback.stackLayout,
  });
  const categories = normalizeDeckCategories(currentSave.categories);
  return {
    categories,
    stackLayout: normalizeStackLayout(currentSave.layout, categories),
    workingCards: currentSave.cards,
  };
}

function orderSavesForCompare(saveA: DeckSave, saveB: DeckSave) {
  return new Date(saveA.savedAt) <= new Date(saveB.savedAt) ? [saveA, saveB] : [saveB, saveA];
}

function isSameSnapshot(left: EditorSnapshot, right: EditorSnapshot) {
  return JSON.stringify(left) === JSON.stringify(right);
}
