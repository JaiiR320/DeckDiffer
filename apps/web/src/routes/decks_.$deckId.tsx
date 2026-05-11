import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useReducer } from "react";
import type { SetStateAction } from "react";
import { CardPreviewPanel } from "../components/cards/CardPreviewPanel";
import { DeckActionsModal } from "../components/decks/DeckActionsModal";
import { DeckAlerts } from "../components/deck-editor/DeckAlerts";
import { EditorDeckList } from "../components/deck-editor/EditorDeckList";
import { EditorDeckStack } from "../components/deck-editor/EditorDeckStack";
import { EditorHeader } from "../components/deck-editor/EditorHeader";
import { ExportDeckModal } from "../components/deck-editor/modals/ExportDeckModal";
import { ImportDeckModal } from "../components/deck-editor/modals/ImportDeckModal";
import { SaveDeckModal } from "../components/deck-editor/modals/SaveDeckModal";
import { SaveHistoryPanel } from "../components/deck-editor/SaveHistoryPanel";
import type { DeckState, EditorRow } from "../components/deck-editor/types";
import {
  getLatestSave,
  type DeckItem,
  type DeckSave,
  type DeckStackLayout,
} from "../lib/deck";
import { defaultStackLayout, normalizeStackLayout } from "../lib/deckLayout";
import {
  formatDecklist,
  type CardCategory,
  type ValidatedDeckCard,
} from "../lib/decklist";
import { type SearchCardResult } from "../lib/scryfall";
import { getDeck } from "#/server/decks";
import { getCurrentSession } from "#/server/session";
import {
  adjustCardQuantity,
  appendSearchCard,
  moveEditorRowCategory,
  restoreEditorRow,
} from "../components/deck-detail/deckCardMutations";
import { buildDeckEditorModel } from "../components/deck-detail/deckEditorModel";
import { DeckDetailHeader } from "../components/deck-detail/DeckDetailHeader";
import {
  ErrorBanner,
  StatusMessage,
} from "../components/deck-detail/DeckStatusMessages";
import { toggleEmptyStackLaneInLayout } from "../components/deck-detail/stackLayoutLane";
import { useDeckActions } from "../components/deck-detail/useDeckActions";
import { useDeckImport } from "../components/deck-detail/useDeckImport";
import { useDeckPreview } from "../components/deck-detail/useDeckPreview";
import { useDeckViewMode } from "../components/deck-detail/useDeckViewMode";

export const Route = createFileRoute("/decks_/$deckId")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  loader: async ({ params }) => {
    try {
      return {
        deck: await getDeck({ data: { deckId: params.deckId } }),
        errorMessage: null,
      };
    } catch (error) {
      return {
        deck: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Could not load this deck right now.",
      };
    }
  },
  component: DeckDetailPage,
});

const emptyDeckState: DeckState = {
  rawText: "",
  cards: [],
  invalidCards: [],
  status: "idle",
  errorMessage: null,
};

type PageState = {
  activeTab: "editor" | "history";
  baselineDeck: DeckState;
  baselineStackLayout: DeckStackLayout;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  deck: DeckItem | undefined;
  deckErrorMessage: string | null;
  isHydrated: boolean;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
  workingCards: ValidatedDeckCard[];
};

type PageStateAction = Partial<PageState> | ((state: PageState) => Partial<PageState>);

function pageStateReducer(state: PageState, action: PageStateAction): PageState {
  return { ...state, ...(typeof action === "function" ? action(state) : action) };
}

function resolveStateAction<T>(current: T, action: SetStateAction<T>) {
  return typeof action === "function" ? (action as (current: T) => T)(current) : action;
}

