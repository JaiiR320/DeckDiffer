import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { DeckState } from "../deck-editor/types";
import { getLatestSave, type DeckItem, type DeckSave, type DeckStackLayout } from "../../lib/deck";
import { normalizeStackLayout } from "../../lib/deckLayout";
import type { ValidatedDeckCard } from "../../lib/decklist";
import { deleteDeckForUser, renameDeckForUser, saveDeckForUser } from "#/server/decks";
import { downloadLatestDeckSave } from "./deckDownloads";

type UseDeckActionsOptions = {
  deckState: {
    deck: DeckItem | undefined;
    setDeck: Dispatch<SetStateAction<DeckItem | undefined>>;
    setDeckErrorMessage: Dispatch<SetStateAction<string | null>>;
  };
  editorState: {
    stackLayout: DeckStackLayout;
    workingCards: ValidatedDeckCard[];
    setBaselineDeck: Dispatch<SetStateAction<DeckState>>;
    setBaselineStackLayout: Dispatch<SetStateAction<DeckStackLayout>>;
    setStackLayout: Dispatch<SetStateAction<DeckStackLayout>>;
    setWorkingCards: Dispatch<SetStateAction<ValidatedDeckCard[]>>;
  };
  navigationState: {
    setActiveTab: Dispatch<SetStateAction<"editor" | "history">>;
    setCompareMode: Dispatch<SetStateAction<boolean>>;
    setCompareSaves: Dispatch<SetStateAction<{ saveA: DeckSave; saveB: DeckSave } | null>>;
  };
};

export function useDeckActions({
  deckState,
  editorState,
  navigationState,
}: UseDeckActionsOptions) {
  const navigate = useNavigate();
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [isDeckActionsOpen, setIsDeckActionsOpen] = useState(false);
  const { deck, setDeck, setDeckErrorMessage } = deckState;
  const {
    stackLayout,
    workingCards,
    setBaselineDeck,
    setBaselineStackLayout,
    setStackLayout,
    setWorkingCards,
  } = editorState;
  const { setActiveTab, setCompareMode, setCompareSaves } = navigationState;

  function loadCardsFromSave(save: DeckSave, updateBaseline: boolean) {
    const saveLayout = normalizeStackLayout(save.layout);
    setWorkingCards(save.cards);
    setBaselineDeck({ rawText: "", cards: save.cards, invalidCards: [], status: "ready", errorMessage: null });
    setStackLayout(saveLayout);
    if (updateBaseline) {
      setBaselineStackLayout(saveLayout);
    }
  }

  async function saveDeck(label: string) {
    if (!deck) return;

    try {
      const updatedDeck = await saveDeckForUser({
        data: { deckId: deck.id, label, cards: workingCards, layout: stackLayout },
      });

      if (!updatedDeck) throw new Error("Could not save deck.");

      setDeck(updatedDeck);
      setDeckErrorMessage(null);
      setBaselineDeck({ rawText: "", cards: workingCards, invalidCards: [], status: "ready", errorMessage: null });
      setBaselineStackLayout(stackLayout);
      setIsSaveOpen(false);
    } catch (error) {
      setDeckErrorMessage(error instanceof Error ? error.message : "Could not save deck right now.");
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
      setDeckErrorMessage(error instanceof Error ? error.message : "Could not rename deck right now.");
    }
  }

  async function deleteDeck(deckId: string) {
    try {
      await deleteDeckForUser({ data: { deckId } });
      await navigate({ to: "/decks" });
    } catch (error) {
      setDeckErrorMessage(error instanceof Error ? error.message : "Could not delete deck right now.");
    }
  }

  function exportDeck(deckToExport: DeckItem) {
    downloadLatestDeckSave(deckToExport);
    setIsDeckActionsOpen(false);
  }

  function loadSave(save: DeckSave) {
    loadCardsFromSave(save, true);
    setCompareMode(false);
    setCompareSaves(null);
    setActiveTab("editor");
  }

  function compareSaves(saveA: DeckSave, saveB: DeckSave) {
    const olderSave = new Date(saveA.savedAt) <= new Date(saveB.savedAt) ? saveA : saveB;
    const newerSave = new Date(saveA.savedAt) <= new Date(saveB.savedAt) ? saveB : saveA;
    setCompareSaves({ saveA: olderSave, saveB: newerSave });
    setStackLayout(normalizeStackLayout(newerSave.layout));
    setCompareMode(true);
    setActiveTab("editor");
  }

  function exitCompareMode() {
    setCompareMode(false);
    setCompareSaves(null);
    const latestSave = deck ? getLatestSave(deck) : null;
    if (latestSave) {
      loadCardsFromSave(latestSave, true);
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
    setIsDeckActionsOpen,
    setIsSaveOpen,
  };
}
