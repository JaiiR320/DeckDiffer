import { buildEditorRows, groupEditorRows } from "../deck-editor/editorRows";
import type { DeckState } from "../deck-editor/types";
import type { DeckSave } from "../../lib/deck";
import { mergeValidatedCards, type DeckCategory, type ValidatedDeckCard } from "../../lib/decklist";

type BuildDeckEditorModelOptions = {
  baselineDeck: DeckState;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  categories: DeckCategory[];
  workingCards: ValidatedDeckCard[];
};

export function buildDeckEditorModel({
  baselineDeck,
  compareMode,
  compareSaves,
  categories,
  workingCards,
}: BuildDeckEditorModelOptions) {
  const compareBaselineCards = compareSaves?.saveA.cards ?? baselineDeck.cards;
  const compareWorkingCards = compareSaves?.saveB.cards ?? workingCards;
  const mergedWorkingCards = mergeValidatedCards(compareWorkingCards);
  const editorRows = buildEditorRows(compareBaselineCards, compareWorkingCards, categories);

  return {
    emptyMessage:
      baselineDeck.status === "loading"
        ? "Validating the imported deck with Scryfall."
        : compareMode
          ? `Comparing "${compareSaves?.saveA.label}" → "${compareSaves?.saveB.label}"`
          : "Import a deck or add cards to start building.",
    groupedRows: groupEditorRows(editorRows, categories),
    mergedWorkingCards,
    resultCardTotal: editorRows.reduce((total, row) => total + row.currentQuantity, 0),
  };
}
