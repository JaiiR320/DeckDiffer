import { ExportDeckModal } from "./modals/ExportDeckModal";
import { ImportDeckModal } from "./modals/ImportDeckModal";
import { SaveDeckModal } from "./modals/SaveDeckModal";
import { DeckActionsModal } from "#/components/decks/DeckActionsModal";
import { normalizeStackLayout } from "#/lib/deckLayout";
import {
  useDeckDetailActions,
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckDetailState,
} from "./deckDetailContext";

export function DeckDetailModals() {
  const { categories, compareMode, deck, workingCards } = useDeckDetailState();
  const { defaultSaveLabel, exportPreview, hasCards } = useDeckDetailModel();
  const actions = useDeckDetailActions();
  const { deckActions, deckImport } = useDeckDetailServices();

  return (
    <>
      {deckImport.isImportOpen ? (
        <ImportDeckModal
          hasCards={hasCards}
          draftDeck={deckImport.draftDeck}
          onDraftDeckChange={deckImport.setDraftDeck}
          onClose={deckImport.closeImportModal}
          onSubmit={deckImport.submitImport}
          onOverride={() => void deckImport.importDraftDeck("override")}
        />
      ) : null}

      {deckImport.isExportOpen ? (
        <ExportDeckModal
          exportOptions={deckImport.exportOptions}
          exportPreview={exportPreview}
          onClose={() => deckImport.setIsExportOpen(false)}
          onCopy={() =>
            void navigator.clipboard
              .writeText(exportPreview)
              .then(() => deckImport.setIsExportOpen(false))
          }
          onToggleIncludeQuantity={deckImport.toggleExportQuantity}
        />
      ) : null}

      {deckActions.isSaveOpen ? (
        <SaveDeckModal
          defaultLabel={defaultSaveLabel}
          isOpen={deckActions.isSaveOpen}
          onClose={() => deckActions.setIsSaveOpen(false)}
          onSave={(label) =>
            void deckActions.saveDeck(label).then((saved) => {
              if (saved) actions.clearUndoHistory();
            })
          }
        />
      ) : null}

      {deckActions.isDeckActionsOpen ? (
        <DeckActionsModal
          deck={deck}
          isOpen={deckActions.isDeckActionsOpen}
          onClose={() => deckActions.setIsDeckActionsOpen(false)}
          onRename={(id, name) => void deckActions.renameDeck(id, name)}
          onDelete={(id) => void deckActions.deleteDeck(id)}
          onExport={deckActions.exportDeck}
          categories={categories}
          cards={workingCards}
          onAddLane={compareMode ? undefined : actions.onAddStackLane}
          onCategoriesChange={(nextCategories) => {
            actions.updateEditorSnapshot((current) => ({
              ...current,
              categories: nextCategories,
              stackLayout: normalizeStackLayout(current.stackLayout, nextCategories),
            }));
          }}
        />
      ) : null}
    </>
  );
}
