import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DeckItem, DeckSave, DeckStackLayout } from "#/lib/deck";
import { normalizeStackLayout } from "#/lib/deckLayout";
import { normalizeDeckCategories, type DeckCategory, type ValidatedDeckCard } from "#/lib/decklist";
import { normalizeDeckSave } from "#/lib/deckSave";
import type { DeckState } from "./types";
import { deleteDeckForUser, renameDeckForUser, saveDeckForUser } from "#/server/decks";
import { downloadCurrentDeck } from "./deckDownloads";
import type { EditorSnapshot } from "./editorUndo";

type UseDeckActionsOptions = {
  deckState: {
    deck: DeckItem | undefined;
    setDeck: Dispatch<SetStateAction<DeckItem | undefined>>;
    setDeckErrorMessage: Dispatch<SetStateAction<string | null>>;
  };
  editorState: {
    stackLayout: DeckStackLayout;
    categories: DeckCategory[];
    workingCards: ValidatedDeckCard[];
    setBaselineDeck: Dispatch<SetStateAction<DeckState>>;
    setBaselineCategories: Dispatch<SetStateAction<DeckCategory[]>>;
    setBaselineStackLayout: Dispatch<SetStateAction<DeckStackLayout>>;
    clearUndoHistory: () => void;
    setStackLayout: Dispatch<SetStateAction<DeckStackLayout>>;
    setCategories: Dispatch<SetStateAction<DeckCategory[]>>;
    setWorkingCards: Dispatch<SetStateAction<ValidatedDeckCard[]>>;
    persistEditorSnapshot: (snapshot: EditorSnapshot) => Promise<boolean>;
  };
  navigationState: {
    setActiveTab: Dispatch<SetStateAction<"editor" | "history">>;
    setCompareMode: Dispatch<SetStateAction<boolean>>;
    setCompareSaves: Dispatch<SetStateAction<{ saveA: DeckSave; saveB: DeckSave } | null>>;
  };
};