function DeckDetailPage() {
  const { deckId } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const [deckViewMode, setDeckViewMode] = useDeckViewMode();
  const [pageState, setPageState] = useReducer(pageStateReducer, {
    activeTab: "editor",
    baselineDeck: emptyDeckState,
    baselineStackLayout: defaultStackLayout(),
    compareMode: false,
    compareSaves: null,
    deck: loaderData.deck ?? undefined,
    deckErrorMessage: loaderData.errorMessage,
    isHydrated: false,
    showDiffOnly: false,
    stackLayout: defaultStackLayout(),
    workingCards: [],
  });
  const {
    activeTab,
    baselineDeck,
    baselineStackLayout,
    compareMode,
    compareSaves,
    deck,
    deckErrorMessage,
    isHydrated,
    showDiffOnly,
    stackLayout,
    workingCards,
  } = pageState;
  const preview = useDeckPreview();
  const setActiveTab = (activeTab: SetStateAction<"editor" | "history">) =>
    setPageState((current) => ({ activeTab: resolveStateAction(current.activeTab, activeTab) }));
  const setBaselineDeck = (baselineDeck: SetStateAction<DeckState>) =>
    setPageState((current) => ({
      baselineDeck: resolveStateAction(current.baselineDeck, baselineDeck),
    }));
  const setBaselineStackLayout = (baselineStackLayout: SetStateAction<DeckStackLayout>) =>
    setPageState((current) => ({
      baselineStackLayout: resolveStateAction(current.baselineStackLayout, baselineStackLayout),
    }));
  const setCompareMode = (compareMode: SetStateAction<boolean>) =>
    setPageState((current) => ({ compareMode: resolveStateAction(current.compareMode, compareMode) }));
  const setCompareSaves = (
    compareSaves: SetStateAction<{ saveA: DeckSave; saveB: DeckSave } | null>,
  ) =>
    setPageState((current) => ({
      compareSaves: resolveStateAction(current.compareSaves, compareSaves),
    }));
  const setDeck = (deck: SetStateAction<DeckItem | undefined>) =>
    setPageState((current) => ({ deck: resolveStateAction(current.deck, deck) }));
  const setDeckErrorMessage = (deckErrorMessage: SetStateAction<string | null>) =>
    setPageState((current) => ({
      deckErrorMessage: resolveStateAction(current.deckErrorMessage, deckErrorMessage),
    }));
  const setShowDiffOnly = (showDiffOnly: SetStateAction<boolean>) =>
    setPageState((current) => ({
      showDiffOnly: resolveStateAction(current.showDiffOnly, showDiffOnly),
    }));
  const setStackLayout = (stackLayout: SetStateAction<DeckStackLayout>) =>
    setPageState((current) => ({ stackLayout: resolveStateAction(current.stackLayout, stackLayout) }));
  const setWorkingCards = (workingCards: SetStateAction<ValidatedDeckCard[]>) =>
    setPageState((current) => ({
      workingCards: resolveStateAction(current.workingCards, workingCards),
    }));
  const deckName = deck?.name ?? deckId;
  const hasCards = workingCards.length > 0;
  const deckImport = useDeckImport({
    deckState: { baselineDeck, workingCards },
    editorActions: { setBaselineDeck, setWorkingCards },
  });
  const deckActions = useDeckActions({
    deckState: { deck, setDeck, setDeckErrorMessage },
    editorState: {
      stackLayout,
      workingCards,
      setBaselineDeck,
      setBaselineStackLayout,
      setStackLayout,
      setWorkingCards,
    },
    navigationState: { setActiveTab, setCompareMode, setCompareSaves },
  });

  useEffect(() => {
    const nextDeck = loaderData.deck ?? undefined;

    if (!nextDeck || nextDeck.saves.length === 0) {
      const emptyLayout = defaultStackLayout();
      setPageState({
        baselineDeck: emptyDeckState,
        baselineStackLayout: emptyLayout,
        deck: nextDeck,
        deckErrorMessage: loaderData.errorMessage,
        isHydrated: true,
        stackLayout: emptyLayout,
        workingCards: [],
      });
      return;
    }

    const latestSave = getLatestSave(nextDeck);
    if (latestSave) {
      const latestLayout = normalizeStackLayout(latestSave.layout);
      setPageState({
        baselineDeck: {
          rawText: "",
          cards: latestSave.cards,
          invalidCards: [],
          status: "ready",
          errorMessage: null,
        },
        baselineStackLayout: latestLayout,
        deck: nextDeck,
        deckErrorMessage: loaderData.errorMessage,
        isHydrated: true,
        stackLayout: latestLayout,
        workingCards: latestSave.cards,
      });
    }
  }, [loaderData.deck, loaderData.errorMessage]);

  const { emptyMessage, groupedRows, mergedWorkingCards, resultCardTotal } =
    buildDeckEditorModel({
      baselineDeck,
      compareMode,
      compareSaves,
      workingCards,
    });
  const exportPreview = formatDecklist(mergedWorkingCards, {
    includeQuantity: deckImport.exportOptions.includeQuantity,
    includeSet: false,
    includeCollectorNumber: false,
    setStyle: "brackets",
  });
  const defaultSaveLabel = deck ? `Save #${deck.saves.length + 1}` : "Save #1";
  const canSave =
    hasCards &&
    (JSON.stringify(workingCards) !== JSON.stringify(baselineDeck.cards) ||
      JSON.stringify(stackLayout) !== JSON.stringify(baselineStackLayout) ||
      !deck ||
      deck.saves.length === 0);
  const hasEmptyStackLane = stackLayout.lanes.some((lane) => lane.length === 0);

  function toggleEmptyStackLane() {
    setStackLayout(toggleEmptyStackLaneInLayout);
  }

  if (loaderData.errorMessage) {
    return <StatusMessage>{loaderData.errorMessage}</StatusMessage>;
  }

  if (!deck) {
    return (
      <main className="mx-auto w-full p-8">
        <div className="flex items-center gap-4">
          <Link
            to="/decks"
            className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            Back
          </Link>
          <p className="text-sm text-zinc-500">Deck not found.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto w-full p-8">
        {deckErrorMessage ? (
          <ErrorBanner>{deckErrorMessage}</ErrorBanner>
        ) : null}
        <DeckDetailHeader
          deck={deck}
          deckName={deckName}
          canSave={canSave}
          onOpenActions={() => deckActions.setIsDeckActionsOpen(true)}
          onOpenSave={() => deckActions.setIsSaveOpen(true)}
        />
        <DeckEditorSurface
          activeTab={activeTab}
          baselineDeck={baselineDeck}
          compareMode={compareMode}
          deck={deck}
          deckActions={deckActions}
          deckImport={deckImport}
          deckViewMode={deckViewMode}
          emptyMessage={emptyMessage}
          groupedRows={groupedRows}
          hasEmptyStackLane={hasEmptyStackLane}
          isHydrated={isHydrated}
          mergedWorkingCardsLength={mergedWorkingCards.length}
          preview={preview}
          resultCardTotal={resultCardTotal}
          setActiveTab={setActiveTab}
          setBaselineDeck={setBaselineDeck}
          setDeckViewMode={setDeckViewMode}
          setShowDiffOnly={setShowDiffOnly}
          setStackLayout={setStackLayout}
          setWorkingCards={setWorkingCards}
          showDiffOnly={showDiffOnly}
          stackLayout={stackLayout}
          toggleEmptyStackLane={toggleEmptyStackLane}
        />
      </main>

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
          onSave={(label) => void deckActions.saveDeck(label)}
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
        />
      ) : null}
    </>
  );
}

