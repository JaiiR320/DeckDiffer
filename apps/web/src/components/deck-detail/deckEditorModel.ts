import { buildEditorRows, groupEditorRows } from "../deck-editor/editorRows";
import type { DeckState } from "../deck-editor/types";
import type { DeckSave } from "../../lib/deck";
import { mergeValidatedCards, type ValidatedDeckCard } from "../../lib/decklist";

type BuildDeckEditorModelOptions = {
  baselineDeck: DeckState;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  workingCards: ValidatedDeckCard[];
};

export function buildDeckEditorModel({
  baselineDeck,
  compareMode,
  compareSaves,
  workingCards,
}: BuildDeckEditorModelOptions) {
  const compareBaselineCards = compareSaves?.saveA.cards ?? baselineDeck.cards;
  const compareWorkingCards = compareSaves?.saveB.cards ?? workingCards;
  const mergedWorkingCards = mergeValidatedCards(compareWorkingCards);
  const editorRows = buildEditorRows(compareBaselineCards, compareWorkingCards);

  return {
    emptyMessage:
      baselineDeck.status === "loading"
        ? "Validating the imported deck with Scryfall."
        : compareMode
          ? `Comparing "${compareSaves?.saveA.label}" → "${compareSaves?.saveB.label}"`
          : "Import a deck or add cards to start building.",
    groupedRows: groupEditorRows(editorRows),
    mergedWorkingCards,
    resultCardTotal: editorRows.reduce((total, row) => total + row.currentQuantity, 0),
  };
}
