import { DeckAlerts } from "./components/DeckAlerts";
import { EditorDeckStack } from "./stack/EditorDeckStack";
import type { EditorRow } from "./editor/types";
import { useState, type ReactNode } from "react";
import { PrintingPickerModal } from "./modals/PrintingPickerModal";
import {
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckUiActions,
  useDeckUiView,
  useDeckWorkspaceActions,
  useDeckWorkspaceView,
} from "./deckDetailContext";

export function StackEditor({ searchToolbar }: { searchToolbar: ReactNode }) {
  const { baselineDeck, categories, compareMode, stackLayout } = useDeckWorkspaceView();
  const { showDiffOnly } = useDeckUiView();
  const { categoryDiffs, groupedRows, resultCardTotal } = useDeckDetailModel();
  const workspaceActions = useDeckWorkspaceActions();
  const deckUiActions = useDeckUiActions();
  const { deckActions } = useDeckDetailServices();
  const [printingRow, setPrintingRow] = useState<EditorRow | null>(null);

  return (
    <div className="min-w-0">
      <DeckAlerts
        deck={baselineDeck}
        onDismissWarnings={workspaceActions.onDismissImportWarnings}
      />
      <EditorDeckStack
        categories={categories}
        categoryDiffs={categoryDiffs}
        groupedRows={groupedRows}
        resultCardTotal={resultCardTotal}
        showDiffOnly={showDiffOnly}
        layout={stackLayout}
        onToggleShowDiffOnly={deckUiActions.onToggleShowDiffOnly}
        onLayoutChange={workspaceActions.onSetStackLayout}
        searchToolbar={searchToolbar}
        onAddSearchCard={workspaceActions.onAddSearchCard}
        onAdjustQuantity={compareMode ? undefined : workspaceActions.onAdjustQuantity}
        onMoveCardCategory={compareMode ? undefined : workspaceActions.onMoveCardToCategory}
        onChangePrinting={compareMode ? undefined : (row) => setPrintingRow(row)}
        onSetDeckCover={(cover) => void deckActions.setDeckCover(cover)}
        onMoveCategoryCards={
          compareMode ? undefined : workspaceActions.onMoveAllCardsBetweenCategories
        }
        onCreateCategoryInLane={(laneIndex, category) => {
          if (compareMode) return;
          workspaceActions.onCreateCategoryInLane(laneIndex, category);
        }}
        onRemoveLane={(laneIndex) => {
          if (compareMode) return;
          workspaceActions.onRemoveStackLane(laneIndex);
        }}
        onRenameCategory={(categoryId, name) => {
          if (compareMode) return;
          workspaceActions.onRenameCategory(categoryId, name);
        }}
        onCategoryChange={(categoryId, patch) => {
          if (compareMode) return;
          workspaceActions.onUpdateCategory(categoryId, patch);
        }}
        onRemoveCategory={(categoryId) => {
          if (compareMode || (groupedRows[categoryId] ?? []).length > 0) return;
          workspaceActions.onRemoveCategory(categoryId);
        }}
        readOnly={compareMode}
      />
      {printingRow ? (
        <PrintingPickerModal
          row={printingRow}
          onClose={() => setPrintingRow(null)}
          onSelect={(printing) => {
            workspaceActions.onChangePrinting(printingRow, printing);
            setPrintingRow(null);
          }}
        />
      ) : null}
    </div>
  );
}