type DeckEditorSurfaceProps = {
  activeTab: "editor" | "history";
  baselineDeck: DeckState;
  compareMode: boolean;
  deck: DeckItem;
  deckActions: ReturnType<typeof useDeckActions>;
  deckImport: ReturnType<typeof useDeckImport>;
  deckViewMode: "list" | "stack";
  emptyMessage: string;
  groupedRows: Record<CardCategory, EditorRow[]>;
  hasEmptyStackLane: boolean;
  isHydrated: boolean;
  mergedWorkingCardsLength: number;
  preview: ReturnType<typeof useDeckPreview>;
  resultCardTotal: number;
  setActiveTab: (activeTab: SetStateAction<"editor" | "history">) => void;
  setBaselineDeck: (baselineDeck: SetStateAction<DeckState>) => void;
  setDeckViewMode: (mode: "list" | "stack") => void;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
  setStackLayout: (stackLayout: SetStateAction<DeckStackLayout>) => void;
  setWorkingCards: (workingCards: SetStateAction<ValidatedDeckCard[]>) => void;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
  toggleEmptyStackLane: () => void;
};

function DeckEditorSurface({
  activeTab,
  baselineDeck,
  compareMode,
  deck,
  deckActions,
  deckImport,
  deckViewMode,
  emptyMessage,
  groupedRows,
  hasEmptyStackLane,
  isHydrated,
  mergedWorkingCardsLength,
  preview,
  resultCardTotal,
  setActiveTab,
  setBaselineDeck,
  setDeckViewMode,
  setShowDiffOnly,
  setStackLayout,
  setWorkingCards,
  showDiffOnly,
  stackLayout,
  toggleEmptyStackLane,
}: DeckEditorSurfaceProps) {
  function dismissWarnings() {
    setBaselineDeck((current) => ({ ...current, invalidCards: [] }));
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
      <div className="flex border-b border-zinc-800">
        <TabButton active={activeTab === "editor"} onClick={() => setActiveTab("editor")}>
          Editor
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
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
        <>
          <EditorHeader
            onImport={deckImport.openImportModal}
            onExport={() => mergedWorkingCardsLength > 0 && deckImport.openExportModal()}
            exportDisabled={isHydrated && (mergedWorkingCardsLength === 0 || baselineDeck.status === "loading")}
            onAddCard={(card: SearchCardResult) =>
              setWorkingCards((cards) => appendSearchCard(cards, card))
            }
            onPreviewCard={(card) =>
              preview.updatePreviewCard({
                name: card.name,
                setCode: card.setCode,
                collectorNumber: card.collectorNumber,
              })
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3">
            <ViewModeSwitch mode={deckViewMode} onChange={setDeckViewMode} />
            {deckViewMode === "stack" ? (
              <button
                type="button"
                onClick={toggleEmptyStackLane}
                disabled={compareMode}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {hasEmptyStackLane ? "Remove empty lane" : "Add lane"}
              </button>
            ) : null}
          </div>

          {deckViewMode === "list" ? (
            <DeckListEditor
              baselineDeck={baselineDeck}
              compareMode={compareMode}
              dismissWarnings={dismissWarnings}
              emptyMessage={emptyMessage}
              groupedRows={groupedRows}
              preview={preview}
              resultCardTotal={resultCardTotal}
              setShowDiffOnly={setShowDiffOnly}
              setWorkingCards={setWorkingCards}
              showDiffOnly={showDiffOnly}
            />
          ) : (
            <StackEditor
              baselineDeck={baselineDeck}
              compareMode={compareMode}
              dismissWarnings={dismissWarnings}
              groupedRows={groupedRows}
              resultCardTotal={resultCardTotal}
              setShowDiffOnly={setShowDiffOnly}
              setStackLayout={setStackLayout}
              setWorkingCards={setWorkingCards}
              showDiffOnly={showDiffOnly}
              stackLayout={stackLayout}
            />
          )}
        </>
      ) : (
        <SaveHistoryPanel
          deck={deck}
          onLoadSave={deckActions.loadSave}
          onCompareSaves={deckActions.compareSaves}
          onBackToEditor={() => setActiveTab("editor")}
        />
      )}
    </section>
  );
}

