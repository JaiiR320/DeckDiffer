import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DeckColor, DeckItem, DeckSave, DeckStackLayout, DeckTileCover } from "#/lib/deck";
import type { DeckCategory, ValidatedDeckCard } from "#/lib/decklist";
import type { DeckState } from "./types";
import {
  deleteDeckForUser,
  renameDeckForUser,
  saveDeckForUser,
  updateDeckColorsForUser,
  updateDeckCoverForUser,
} from "#/server/decks";
import { downloadCurrentDeck } from "./deckDownloads";
import type { EditorSnapshot } from "./editorUndo";
import {
  deckWorkspaceTransitions,
  type DeckWorkspaceState,
  type DeckWorkspaceTransitionResult,
} from "../workspace/deckWorkspace";

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
    requestDeckWorkspaceTransition: (
      transition: (workspace: DeckWorkspaceState) => DeckWorkspaceTransitionResult,
    ) => void;
  };
  navigationState: {
    setActiveTab: Dispatch<SetStateAction<"editor" | "history" | "stats">>;
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
    requestDeckWorkspaceTransition,
  } = editorState;
  const { setActiveTab, setCompareMode, setCompareSaves } = navigationState;

  function markSnapshotSaved(snapshot: EditorSnapshot) {
    setBaselineDeck({
      rawText: "",
      cards: snapshot.workingCards,
      invalidCards: [],
      status: "ready",
      errorMessage: null,
    });
    clearUndoHistory();
    setBaselineCategories(snapshot.categories);
    setBaselineStackLayout(snapshot.stackLayout);
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
      markSnapshotSaved({ categories, stackLayout, workingCards });
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

  async function setDeckCover(cover: DeckTileCover | null) {
    if (!deck) return false;

    try {
      const updatedDeck = await updateDeckCoverForUser({ data: { deckId: deck.id, cover } });
      if (!updatedDeck) throw new Error("Could not update deck cover.");

      setDeck(updatedDeck);
      setDeckErrorMessage(null);
      return true;
    } catch (error) {
      setDeckErrorMessage(
        error instanceof Error ? error.message : "Could not update deck cover right now.",
      );
      return false;
    }
  }

  async function setDeckColors(colors: DeckColor[]) {
    if (!deck) return false;

    try {
      const updatedDeck = await updateDeckColorsForUser({ data: { deckId: deck.id, colors } });
      if (!updatedDeck) throw new Error("Could not update deck colors.");

      setDeck(updatedDeck);
      setDeckErrorMessage(null);
      return true;
    } catch (error) {
      setDeckErrorMessage(
        error instanceof Error ? error.message : "Could not update deck colors right now.",
      );
      return false;
    }
  }

  function exportDeck(deckToExport: DeckItem) {
    downloadCurrentDeck({ ...deckToExport, cards: workingCards });
    setIsDeckActionsOpen(false);
  }

  async function loadSave(save: DeckSave) {
    requestDeckWorkspaceTransition((workspace) =>
      deckWorkspaceTransitions.loadSaveAsCurrentDecklist(workspace, save),
    );
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
    requestDeckWorkspaceTransition((workspace) =>
      deckWorkspaceTransitions.enterCompareMode(workspace, saveA, saveB),
    );
    setCompareMode(true);
    setActiveTab("editor");
  }

  function exitCompareMode() {
    requestDeckWorkspaceTransition(deckWorkspaceTransitions.exitCompareMode);
  }

  return {
    compareSaves,
    deleteDeck,
    exitCompareMode,
    exportDeck,
    isDeckActionsOpen,
    isSaveOpen,
    loadSave,
    renameDeck,
    saveDeck,
    setDeckColors,
    setDeckCover,
    saveSnapshotBeforeLoad,
    closeSaveModal,
    setIsDeckActionsOpen,
    setIsSaveOpen,
  };
}
