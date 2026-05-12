import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useReducer, useRef } from "react";
import type { SetStateAction } from "react";
import { buildDeckEditorModel } from "./editor/deckEditorModel";
import {
  type EditorSnapshot,
  type EditorUndoState,
  pushUndoSnapshot,
  redoEditorSnapshot,
  undoEditorSnapshot,
} from "./editor/editorUndo";
import { addEmptyStackLane } from "./editor/stackLayoutLane";
import { useDeckActions } from "./editor/useDeckActions";
import { useDeckImport } from "./editor/useDeckImport";
import { useDeckPreview } from "./editor/useDeckPreview";
import { getLatestSave, type DeckItem, type DeckStackLayout } from "#/lib/deck";
import { defaultStackLayout, normalizeStackLayout } from "#/lib/deckLayout";
import { normalizeDeckSave } from "#/lib/deckSave";
import {
  defaultDeckCategories,
  formatDecklist,
  type DeckCategory,
  type ValidatedDeckCard,
} from "#/lib/decklist";
import { getCardPreview } from "#/lib/scryfall";
import type { DeckState } from "./editor/types";
import {
  type DeckDetailActions,
  type DeckDetailModel,
  type DeckDetailServices,
  pageStateReducer,
  resolveStateAction,
  type HydratedPageState,
  type PageState,
} from "./deckDetailContext";
import { useDeckEditorShortcuts } from "./useDeckEditorShortcuts";

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

function applyEditorSnapshot(snapshot: EditorSnapshot) {
  return {
    categories: snapshot.categories,
    stackLayout: snapshot.stackLayout,
    workingCards: snapshot.workingCards,
  };
}

function getUndoState(state: Pick<PageState, "redoStack" | "undoStack">): EditorUndoState {
  return { redoStack: state.redoStack, undoStack: state.undoStack };
}

export function useDeckDetailController() {
  const loaderData = routeApi.useLoaderData();
  const attemptedCardDataBackfillsRef = useRef(new Set<string>());
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
    redoStack: [],
    showDiffOnly: false,
    stackLayout: defaultStackLayout(),
    undoStack: [],
    categories: defaultDeckCategories(),
    workingCards: [],
  });
  const { baselineDeck, baselineCategories, baselineStackLayout, compareMode } = pageState;
  const { compareSaves, deck, stackLayout, categories, workingCards } = pageState;
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
  const clearUndoHistory = () => setPageState({ undoStack: [], redoStack: [] });
  const updateEditorSnapshot = (update: (snapshot: EditorSnapshot) => EditorSnapshot) => {
    setPageState((current) => {
      const snapshot = getEditorSnapshot(current);
      const nextSnapshot = update(snapshot);

      if (JSON.stringify(snapshot) === JSON.stringify(nextSnapshot)) {
        return {};
      }

      const nextUndoState = pushUndoSnapshot(getUndoState(current), snapshot);
      return { ...applyEditorSnapshot(nextSnapshot), ...nextUndoState };
    });
  };
  const undoEditorChange = () => {
    setPageState((current) => {
      const result = undoEditorSnapshot(getUndoState(current), getEditorSnapshot(current));
      return result ? { ...applyEditorSnapshot(result.snapshot), ...result.undoState } : {};
    });
  };
  const redoEditorChange = () => {
    setPageState((current) => {
      const result = redoEditorSnapshot(getUndoState(current), getEditorSnapshot(current));
      return result ? { ...applyEditorSnapshot(result.snapshot), ...result.undoState } : {};
    });
  };
  const deckImport = useDeckImport({
    deckState: { baselineDeck, workingCards },
    editorActions: {
      setBaselineDeck,
      setWorkingCards,
      setWorkingCardsWithUndo: (workingCards) =>
        updateEditorSnapshot((current) => ({
          ...current,
          workingCards: resolveStateAction(current.workingCards, workingCards),
        })),
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
      setCategories,
      clearUndoHistory,
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
        redoStack: [],
        stackLayout: emptyLayout,
        undoStack: [],
        categories: emptyCategories,
        workingCards: [],
      });
      return;
    }

    const latestSave = getLatestSave(nextDeck);
    if (!latestSave) return;

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
      redoStack: [],
      stackLayout: latestLayout,
      undoStack: [],
      categories: latestCategories,
      workingCards: normalizedSave.cards,
    });
  }, [loaderData.deck, loaderData.errorMessage]);

  useEffect(() => {
    if (!pageState.isHydrated) return;

    const cardsNeedingBackfill = pageState.workingCards.filter((card) => {
      const key = getCardPriceBackfillKey(card);
      return (
        (card.priceUsd === undefined || card.manaValue === undefined) &&
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
          manaValue: preview?.manaValue,
          priceUsd: preview?.priceUsd,
        };
      }),
    ).then((cardData) => {
      if (!isCurrent) return;
      const cardDataByKey = new Map(
        cardData.flatMap(({ key, manaValue, priceUsd }) =>
          key && (manaValue !== undefined || priceUsd !== undefined)
            ? [[key, { manaValue, priceUsd }] as const]
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
  const exportPreview = formatDecklist(editorModel.mergedWorkingCards, {
    includeQuantity: deckImport.exportOptions.includeQuantity,
    includeSet: false,
    includeCollectorNumber: false,
    setStyle: "brackets",
  });
  const hasCards = workingCards.length > 0;
  const hasEditorChanges =
    JSON.stringify(workingCards) !== JSON.stringify(baselineDeck.cards) ||
    JSON.stringify(categories) !== JSON.stringify(baselineCategories) ||
    JSON.stringify(stackLayout) !== JSON.stringify(baselineStackLayout) ||
    !deck ||
    deck.saves.length === 0;

  function addStackLane() {
    updateEditorSnapshot((current) => ({
      ...current,
      stackLayout: addEmptyStackLane(current.stackLayout),
    }));
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
    setActiveTab,
    setBaselineDeck,
    setShowDiffOnly,
    updateEditorSnapshot,
  };
  const services: DeckDetailServices = { deckActions, deckImport, preview };

  return { actions, errorMessage: loaderData.errorMessage, model, services, state };
}

function getCardPriceBackfillKey(card: ValidatedDeckCard) {
  return [card.oracleId, card.setCode ?? "", card.collectorNumber ?? ""].join("\0");
}

type CardBackfillData = {
  manaValue?: number;
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
      manaValue: card.manaValue ?? cardData.manaValue,
      priceUsd: card.priceUsd ?? cardData.priceUsd,
    };
  });
}