function DeckListEditor({
  baselineDeck,
  compareMode,
  dismissWarnings,
  emptyMessage,
  groupedRows,
  preview,
  resultCardTotal,
  setShowDiffOnly,
  setWorkingCards,
  showDiffOnly,
}: {
  baselineDeck: DeckState;
  compareMode: boolean;
  dismissWarnings: () => void;
  emptyMessage: string;
  groupedRows: Record<CardCategory, EditorRow[]>;
  preview: ReturnType<typeof useDeckPreview>;
  resultCardTotal: number;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
  setWorkingCards: (workingCards: SetStateAction<ValidatedDeckCard[]>) => void;
  showDiffOnly: boolean;
}) {
  return (
    <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="p-5 lg:pr-0">
        <CardPreviewPanel
          preview={preview.previewCard}
          status={preview.previewStatus}
          requestedName={preview.previewLookup?.name ?? null}
          isPinned={preview.isPreviewPinned}
          onTogglePinned={preview.togglePreviewPinned}
        />
      </div>

      <div className="min-w-0">
        <DeckAlerts deck={baselineDeck} onDismissWarnings={dismissWarnings} />
        <EditorDeckList
          groupedRows={groupedRows}
          emptyMessage={emptyMessage}
          resultCardTotal={resultCardTotal}
          showDiffOnly={showDiffOnly}
          onToggleShowDiffOnly={() => setShowDiffOnly((current) => !current)}
          onAdjustQuantity={
            compareMode
              ? undefined
              : (row: EditorRow, delta: number) =>
                  setWorkingCards((cards) => adjustCardQuantity(cards, row, delta))
          }
          onRestoreCard={
            compareMode
              ? undefined
              : (row: EditorRow) => setWorkingCards((cards) => restoreEditorRow(cards, row))
          }
          onPreviewCard={(row) =>
            preview.updatePreviewCard({
              name: row.name,
              setCode: row.setCode,
              collectorNumber: row.collectorNumber,
            })
          }
          readOnly={compareMode}
        />
      </div>
    </div>
  );
}

