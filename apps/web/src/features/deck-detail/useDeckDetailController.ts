import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import type { SetStateAction } from "react";
import { buildDeckEditorModel } from "./editor/deckEditorModel";
import { type EditorSnapshot } from "./editor/editorUndo";
import { useDeckActions } from "./editor/useDeckActions";
import { useDeckImport } from "./editor/useDeckImport";
import { useDeckPreview } from "./editor/useDeckPreview";
import { type DeckCardSort, type DeckItem, type DeckStackLayout } from "#/lib/deck";
import { createDeckExport } from "#/lib/deckExport";
import { defaultStackLayout } from "#/lib/deckLayout";
import { defaultDeckCategories, type DeckCategory, type ValidatedDeckCard } from "#/lib/decklist";
import type { CardCategory } from "#/lib/decklist";
import type { CardPrintingOption, SearchCardResult } from "#/lib/scryfall";
import { getCardPreview } from "#/lib/scryfall";
import { getDeck, updateDeckCurrentForUser } from "#/server/decks";
import type { EditorRow } from "./editor/types";
import type { DeckState } from "./editor/types";
import {
  type DeckDetailActions,
  type DeckDetailTab,
  type DeckDetailModel,
  type DeckDetailServices,
  pageStateReducer,
  resolveStateAction,
  type HydratedPageState,
  type PageState,
} from "./deckDetailContext";
import { useDeckEditorShortcuts } from "./useDeckEditorShortcuts";
import {
  deckWorkspaceTransitions,
  type DeckWorkspaceState,
  type DeckWorkspaceTransitionResult,
} from "./workspace/deckWorkspace";

const routeApi = getRouteApi("/decks_/$deckId");

const emptyDeckState: DeckState = {
  rawText: "",
  cards: [],
  invalidCards: [],
  status: "idle",
  errorMessage: null,
};

function getEditorSnapshot(state: Pick<PageState, "categories" | "stackLayout" | "workingCards">) {
  return {
    categories: state.categories,
    stackLayout: state.stackLayout,
    workingCards: state.workingCards,
  };
}

function getDeckEditorState(deck: DeckItem, errorMessage: string | null): Partial<PageState> {
  const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(deck);

  return {
    ...getPageStateFromDeckWorkspace(workspace),
    deck,
    deckErrorMessage: errorMessage,
    isHydrated: true,
  };
}

function getDeckWorkspaceFromPageState(state: PageState): DeckWorkspaceState | null {
  if (!state.deck) return null;

  const current = getEditorSnapshot(state);
  return {
    deck: state.deck,
    current,
    baseline: {
      categories: state.baselineCategories,
      stackLayout: state.baselineStackLayout,
      workingCards: state.baselineDeck.cards,
    },
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    compare: state.compareSaves
      ? { saveA: state.compareSaves.saveA, saveB: state.compareSaves.saveB, display: current }
      : null,
    importStatus: state.baselineDeck,
  };
}

function getPageStateFromDeckWorkspace(workspace: DeckWorkspaceState): Partial<PageState> {
  return {
    baselineDeck: workspace.importStatus,
    baselineCategories: workspace.baseline.categories,
    baselineStackLayout: workspace.baseline.stackLayout,
    compareMode: workspace.compare !== null,
    compareSaves: workspace.compare
      ? { saveA: workspace.compare.saveA, saveB: workspace.compare.saveB }
      : null,
    redoStack: workspace.redoStack,
    stackLayout: workspace.current.stackLayout,
    undoStack: workspace.undoStack,
    categories: workspace.current.categories,
    workingCards: workspace.current.workingCards,
  };
}

