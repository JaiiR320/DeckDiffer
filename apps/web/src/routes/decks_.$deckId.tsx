import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useReducer, type ReactNode } from "react";
import type { SetStateAction } from "react";
import { DeckActionsModal } from "../components/decks/DeckActionsModal";
import { DeckAlerts } from "../components/deck-editor/DeckAlerts";
import { EditorDeckStack } from "../components/deck-editor/EditorDeckStack";
import { EditorHeader } from "../components/deck-editor/EditorHeader";
import { ExportDeckModal } from "../components/deck-editor/modals/ExportDeckModal";
import { ImportDeckModal } from "../components/deck-editor/modals/ImportDeckModal";
import { SaveDeckModal } from "../components/deck-editor/modals/SaveDeckModal";
import { SaveHistoryPanel } from "../components/deck-editor/SaveHistoryPanel";
import type { DeckState, EditorRow } from "../components/deck-editor/types";
import { getLatestSave, type DeckItem, type DeckSave, type DeckStackLayout } from "../lib/deck";
import { defaultStackLayout, normalizeStackLayout } from "../lib/deckLayout";
import { normalizeDeckSave } from "../lib/deckSave";
import {
  defaultDeckCategories,
  formatDecklist,
  type CardCategory,
  type DeckCategory,
  type ValidatedDeckCard,
} from "../lib/decklist";
import { getDeck } from "#/server/decks";
import { getCurrentSession } from "#/server/session";
import {
  adjustCardQuantity,
  appendSearchCard,
  moveEditorRowCategory,
} from "../components/deck-detail/deckCardMutations";
import { buildDeckEditorModel } from "../components/deck-detail/deckEditorModel";
import { DeckDetailHeader } from "../components/deck-detail/DeckDetailHeader";
import { ErrorBanner, StatusMessage } from "../components/deck-detail/DeckStatusMessages";
import { addEmptyStackLane, removeStackLane } from "../components/deck-detail/stackLayoutLane";
import { useDeckActions } from "../components/deck-detail/useDeckActions";
import { useDeckImport } from "../components/deck-detail/useDeckImport";
import { useDeckPreview } from "../components/deck-detail/useDeckPreview";

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
          error instanceof Error ? error.message : "Could not load this deck right now.",
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
  baselineCategories: DeckCategory[];
  baselineStackLayout: DeckStackLayout;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  deck: DeckItem | undefined;
  deckErrorMessage: string | null;
  isHydrated: boolean;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
  categories: DeckCategory[];
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
  const [pageState, setPageState] = useReducer(pageStateReducer, {
    activeTab: "editor",
    baselineDeck: emptyDeckState,
    baselineCategories: defaultDeckCategories(),
    baselineStackLayout: defaultStackLayout(),
    compareMode: false,
    compareSaves: null,
    deck: loaderData.deck ?? undefined,
    deckErrorMessage: loaderData.errorMessage,
    isHydrated: false,
    showDiffOnly: false,
    stackLayout: defaultStackLayout(),
    categories: defaultDeckCategories(),
    workingCards: [],
  });
  const {
    activeTab,
    baselineDeck,
    baselineCategories,
    baselineStackLayout,
    compareMode,
    compareSaves,
    deck,
    deckErrorMessage,
    isHydrated,
    showDiffOnly,
    stackLayout,
    categories,
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
    setPageState((current) => ({
      compareMode: resolveStateAction(current.compareMode, compareMode),
    }));
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
    setPageState((current) => ({
      stackLayout: resolveStateAction(current.stackLayout, stackLayout),
    }));
  const setBaselineCategories = (baselineCategories: SetStateAction<DeckCategory[]>) =>
    setPageState((current) => ({
      baselineCategories: resolveStateAction(current.baselineCategories, baselineCategories),
    }));
  const setCategories = (categories: SetStateAction<DeckCategory[]>) =>
    setPageState((current) => ({ categories: resolveStateAction(current.categories, categories) }));
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
      categories,
      workingCards,
      setBaselineDeck,
      setBaselineCategories,
      setBaselineStackLayout,
      setCategories,
      setStackLayout,
      setWorkingCards,
    },
    navigationState: { setActiveTab, setCompareMode, setCompareSaves },
  });

  useEffect(() => {
    const nextDeck = loaderData.deck ?? undefined;

    if (!nextDeck || nextDeck.saves.length === 0) {
      const emptyLayout = defaultStackLayout();
      const emptyCategories = defaultDeckCategories();
      setPageState({
        baselineDeck: emptyDeckState,
        baselineCategories: emptyCategories,
        baselineStackLayout: emptyLayout,
        deck: nextDeck,
        deckErrorMessage: loaderData.errorMessage,
        isHydrated: true,
        stackLayout: emptyLayout,
        categories: emptyCategories,
        workingCards: [],
      });
      return;
    }

    const latestSave = getLatestSave(nextDeck);
    if (latestSave) {
      const normalizedSave = normalizeDeckSave(latestSave);
      const latestCategories = normalizedSave.categories ?? defaultDeckCategories();
      const latestLayout = normalizeStackLayout(normalizedSave.layout, latestCategories);
      setPageState({
        baselineDeck: {
          rawText: "",
          cards: normalizedSave.cards,
          invalidCards: [],
          status: "ready",
          errorMessage: null,
        },
        baselineCategories: latestCategories,
        baselineStackLayout: latestLayout,
        deck: nextDeck,
        deckErrorMessage: loaderData.errorMessage,
        isHydrated: true,
        stackLayout: latestLayout,
        categories: latestCategories,
        workingCards: normalizedSave.cards,
      });
    }
  }, [loaderData.deck, loaderData.errorMessage]);

  const { groupedRows, mergedWorkingCards, resultCardTotal } = buildDeckEditorModel({
    baselineDeck,
    categories,
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
  const hasEditorChanges =
    JSON.stringify(workingCards) !== JSON.stringify(baselineDeck.cards) ||
    JSON.stringify(categories) !== JSON.stringify(baselineCategories) ||
    JSON.stringify(stackLayout) !== JSON.stringify(baselineStackLayout) ||
    !deck ||
    deck.saves.length === 0;
  const canSave = hasEditorChanges && (hasCards || categories.length > 0);

  function addStackLane() {
    setStackLayout(addEmptyStackLane);
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
        {deckErrorMessage ? <ErrorBanner>{deckErrorMessage}</ErrorBanner> : null}
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
          groupedRows={groupedRows}
          categories={categories}
          isHydrated={isHydrated}
          mergedWorkingCardsLength={mergedWorkingCards.length}
          preview={preview}
          resultCardTotal={resultCardTotal}
          setActiveTab={setActiveTab}
          setBaselineDeck={setBaselineDeck}
          setCategories={setCategories}
          setShowDiffOnly={setShowDiffOnly}
          setStackLayout={setStackLayout}
          setWorkingCards={setWorkingCards}
          showDiffOnly={showDiffOnly}
          stackLayout={stackLayout}
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
          categories={categories}
          cards={workingCards}
          onAddLane={compareMode ? undefined : addStackLane}
          onCategoriesChange={(nextCategories) => {
            setCategories(nextCategories);
            setStackLayout((current) => normalizeStackLayout(current, nextCategories));
          }}
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
  categories: DeckCategory[];
  groupedRows: Record<CardCategory, EditorRow[]>;
  isHydrated: boolean;
  mergedWorkingCardsLength: number;
  preview: ReturnType<typeof useDeckPreview>;
  resultCardTotal: number;
  setActiveTab: (activeTab: SetStateAction<"editor" | "history">) => void;
  setBaselineDeck: (baselineDeck: SetStateAction<DeckState>) => void;
  setCategories: (categories: SetStateAction<DeckCategory[]>) => void;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
  setStackLayout: (stackLayout: SetStateAction<DeckStackLayout>) => void;
  setWorkingCards: (workingCards: SetStateAction<ValidatedDeckCard[]>) => void;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
};

function DeckEditorSurface({
  activeTab,
  baselineDeck,
  compareMode,
  deck,
  deckActions,
  deckImport,
  categories,
  groupedRows,
  isHydrated,
  mergedWorkingCardsLength,
  preview,
  resultCardTotal,
  setActiveTab,
  setBaselineDeck,
  setCategories,
  setShowDiffOnly,
  setStackLayout,
  setWorkingCards,
  showDiffOnly,
  stackLayout,
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
          <StackEditor
            baselineDeck={baselineDeck}
            categories={categories}
            compareMode={compareMode}
            dismissWarnings={dismissWarnings}
            groupedRows={groupedRows}
            resultCardTotal={resultCardTotal}
            searchToolbar={
              <EditorHeader
                onImport={deckImport.openImportModal}
                onExport={() => mergedWorkingCardsLength > 0 && deckImport.openExportModal()}
                exportDisabled={
                  isHydrated &&
                  (mergedWorkingCardsLength === 0 || baselineDeck.status === "loading")
                }
                onPreviewCard={(card) =>
                  preview.updatePreviewCard({
                    name: card.name,
                    setCode: card.setCode,
                    collectorNumber: card.collectorNumber,
                  })
                }
              />
            }
            setShowDiffOnly={setShowDiffOnly}
            setCategories={setCategories}
            setStackLayout={setStackLayout}
            setWorkingCards={setWorkingCards}
            showDiffOnly={showDiffOnly}
            stackLayout={stackLayout}
          />
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

function StackEditor({
  baselineDeck,
  categories,
  compareMode,
  dismissWarnings,
  groupedRows,
  resultCardTotal,
  searchToolbar,
  setShowDiffOnly,
  setCategories,
  setStackLayout,
  setWorkingCards,
  showDiffOnly,
  stackLayout,
}: {
  baselineDeck: DeckState;
  categories: DeckCategory[];
  compareMode: boolean;
  dismissWarnings: () => void;
  groupedRows: Record<CardCategory, EditorRow[]>;
  resultCardTotal: number;
  searchToolbar: ReactNode;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
  setCategories: (categories: SetStateAction<DeckCategory[]>) => void;
  setStackLayout: (stackLayout: SetStateAction<DeckStackLayout>) => void;
  setWorkingCards: (workingCards: SetStateAction<ValidatedDeckCard[]>) => void;
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
}) {
  return (
    <div className="min-w-0">
      <DeckAlerts deck={baselineDeck} onDismissWarnings={dismissWarnings} />
      <EditorDeckStack
        categories={categories}
        groupedRows={groupedRows}
        resultCardTotal={resultCardTotal}
        showDiffOnly={showDiffOnly}
        layout={stackLayout}
        onToggleShowDiffOnly={() => setShowDiffOnly((current) => !current)}
        onLayoutChange={(layout: DeckStackLayout) =>
          setStackLayout(normalizeStackLayout(layout, categories))
        }
        searchToolbar={searchToolbar}
        onAddSearchCard={(card, category) =>
          setWorkingCards((cards) => appendSearchCard(cards, card, category))
        }
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
        onMoveCategoryCards={
          compareMode
            ? undefined
            : (category: CardCategory, targetCategory: CardCategory) =>
                setWorkingCards((cards) =>
                  cards.map((card) =>
                    card.categoryId === category ? { ...card, categoryId: targetCategory } : card,
                  ),
                )
        }
        onCreateCategoryInLane={(laneIndex, category) => {
          if (compareMode) return;
          setCategories((current) => [...current, category]);
          setStackLayout((current) => ({
            lanes: current.lanes.map((lane, index) =>
              index === laneIndex ? [...lane, category.id] : lane,
            ),
          }));
        }}
        onRemoveLane={(laneIndex) => {
          if (compareMode) return;
          setStackLayout((current) => removeStackLane(current, laneIndex));
        }}
        onRenameCategory={(categoryId, name) => {
          if (compareMode) return;
          setCategories((current) =>
            current.map((category) =>
              category.id === categoryId ? { ...category, name } : category,
            ),
          );
        }}
        onRemoveCategory={(categoryId) => {
          if (compareMode || (groupedRows[categoryId] ?? []).length > 0) return;
          setCategories((current) => current.filter((category) => category.id !== categoryId));
          setStackLayout((current) => ({
            lanes: current.lanes.reduce<CardCategory[][]>((lanes, lane) => {
              const nextLane = lane.filter((category) => category !== categoryId);
              return nextLane.length > 0 ? [...lanes, nextLane] : lanes;
            }, []),
          }));
        }}
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
        active ? "border-b-2 border-cyan-400 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
