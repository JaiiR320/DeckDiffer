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
import { type DeckItem, type DeckStackLayout } from "#/lib/deck";
import { createDeckExport } from "#/lib/deckExport";
import { defaultStackLayout } from "#/lib/deckLayout";
import { defaultDeckCategories, type DeckCategory, type ValidatedDeckCard } from "#/lib/decklist";
import { getCardPreview } from "#/lib/scryfall";
import { getDeck, updateDeckCurrentForUser } from "#/server/decks";
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
import { deckWorkspaceTransitions, type DeckWorkspaceState } from "./workspace/deckWorkspace";

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

function getDeckEditorState(deck: DeckItem, errorMessage: string | null): Partial<PageState> {
  const workspace = deckWorkspaceTransitions.hydrateDeckWorkspace(deck);

  return {
    ...getPageStateFromDeckWorkspace(workspace),
    deck,
    deckErrorMessage: errorMessage,
    isHydrated: true,
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
  const updateEditorSnapshot = (update: (snapshot: EditorSnapshot) => EditorSnapshot) => {
    let snapshotToPersist: EditorSnapshot | null = null;

    setPageState((current) => {
      const snapshot = getEditorSnapshot(current);
      const nextSnapshot = update(snapshot);

      if (JSON.stringify(snapshot) === JSON.stringify(nextSnapshot)) {
        return {};
      }

      const nextUndoState = pushUndoSnapshot(getUndoState(current), snapshot);
      snapshotToPersist = nextSnapshot;
      return { ...applyEditorSnapshot(nextSnapshot), ...nextUndoState };
    });

    if (snapshotToPersist) {
      void persistEditorSnapshot(snapshotToPersist);
    }
  };
  const undoEditorChange = () => {
    let snapshotToPersist: EditorSnapshot | null = null;

    setPageState((current) => {
      const result = undoEditorSnapshot(getUndoState(current), getEditorSnapshot(current));
      snapshotToPersist = result?.snapshot ?? null;
      return result ? { ...applyEditorSnapshot(result.snapshot), ...result.undoState } : {};
    });

    if (snapshotToPersist) {
      void persistEditorSnapshot(snapshotToPersist);
    }
  };
  const redoEditorChange = () => {
    let snapshotToPersist: EditorSnapshot | null = null;

    setPageState((current) => {
      const result = redoEditorSnapshot(getUndoState(current), getEditorSnapshot(current));
      snapshotToPersist = result?.snapshot ?? null;
      return result ? { ...applyEditorSnapshot(result.snapshot), ...result.undoState } : {};
    });

    if (snapshotToPersist) {
      void persistEditorSnapshot(snapshotToPersist);
    }
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
      persistEditorSnapshot,
      setStackLayout,
      setWorkingCards,
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
