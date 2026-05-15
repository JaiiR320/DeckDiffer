import { ExportDeckModal } from "./modals/ExportDeckModal";
import { ImportDeckModal } from "./modals/ImportDeckModal";
import { SaveDeckModal } from "./modals/SaveDeckModal";
import { DeckActionsModal } from "#/components/decks/DeckActionsModal";
import { swapSplitDeckCover } from "#/lib/deckCover";
import { normalizeStackLayout } from "#/lib/deckLayout";
import {
  useDeckDetailActions,
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckDetailState,
} from "./deckDetailContext";

export function DeckDetailModals() {
  const { categories, compareMode, deck, stackLayout, workingCards } = useDeckDetailState();
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
          onClose={deckActions.closeSaveModal}
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
          onColorsChange={(colors) => void deckActions.setDeckColors(colors)}
          onClearCover={() => void deckActions.setDeckCover(null)}
          onSwapSplitCover={(deck) =>
            void deckActions.setDeckCover(deck.cover ? swapSplitDeckCover(deck.cover) : null)
          }
          categories={categories}
          cards={workingCards}
          showRemovedCardGhosts={stackLayout.showRemovedCardGhosts !== false}
          onAddLane={compareMode ? undefined : actions.onAddStackLane}
          onCategoriesChange={(nextCategories) => {
            actions.updateEditorSnapshot((current) => ({
              ...current,
              categories: nextCategories,
              stackLayout: normalizeStackLayout(current.stackLayout, nextCategories),
            }));
          }}
          onShowRemovedCardGhostsChange={(showRemovedCardGhosts) => {
            actions.updateEditorSnapshot((current) => ({
              ...current,
              stackLayout: { ...current.stackLayout, showRemovedCardGhosts },
            }));
          }}
        />
      ) : null}
    </>
  );
}
