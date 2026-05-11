import { useEffect, useState } from "react";

export type DeckEditorViewMode = "list" | "stack";

const DECK_VIEW_MODE_STORAGE_KEY = "deckdiff.deckEditor.viewMode";

export function useDeckViewMode() {
  const [deckViewMode, setDeckViewMode] = useState<DeckEditorViewMode>("list");

  useEffect(() => {
    const storedViewMode = window.localStorage.getItem(DECK_VIEW_MODE_STORAGE_KEY);

    if (storedViewMode === "list" || storedViewMode === "stack") {
      setDeckViewMode(storedViewMode);
    }
  }, []);

  function updateDeckViewMode(mode: DeckEditorViewMode) {
    setDeckViewMode(mode);
    window.localStorage.setItem(DECK_VIEW_MODE_STORAGE_KEY, mode);
  }

  return [deckViewMode, updateDeckViewMode] as const;
}
