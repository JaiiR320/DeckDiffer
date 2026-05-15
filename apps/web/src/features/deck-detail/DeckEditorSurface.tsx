import { EditorHeader } from "./components/EditorHeader";
import { SaveHistoryPanel } from "./components/SaveHistoryPanel";
import { DeckStatsPanel } from "./stats/DeckStatsPanel";
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

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
      <div className="flex border-b border-zinc-800">
        <TabButton active={activeTab === "editor"} onClick={() => actions.setActiveTab("editor")}>
          Editor
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => actions.setActiveTab("history")}>
          History
        </TabButton>
        <TabButton active={activeTab === "stats"} onClick={() => actions.setActiveTab("stats")}>
          Stats
        </TabButton>
        {compareMode ? (
          <div className="ml-auto flex items-center gap-2 px-4">
            <span className="text-sm text-cyan-400">Comparing snapshots</span>
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
              onCardSortChange={actions.onSetCardSort}
              onReverseCardSortDirection={actions.onReverseCardSortDirection}
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
      ) : activeTab === "history" ? (
        <SaveHistoryPanel
          deck={deck}
          onLoadSave={(save) => void deckActions.loadSave(save)}
          onSaveSnapshotBeforeLoad={deckActions.saveSnapshotBeforeLoad}
          onCompareSaves={deckActions.compareSaves}
          onBackToEditor={() => actions.setActiveTab("editor")}
        />
      ) : (
        <DeckStatsPanel />
      )}
    </section>
  );
}
