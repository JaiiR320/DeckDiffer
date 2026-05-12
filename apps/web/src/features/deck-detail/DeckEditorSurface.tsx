import { EditorHeader } from "./components/EditorHeader";
import { SaveHistoryPanel } from "./components/SaveHistoryPanel";
import type { DeckCardSort } from "#/lib/deck";
import { normalizeStackLayout } from "#/lib/deckLayout";
import {
  useDeckDetailActions,
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckDetailState,
} from "./deckDetailContext";
import { StackEditor } from "./StackEditor";
import { TabButton } from "./TabButton";

export function DeckEditorSurface() {
  const {
    activeTab,
    baselineDeck,
    compareMode,
    deck,
    isHydrated,
    redoStack,
    stackLayout,
    undoStack,
  } = useDeckDetailState();
  const { mergedWorkingCardsLength } = useDeckDetailModel();
  const actions = useDeckDetailActions();
  const { deckActions, deckImport, preview } = useDeckDetailServices();
  const canRedo = !compareMode && redoStack.length > 0;
  const canUndo = !compareMode && undoStack.length > 0;
  const cardSort = stackLayout.cardSort ?? "manaValue";
  const cardSortDirection = stackLayout.cardSortDirection ?? "desc";

  function updateCardSort(nextSort: DeckCardSort) {
    actions.updateEditorSnapshot((current) => ({
      ...current,
      stackLayout: normalizeStackLayout(
        { ...current.stackLayout, cardSort: nextSort },
        current.categories,
      ),
    }));
  }

  function reverseCardSortDirection() {
    actions.updateEditorSnapshot((current) => ({
      ...current,
      stackLayout: normalizeStackLayout(
        {
          ...current.stackLayout,
          cardSortDirection:
            (current.stackLayout.cardSortDirection ?? "desc") === "asc" ? "desc" : "asc",
        },
        current.categories,
      ),
    }));
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
      <div className="flex border-b border-zinc-800">
        <TabButton active={activeTab === "editor"} onClick={() => actions.setActiveTab("editor")}>
          Editor
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => actions.setActiveTab("history")}>
          History
        </TabButton>
        {compareMode ? (
          <div className="ml-auto flex items-center gap-2 px-4">
            <span className="text-sm text-cyan-400">Comparing saves</span>
            <button
              type="button"
              onClick={deckActions.exitCompareMode}
              className="text-sm text-zinc-500 hover:text-zinc-300"
            >
              Exit
            </button>
          </div>
        ) : null}
      </div>

      {activeTab === "editor" ? (
        <StackEditor
          searchToolbar={
            <EditorHeader
              canRedo={canRedo}
              canUndo={canUndo}
              onImport={deckImport.openImportModal}
              onExport={() => mergedWorkingCardsLength > 0 && deckImport.openExportModal()}
              exportDisabled={
                isHydrated && (mergedWorkingCardsLength === 0 || baselineDeck.status === "loading")
              }
              onRedo={actions.onRedo}
              onUndo={actions.onUndo}
              cardSort={cardSort}
              cardSortDirection={cardSortDirection}
              onCardSortChange={updateCardSort}
              onReverseCardSortDirection={reverseCardSortDirection}
              onPreviewCard={(card) =>
                preview.updatePreviewCard({
                  name: card.name,
                  setCode: card.setCode,
                  collectorNumber: card.collectorNumber,
                })
              }
            />
          }
        />
      ) : (
        <SaveHistoryPanel
          deck={deck}
          onLoadSave={deckActions.loadSave}
          onCompareSaves={deckActions.compareSaves}
          onBackToEditor={() => actions.setActiveTab("editor")}
        />
      )}
    </section>
  );
}
