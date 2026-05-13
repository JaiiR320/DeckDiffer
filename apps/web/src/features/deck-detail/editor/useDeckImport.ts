import { useState } from "react";
import type { FormEvent } from "react";
import { mergeValidatedCards, parseDecklist, type ValidatedDeckCard } from "#/lib/decklist";
import { validateDeckEntries } from "#/lib/scryfall";
import type { DeckState, ExportModalState } from "./types";

type ImportMode = "replace-empty" | "bulk-add" | "override";

type UseDeckImportOptions = {
  deckState: {
    baselineDeck: DeckState;
    workingCards: ValidatedDeckCard[];
  };
  editorActions: {
    setBaselineDeck: React.Dispatch<React.SetStateAction<DeckState>>;
    setWorkingCards: React.Dispatch<React.SetStateAction<ValidatedDeckCard[]>>;
    setWorkingCardsWithUndo?: React.Dispatch<React.SetStateAction<ValidatedDeckCard[]>>;
  };
};

export function useDeckImport({ deckState, editorActions }: UseDeckImportOptions) {
  const [draftDeck, setDraftDeck] = useState("");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportModalState>({ includeQuantity: true });
  const { baselineDeck, workingCards } = deckState;
  const {
    setBaselineDeck,
    setWorkingCards,
    setWorkingCardsWithUndo = setWorkingCards,
  } = editorActions;

  function openImportModal() {
    setDraftDeck(workingCards.length > 0 ? "" : baselineDeck.rawText);
    setIsImportOpen(true);
  }

  function closeImportModal() {
    setDraftDeck("");
    setIsImportOpen(false);
  }

  async function validateDraftDeck(rawText: string) {
    const { entries, errors } = parseDecklist(rawText);
    const { validCards, invalidCards } = await validateDeckEntries(entries);

    return {
      validCards,
      warnings: [
        ...errors.map((error) => ({
          lineNumber: error.lineNumber,
          quantity: 0,
          name: error.text,
          reason: error.reason,
        })),
        ...invalidCards,
      ],
    };
  }

  async function importDraftDeck(mode: ImportMode) {
    const snapshotCards = workingCards;
    const rawText = draftDeck.trim();

    setBaselineDeck((currentDeck) => ({
      ...currentDeck,
      ...(mode === "replace-empty" ? { rawText } : {}),
      status: "loading",
      invalidCards: [],
      errorMessage: null,
    }));
    closeImportModal();

    try {
      const { validCards, warnings } = await validateDraftDeck(rawText);

      if (mode === "bulk-add") {
        setWorkingCardsWithUndo((currentCards) =>
          mergeValidatedCards([...currentCards, ...validCards]),
        );
        setBaselineDeck((currentDeck) => ({
          ...currentDeck,
          invalidCards: warnings,
          status: "ready",
          errorMessage: null,
        }));
        return;
      }

      if (mode === "override") {
        setBaselineDeck({
          rawText: "",
          cards: snapshotCards,
          invalidCards: warnings,
          status: "ready",
          errorMessage: null,
        });
        setWorkingCardsWithUndo(validCards);
        return;
      }

      setBaselineDeck({
        rawText,
        cards: validCards,
        invalidCards: warnings,
        status: "ready",
        errorMessage: null,
      });
      setWorkingCardsWithUndo(validCards);
    } catch (error) {
      if (mode === "replace-empty") {
        setBaselineDeck({
          rawText,
          cards: [],
          invalidCards: [],
          status: "error",
          errorMessage:
            error instanceof Error ? error.message : "Could not import this deck right now.",
        });
        setWorkingCards([]);
        return;
      }

      setBaselineDeck((currentDeck) => ({
        ...currentDeck,
        status: "ready",
        errorMessage:
          error instanceof Error
            ? error.message
            : mode === "bulk-add"
              ? "Could not add cards right now."
              : "Could not import this deck right now.",
      }));
    }
  }

  function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void importDraftDeck(workingCards.length > 0 ? "bulk-add" : "replace-empty");
  }

  return {
    draftDeck,
    exportOptions,
    isExportOpen,
    isImportOpen,
    closeImportModal,
    importDraftDeck,
    openExportModal: () => setIsExportOpen(true),
    openImportModal,
    setDraftDeck,
    setIsExportOpen,
    submitImport,
    toggleExportQuantity: () =>
      setExportOptions((current) => ({ ...current, includeQuantity: !current.includeQuantity })),
  };
}