function StackEditor({
  baselineDeck,
  compareMode,
  dismissWarnings,
  groupedRows,
  resultCardTotal,
  setShowDiffOnly,
  setStackLayout,
  setWorkingCards,
  showDiffOnly,
  stackLayout,
}: {
  baselineDeck: DeckState;
  compareMode: boolean;
  dismissWarnings: () => void;
  groupedRows: Record<CardCategory, EditorRow[]>;
  resultCardTotal: number;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
  setStackLayout: (stackLayout: SetStateAction<DeckStackLayout>) => void;
  setWorkingCards: (workingCards: SetStateAction<ValidatedDeckCard[]>) => void;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
}) {
  return (
    <div className="min-w-0">
      <DeckAlerts deck={baselineDeck} onDismissWarnings={dismissWarnings} />
      <EditorDeckStack
        groupedRows={groupedRows}
        resultCardTotal={resultCardTotal}
        showDiffOnly={showDiffOnly}
        layout={stackLayout}
        onToggleShowDiffOnly={() => setShowDiffOnly((current) => !current)}
        onLayoutChange={(layout: DeckStackLayout) => setStackLayout(normalizeStackLayout(layout))}
        onAdjustQuantity={
          compareMode
            ? undefined
            : (row: EditorRow, delta: number) =>
                setWorkingCards((cards) => adjustCardQuantity(cards, row, delta))
        }
        onMoveCardCategory={
          compareMode
            ? undefined
            : (row: EditorRow, category: CardCategory) =>
                setWorkingCards((cards) => moveEditorRowCategory(cards, row, category))
        }
        readOnly={compareMode}
      />
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium transition ${
        active
          ? "border-b-2 border-cyan-400 text-cyan-400"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function ViewModeSwitch({
  mode,
  onChange,
}: {
  mode: "list" | "stack";
  onChange: (mode: "list" | "stack") => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-1">
      {(["list", "stack"] as const).map((viewMode) => (
        <button
          key={viewMode}
          type="button"
          onClick={() => onChange(viewMode)}
          aria-pressed={mode === viewMode}
          className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
            mode === viewMode
              ? "bg-cyan-400 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {viewMode}
        </button>
      ))}
    </div>
  );
}