export function useDeckDetailController() {
  const loaderData = routeApi.useLoaderData();
  const attemptedCardDataBackfillsRef = useRef(new Set<string>());
  const persistQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const persistVersionRef = useRef(0);
  const [pageState, dispatchPageState] = useReducer(pageStateReducer, {
    activeTab: "editor",
    baselineDeck: emptyDeckState,
    baselineCategories: defaultDeckCategories(),
    baselineStackLayout: defaultStackLayout(),
    compareMode: false,
    compareSaves: null,
    deck: loaderData.deck ?? undefined,
    deckErrorMessage: loaderData.errorMessage,
    isHydrated: false,
    redoStack: [],
    showDiffOnly: false,
    stackLayout: defaultStackLayout(),
    undoStack: [],
    categories: defaultDeckCategories(),
    workingCards: [],
  });
  const pageStateRef = useRef(pageState);
  useEffect(() => {
    pageStateRef.current = pageState;
  }, [pageState]);

  const setPageState = (action: Parameters<typeof pageStateReducer>[1]) => {
    const patch = typeof action === "function" ? action(pageStateRef.current) : action;
    pageStateRef.current = { ...pageStateRef.current, ...patch };
    dispatchPageState(patch);
  };
  const { baselineDeck, baselineCategories, baselineStackLayout, compareMode } = pageState;
  const { compareSaves, deck, stackLayout, categories, workingCards } = pageState;
  const preview = useDeckPreview();
  const setActiveTab = (activeTab: SetStateAction<DeckDetailTab>) =>
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
  const setCompareSaves = (compareSaves: SetStateAction<PageState["compareSaves"]>) =>
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
  const setBaselineCategories = (baselineCategories: SetStateAction<DeckCategory[]>) =>
    setPageState((current) => ({
      baselineCategories: resolveStateAction(current.baselineCategories, baselineCategories),
    }));
  const setWorkingCards = (workingCards: SetStateAction<ValidatedDeckCard[]>) =>
    setPageState((current) => ({
      workingCards: resolveStateAction(current.workingCards, workingCards),
    }));
  const clearUndoHistory = () => setPageState({ undoStack: [], redoStack: [] });
  const persistEditorSnapshot = async (snapshot: EditorSnapshot) => {
    const currentDeck = pageStateRef.current.deck;
    if (!currentDeck) return false;

    const version = ++persistVersionRef.current;
    const data = {
      deckId: currentDeck.id,
      categories: snapshot.categories,
      cards: snapshot.workingCards,
      layout: snapshot.stackLayout,
    };

    const persist = async () => {
      try {
        const updatedDeck = await updateDeckCurrentForUser({ data }).catch(() =>
          updateDeckCurrentForUser({ data }),
        );
        if (updatedDeck && version === persistVersionRef.current) {
          setDeck(updatedDeck);
          setDeckErrorMessage(null);
        }
        return true;
      } catch (error) {
        if (version !== persistVersionRef.current) return false;

        const reloadedDeck = await getDeck({ data: { deckId: currentDeck.id } }).catch(() => null);
        if (reloadedDeck && version === persistVersionRef.current) {
          setPageState({
            ...getDeckEditorState(
              reloadedDeck,
              "Could not save live changes. Reloaded latest live version.",
            ),
          });
        } else {
          setDeckErrorMessage(
            error instanceof Error ? error.message : "Could not save live changes right now.",
          );
        }
        return false;
      }
    };

    const queuedPersist = persistQueueRef.current.then(persist, persist);
    persistQueueRef.current = queuedPersist.catch(() => null);
    return queuedPersist;
  };
  const requestDeckWorkspaceTransition = (
    transition: (workspace: DeckWorkspaceState) => DeckWorkspaceTransitionResult,
  ) => {
    let snapshotToPersist: EditorSnapshot | null = null;
    setPageState((current) => {
      const workspace = getDeckWorkspaceFromPageState(current);
      if (!workspace) return {};

      const result = transition(workspace);
      snapshotToPersist = result.intent.kind === "persist-current" ? result.intent.snapshot : null;
      return getPageStateFromDeckWorkspace(result.workspace);
    });

    if (snapshotToPersist) {
      void persistEditorSnapshot(snapshotToPersist);
    }
  };
  const undoEditorChange = () => {
    requestDeckWorkspaceTransition(deckWorkspaceTransitions.undoCurrentDecklistEdit);
  };
  const redoEditorChange = () => {
    requestDeckWorkspaceTransition(deckWorkspaceTransitions.redoCurrentDecklistEdit);
  };
  const deckImport = useDeckImport({
    deckState: { baselineDeck, workingCards },
    editorActions: {
      applyValidatedImport: (options) =>
        requestDeckWorkspaceTransition((workspace) =>
          deckWorkspaceTransitions.applyValidatedImport(workspace, options),
        ),
      setBaselineDeck,
      setWorkingCards,
    },
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
      clearUndoHistory,
      requestDeckWorkspaceTransition,
    },
    navigationState: { setActiveTab, setCompareMode, setCompareSaves },
  });

  useEffect(() => {
    const nextDeck = loaderData.deck ?? undefined;

    if (!nextDeck) {
      setPageState({
        deck: nextDeck,
        deckErrorMessage: loaderData.errorMessage,
        isHydrated: true,
      });
      return;
    }

    setPageState(getDeckEditorState(nextDeck, loaderData.errorMessage));
  }, [loaderData.deck, loaderData.errorMessage]);

  useEffect(() => {
    if (!pageState.isHydrated) return;

    const cardsNeedingBackfill = pageState.workingCards.filter((card) => {
      const key = getCardPriceBackfillKey(card);
      return (
        (card.priceUsd === undefined ||
          card.manaValue === undefined ||
          card.manaCost === undefined ||
          card.producedMana === undefined) &&
        key &&
        !attemptedCardDataBackfillsRef.current.has(key)
      );
    });

    if (cardsNeedingBackfill.length === 0) return;

    const uniqueCards = [
      ...new Map(
        cardsNeedingBackfill.map((card) => [getCardPriceBackfillKey(card), card]),
      ).values(),
    ];
    for (const card of uniqueCards) {
      const key = getCardPriceBackfillKey(card);
      if (key) attemptedCardDataBackfillsRef.current.add(key);
    }

    let isCurrent = true;
    Promise.all(
      uniqueCards.map(async (card) => {
        const preview = await getCardPreview({
          name: card.name,
          setCode: card.setCode,
          collectorNumber: card.collectorNumber,
        }).catch(() => null);
        return {
          key: getCardPriceBackfillKey(card),
          manaCost: preview?.manaCost,
          manaValue: preview?.manaValue,
          producedMana: preview?.producedMana,
          priceUsd: preview?.priceUsd,
        };
      }),
    ).then((cardData) => {
      if (!isCurrent) return;
      const cardDataByKey = new Map(
        cardData.flatMap(({ key, manaCost, manaValue, producedMana, priceUsd }) =>
          key &&
          (manaCost !== undefined ||
            manaValue !== undefined ||
            producedMana !== undefined ||
            priceUsd !== undefined)
            ? [[key, { manaCost, manaValue, producedMana, priceUsd }] as const]
            : [],
        ),
      );

      if (cardDataByKey.size === 0) return;

      setPageState((current) => ({
        baselineDeck: {
          ...current.baselineDeck,
          cards: backfillCardData(current.baselineDeck.cards, cardDataByKey),
        },
        workingCards: backfillCardData(current.workingCards, cardDataByKey),
      }));
    });

    return () => {
      isCurrent = false;
    };
  }, [pageState.isHydrated, pageState.workingCards]);

  const editorModel = buildDeckEditorModel({
    baselineDeck,
    baselineCategories,
    categories,
    compareMode,
    compareSaves,
    workingCards,
  });
  const previewExport = deck
    ? createDeckExport(deck, {
        cards: editorModel.mergedWorkingCards,
        categories,
        includeQuantity: deckImport.exportOptions.includeQuantity,
      })
    : null;
  const exportPreview = previewExport && previewExport.ok ? previewExport.text : "";
  const hasCards = workingCards.length > 0;
  const hasEditorChanges =
    JSON.stringify(workingCards) !== JSON.stringify(baselineDeck.cards) ||
    JSON.stringify(categories) !== JSON.stringify(baselineCategories) ||
    JSON.stringify(stackLayout) !== JSON.stringify(baselineStackLayout) ||
    !deck ||
    deck.saves.length === 0;

  function addStackLane() {
    requestDeckWorkspaceTransition(deckWorkspaceTransitions.addStackLane);
  }

  useDeckEditorShortcuts(compareMode, undoEditorChange, redoEditorChange);

  if (!deck) {
    return { state: null, errorMessage: loaderData.errorMessage };
  }

  const state: HydratedPageState = { ...pageState, deck };
  const model: DeckDetailModel = {
    canSave: hasEditorChanges && (hasCards || categories.length > 0),
    categoryDiffs: editorModel.categoryDiffs,
    deckName: deck.name,
    defaultSaveLabel: `Save #${deck.saves.length + 1}`,
    exportPreview,
    groupedRows: editorModel.groupedRows,
    hasCards,
    mergedWorkingCardsLength: editorModel.mergedWorkingCards.length,
    resultCardTotal: editorModel.resultCardTotal,
  };
  const actions: DeckDetailActions = {
    clearUndoHistory,
    onAddStackLane: addStackLane,
    onRedo: redoEditorChange,
    onUndo: undoEditorChange,
    onAddSearchCard: (card: SearchCardResult, category: CardCategory) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.appendSearchCard(workspace, card, category),
      ),
    onAdjustQuantity: (row: EditorRow, delta: number) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.adjustCardQuantity(workspace, row, delta),
      ),
    setActiveTab,
    setBaselineDeck,
    setShowDiffOnly,
    onChangePrinting: (row: EditorRow, printing: CardPrintingOption) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.changeCardPrinting(workspace, row, printing),
      ),
    onCreateCategoryInLane: (laneIndex: number, category: DeckCategory) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.createCategoryInLane(workspace, laneIndex, category),
      ),
    onMoveAllCardsBetweenCategories: (fromCategory: CardCategory, toCategory: CardCategory) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.moveAllCardsBetweenCategories(workspace, fromCategory, toCategory),
      ),
    onMoveCardToCategory: (row: EditorRow, category: CardCategory) => {
      if (row.category === category || row.currentQuantity <= 0) return;
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.moveCardToCategory(workspace, row.oracleId, category),
      );
    },
    onRemoveCategory: (category: CardCategory) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.removeEmptyCategory(workspace, category),
      ),
    onRemoveStackLane: (laneIndex: number) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.removeStackLane(workspace, laneIndex),
      ),
    onRenameCategory: (category: CardCategory, name: string) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.renameCategory(workspace, category, name),
      ),
    onReplaceCategories: (nextCategories: DeckCategory[]) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.replaceCategories(workspace, nextCategories),
      ),
    onSetCardSort: (cardSort: DeckCardSort) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.setCardSort(workspace, cardSort),
      ),
    onSetShowRemovedCardGhosts: (showRemovedCardGhosts: boolean) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.setShowRemovedCardGhosts(workspace, showRemovedCardGhosts),
      ),
    onSetStackLayout: (layout: DeckStackLayout) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.setStackLayout(workspace, layout),
      ),
    onReverseCardSortDirection: () =>
      requestDeckWorkspaceTransition(deckWorkspaceTransitions.reverseCardSortDirection),
    onUpdateCategory: (category: CardCategory, patch: Partial<DeckCategory>) =>
      requestDeckWorkspaceTransition((workspace) =>
        deckWorkspaceTransitions.updateCategory(workspace, category, patch),
      ),
  };
  const services: DeckDetailServices = { deckActions, deckImport, preview };

  return { actions, errorMessage: loaderData.errorMessage, model, services, state };
}

function getCardPriceBackfillKey(card: ValidatedDeckCard) {
  return [card.oracleId, card.setCode ?? "", card.collectorNumber ?? ""].join("\0");
}

type CardBackfillData = {
  manaCost?: string;
  manaValue?: number;
  producedMana?: string[];
  priceUsd?: number;
};

function backfillCardData(
  cards: ValidatedDeckCard[],
  cardDataByKey: Map<string, CardBackfillData>,
) {
  return cards.map((card) => {
    const cardData = cardDataByKey.get(getCardPriceBackfillKey(card));
    if (!cardData) return card;

    return {
      ...card,
      manaCost: card.manaCost ?? cardData.manaCost,
      manaValue: card.manaValue ?? cardData.manaValue,
      producedMana: card.producedMana ?? cardData.producedMana,
      priceUsd: card.priceUsd ?? cardData.priceUsd,
    };
  });
}
