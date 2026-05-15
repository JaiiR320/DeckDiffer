import { createContext, use, type Context, type ReactNode } from "react";
import type { SetStateAction } from "react";
import type { CategoryDiff, DeckState, EditorRow } from "./editor/types";
import type { EditorSnapshot } from "./editor/editorUndo";
import type { useDeckActions } from "./editor/useDeckActions";
import type { useDeckImport } from "./editor/useDeckImport";
import type { useDeckPreview } from "./editor/useDeckPreview";
import type { DeckCardSort, DeckItem, DeckSave, DeckStackLayout } from "#/lib/deck";
import type { CardCategory, DeckCategory, ValidatedDeckCard } from "#/lib/decklist";
import type { CardPrintingOption, SearchCardResult } from "#/lib/scryfall";

export type PageState = {
  activeTab: DeckDetailTab;
  baselineDeck: DeckState;
  baselineCategories: DeckCategory[];
  baselineStackLayout: DeckStackLayout;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  deck: DeckItem | undefined;
  deckErrorMessage: string | null;
  isHydrated: boolean;
  redoStack: EditorSnapshot[];
  showDiffOnly: boolean;
  stackLayout: DeckStackLayout;
  undoStack: EditorSnapshot[];
  categories: DeckCategory[];
  workingCards: ValidatedDeckCard[];
};

export type DeckDetailTab = "editor" | "history" | "stats";

export type HydratedPageState = PageState & { deck: DeckItem };
export type PageStateAction = Partial<PageState> | ((state: PageState) => Partial<PageState>);

export type DeckDetailModel = {
  canSave: boolean;
  categoryDiffs: Record<CardCategory, CategoryDiff>;
  deckName: string;
  defaultSaveLabel: string;
  exportPreview: string;
  groupedRows: Record<CardCategory, EditorRow[]>;
  hasCards: boolean;
  mergedWorkingCardsLength: number;
  resultCardTotal: number;
};

export type DeckDetailActions = {
  clearUndoHistory: () => void;
  onAddStackLane: () => void;
  onRedo: () => void;
  onUndo: () => void;
  onAddSearchCard: (card: SearchCardResult, category: CardCategory) => void;
  onAdjustQuantity: (row: EditorRow, delta: number) => void;
  onChangePrinting: (row: EditorRow, printing: CardPrintingOption) => void;
  onCreateCategoryInLane: (laneIndex: number, category: DeckCategory) => void;
  onMoveAllCardsBetweenCategories: (fromCategory: CardCategory, toCategory: CardCategory) => void;
  onMoveCardToCategory: (row: EditorRow, category: CardCategory) => void;
  onRemoveCategory: (category: CardCategory) => void;
  onRemoveStackLane: (laneIndex: number) => void;
  onRenameCategory: (category: CardCategory, name: string) => void;
  onReplaceCategories: (categories: DeckCategory[]) => void;
  onReverseCardSortDirection: () => void;
  onSetCardSort: (cardSort: DeckCardSort) => void;
  onSetShowRemovedCardGhosts: (showRemovedCardGhosts: boolean) => void;
  onSetStackLayout: (layout: DeckStackLayout) => void;
  onUpdateCategory: (category: CardCategory, patch: Partial<DeckCategory>) => void;
  setActiveTab: (activeTab: SetStateAction<DeckDetailTab>) => void;
  setBaselineDeck: (baselineDeck: SetStateAction<DeckState>) => void;
  setShowDiffOnly: (showDiffOnly: SetStateAction<boolean>) => void;
};

export type DeckDetailServices = {
  deckActions: ReturnType<typeof useDeckActions>;
  deckImport: ReturnType<typeof useDeckImport>;
  preview: ReturnType<typeof useDeckPreview>;
};

const DeckDetailStateContext = createContext<HydratedPageState | null>(null);
const DeckDetailModelContext = createContext<DeckDetailModel | null>(null);
const DeckDetailActionsContext = createContext<DeckDetailActions | null>(null);
const DeckDetailServicesContext = createContext<DeckDetailServices | null>(null);

export function DeckDetailProvider({
  actions,
  children,
  model,
  services,
  state,
}: {
  actions: DeckDetailActions;
  children: ReactNode;
  model: DeckDetailModel;
  services: DeckDetailServices;
  state: HydratedPageState;
}) {
  return (
    <DeckDetailStateContext.Provider value={state}>
      <DeckDetailModelContext.Provider value={model}>
        <DeckDetailActionsContext.Provider value={actions}>
          <DeckDetailServicesContext.Provider value={services}>
            {children}
          </DeckDetailServicesContext.Provider>
        </DeckDetailActionsContext.Provider>
      </DeckDetailModelContext.Provider>
    </DeckDetailStateContext.Provider>
  );
}

export function useDeckDetailState() {
  return useRequiredContext(DeckDetailStateContext, "useDeckDetailState");
}

export function useDeckDetailModel() {
  return useRequiredContext(DeckDetailModelContext, "useDeckDetailModel");
}

export function useDeckDetailActions() {
  return useRequiredContext(DeckDetailActionsContext, "useDeckDetailActions");
}

export function useDeckDetailServices() {
  return useRequiredContext(DeckDetailServicesContext, "useDeckDetailServices");
}

function useRequiredContext<T>(context: Context<T | null>, hookName: string) {
  const value = use(context);
  if (!value) {
    throw new Error(`${hookName} must be used inside DeckDetailProvider`);
  }
  return value;
}

export function pageStateReducer(state: PageState, action: PageStateAction): PageState {
  return { ...state, ...(typeof action === "function" ? action(state) : action) };
}

export function resolveStateAction<T>(current: T, action: SetStateAction<T>) {
  return typeof action === "function" ? (action as (current: T) => T)(current) : action;
}
