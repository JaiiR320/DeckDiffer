import { DeckAlerts } from "./components/DeckAlerts";
import { EditorDeckStack } from "./stack/EditorDeckStack";
import type { EditorRow } from "./editor/types";
import { useState, type ReactNode } from "react";
import { PrintingPickerModal } from "./modals/PrintingPickerModal";
import {
  useDeckDetailActions,
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckDetailState,
} from "./deckDetailContext";

export function StackEditor({ searchToolbar }: { searchToolbar: ReactNode }) {
  const { baselineDeck, categories, compareMode, showDiffOnly, stackLayout } = useDeckDetailState();
  const { categoryDiffs, groupedRows, resultCardTotal } = useDeckDetailModel();
  const actions = useDeckDetailActions();
  const { deckActions } = useDeckDetailServices();
  const [printingRow, setPrintingRow] = useState<EditorRow | null>(null);

  return (
    <div className="min-w-0">
      <DeckAlerts
        deck={baselineDeck}
        onDismissWarnings={() =>
          actions.setBaselineDeck((current) => ({ ...current, invalidCards: [] }))
        }
      />
      <EditorDeckStack
        categories={categories}
        categoryDiffs={categoryDiffs}
        groupedRows={groupedRows}
        resultCardTotal={resultCardTotal}
        showDiffOnly={showDiffOnly}
        layout={stackLayout}
        onToggleShowDiffOnly={() => actions.setShowDiffOnly((current) => !current)}
        onLayoutChange={actions.onSetStackLayout}
        searchToolbar={searchToolbar}
        onAddSearchCard={actions.onAddSearchCard}
        onAdjustQuantity={compareMode ? undefined : actions.onAdjustQuantity}
        onMoveCardCategory={compareMode ? undefined : actions.onMoveCardToCategory}
        onChangePrinting={compareMode ? undefined : (row) => setPrintingRow(row)}
        onSetDeckCover={(cover) => void deckActions.setDeckCover(cover)}
        onMoveCategoryCards={compareMode ? undefined : actions.onMoveAllCardsBetweenCategories}
        onCreateCategoryInLane={(laneIndex, category) => {
          if (compareMode) return;
          actions.onCreateCategoryInLane(laneIndex, category);
        }}
        onRemoveLane={(laneIndex) => {
          if (compareMode) return;
          actions.onRemoveStackLane(laneIndex);
        }}
        onRenameCategory={(categoryId, name) => {
          if (compareMode) return;
          actions.onRenameCategory(categoryId, name);
        }}
        onCategoryChange={(categoryId, patch) => {
          if (compareMode) return;
          actions.onUpdateCategory(categoryId, patch);
        }}
        onRemoveCategory={(categoryId) => {
          if (compareMode || (groupedRows[categoryId] ?? []).length > 0) return;
          actions.onRemoveCategory(categoryId);
        }}
        readOnly={compareMode}
      />
      {printingRow ? (
        <PrintingPickerModal
          row={printingRow}
          onClose={() => setPrintingRow(null)}
          onSelect={(printing) => {
            actions.onChangePrinting(printingRow, printing);
            setPrintingRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