export function useDeckActions({ deckState, editorState, navigationState }: UseDeckActionsOptions) {
  const navigate = useNavigate();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isDeckActionsOpen, setIsDeckActionsOpen] = useState(false);
  const [pendingLoadSave, setPendingLoadSave] = useState<DeckSave | null>(null);
  const { deck, setDeck, setDeckErrorMessage } = deckState;
  const {
    stackLayout,
    categories,
    workingCards,
    setBaselineDeck,
    setBaselineCategories,
    setBaselineStackLayout,
    clearUndoHistory,
    setStackLayout,
    setCategories,
    setWorkingCards,
    persistEditorSnapshot,
  } = editorState;
  const { setActiveTab, setCompareMode, setCompareSaves } = navigationState;

  function getSnapshotFromSave(save: DeckSave): EditorSnapshot {
    const normalizedSave = normalizeDeckSave(save);
    const saveCategories = normalizeDeckCategories(normalizedSave.categories);
    const saveLayout = normalizeStackLayout(normalizedSave.layout, saveCategories);

    return {
      categories: saveCategories,
      stackLayout: saveLayout,
      workingCards: normalizedSave.cards,
    };
  }

  function getSnapshotFromCurrentDeck(deckItem: DeckItem): EditorSnapshot | null {
    if (!deckItem.cards) return null;

    return getSnapshotFromSave({
      id: "current",
      label: "Current",
      savedAt: deckItem.updatedAt,
      categories: deckItem.categories,
      cards: deckItem.cards,
      layout: deckItem.layout,
    });
  }

  function applySnapshot(snapshot: EditorSnapshot, updateBaseline: boolean) {
    setCategories(snapshot.categories);
    setWorkingCards(snapshot.workingCards);
    setBaselineDeck({
      rawText: "",
      cards: snapshot.workingCards,
      invalidCards: [],
      status: "ready",
      errorMessage: null,
    });
    setStackLayout(snapshot.stackLayout);
    clearUndoHistory();
    if (updateBaseline) {
      setBaselineCategories(snapshot.categories);
      setBaselineStackLayout(snapshot.stackLayout);
    }
  }

  function loadCardsFromSave(save: DeckSave, updateBaseline: boolean) {
    applySnapshot(getSnapshotFromSave(save), updateBaseline);
  }

  async function saveDeck(label: string) {
    if (!deck) return;
    const saveToLoad = pendingLoadSave;

    try {
      const updatedDeck = await saveDeckForUser({
        data: { deckId: deck.id, label, categories, cards: workingCards, layout: stackLayout },
      });

      if (!updatedDeck) throw new Error("Could not save deck.");

      setDeck(updatedDeck);
      setDeckErrorMessage(null);
      setBaselineDeck({
        rawText: "",
        cards: workingCards,
        invalidCards: [],
        status: "ready",
        errorMessage: null,
      });
      setBaselineCategories(categories);
      setBaselineStackLayout(stackLayout);
      setIsSaveOpen(false);
      setPendingLoadSave(null);
      if (saveToLoad) {
        await loadSave(saveToLoad);
      }
      return true;
    } catch (error) {
      setDeckErrorMessage(
        error instanceof Error ? error.message : "Could not save deck right now.",
      );
      return false;
    }
  }

  async function renameDeck(deckId: string, newName: string) {
    if (!deck || deck.id !== deckId) return;

    try {
      const updatedDeck = await renameDeckForUser({ data: { deckId, newName } });

      if (!updatedDeck) throw new Error("Could not rename deck.");

      setDeck(updatedDeck);
      setDeckErrorMessage(null);

      if (updatedDeck.id !== deckId) {
        await navigate({ to: "/decks/$deckId", params: { deckId: updatedDeck.id }, replace: true });
      }

      setIsDeckActionsOpen(false);
    } catch (error) {
      setDeckErrorMessage(
        error instanceof Error ? error.message : "Could not rename deck right now.",
      );
    }
  }

  async function deleteDeck(deckId: string) {
    try {
      await deleteDeckForUser({ data: { deckId } });
      await navigate({ to: "/decks" });
    } catch (error) {
      setDeckErrorMessage(
        error instanceof Error ? error.message : "Could not delete deck right now.",
      );
    }
  }

  function exportDeck(deckToExport: DeckItem) {
    downloadCurrentDeck({ ...deckToExport, cards: workingCards });
    setIsDeckActionsOpen(false);
  }

  async function loadSave(save: DeckSave) {
    const snapshot = getSnapshotFromSave(save);
    applySnapshot(snapshot, true);
    await persistEditorSnapshot(snapshot);
    setCompareMode(false);
    setCompareSaves(null);
    setActiveTab("editor");
  }

  function saveSnapshotBeforeLoad(save: DeckSave) {
    setPendingLoadSave(save);
    setIsSaveOpen(true);
  }

  function closeSaveModal() {
    setPendingLoadSave(null);
    setIsSaveOpen(false);
  }

  function compareSaves(saveA: DeckSave, saveB: DeckSave) {
    const olderSave = new Date(saveA.savedAt) <= new Date(saveB.savedAt) ? saveA : saveB;
    const newerSave = new Date(saveA.savedAt) <= new Date(saveB.savedAt) ? saveB : saveA;
    setCompareSaves({ saveA: olderSave, saveB: newerSave });
    const normalizedSave = normalizeDeckSave(newerSave);
    const saveCategories = normalizeDeckCategories(normalizedSave.categories);
    setCategories(saveCategories);
    setStackLayout(normalizeStackLayout(normalizedSave.layout, saveCategories));
    setCompareMode(true);
    setActiveTab("editor");
    clearUndoHistory();
  }

  function exitCompareMode() {
    setCompareMode(false);
    setCompareSaves(null);
    const currentSnapshot = deck ? getSnapshotFromCurrentDeck(deck) : null;
    if (currentSnapshot) {
      applySnapshot(currentSnapshot, false);
    } else {
      clearUndoHistory();
    }
  }

  return {
    compareSaves,
    deleteDeck,
    exitCompareMode,
    exportDeck,
    isDeckActionsOpen,
    isSaveOpen,
    loadCardsFromSave,
    loadSave,
    renameDeck,
    saveDeck,
    saveSnapshotBeforeLoad,
    closeSaveModal,
    setIsDeckActionsOpen,
    setIsSaveOpen,
  };
}
