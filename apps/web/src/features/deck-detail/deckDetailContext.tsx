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
import type { DeckWorkspaceState } from "./workspace/deckWorkspace";

export type PageState = {
  activeTab: DeckDetailTab;
  deckErrorMessage: string | null;
  isHydrated: boolean;
  showDiffOnly: boolean;
  workspace: DeckWorkspaceState | null;
};

export type DeckDetailTab = "editor" | "history" | "stats";

export type PageStateAction = Partial<PageState> | ((state: PageState) => Partial<PageState>);

export type DeckWorkspaceView = {
  baselineDeck: DeckState;
  baselineCategories: DeckCategory[];
  baselineStackLayout: DeckStackLayout;
  compareMode: boolean;
  compareSaves: { saveA: DeckSave; saveB: DeckSave } | null;
  deck: DeckItem;
  redoStack: EditorSnapshot[];
  stackLayout: DeckStackLayout;
  undoStack: EditorSnapshot[];
  categories: DeckCategory[];
  workingCards: ValidatedDeckCard[];
};

export type DeckUiView = {
  activeTab: DeckDetailTab;
  deckErrorMessage: string | null;
  isHydrated: boolean;
  showDiffOnly: boolean;
};

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

export type DeckWorkspaceActions = {
  onClearUndoHistory: () => void;
  onDismissImportWarnings: () => void;
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
};

export type DeckUiActions = {
  onSetActiveTab: (activeTab: SetStateAction<DeckDetailTab>) => void;
  onToggleShowDiffOnly: () => void;
};

export type DeckDetailServices = {
  deckActions: ReturnType<typeof useDeckActions>;
  deckImport: ReturnType<typeof useDeckImport>;
  preview: ReturnType<typeof useDeckPreview>;
};

const DeckWorkspaceViewContext = createContext<DeckWorkspaceView | null>(null);
const DeckWorkspaceActionsContext = createContext<DeckWorkspaceActions | null>(null);
const DeckUiViewContext = createContext<DeckUiView | null>(null);
const DeckUiActionsContext = createContext<DeckUiActions | null>(null);
const DeckDetailModelContext = createContext<DeckDetailModel | null>(null);
const DeckDetailServicesContext = createContext<DeckDetailServices | null>(null);

export function DeckDetailProvider({
  children,
  deckUiActions,
  deckUiView,
  model,
  services,
  workspaceActions,
  workspaceView,
}: {
  children: ReactNode;
  deckUiActions: DeckUiActions;
  deckUiView: DeckUiView;
  model: DeckDetailModel;
  services: DeckDetailServices;
  workspaceActions: DeckWorkspaceActions;
  workspaceView: DeckWorkspaceView;
}) {
  return (
    <DeckWorkspaceViewContext.Provider value={workspaceView}>
      <DeckDetailModelContext.Provider value={model}>
        <DeckWorkspaceActionsContext.Provider value={workspaceActions}>
          <DeckUiViewContext.Provider value={deckUiView}>
            <DeckUiActionsContext.Provider value={deckUiActions}>
              <DeckDetailServicesContext.Provider value={services}>
                {children}
              </DeckDetailServicesContext.Provider>
            </DeckUiActionsContext.Provider>
          </DeckUiViewContext.Provider>
        </DeckWorkspaceActionsContext.Provider>
      </DeckDetailModelContext.Provider>
    </DeckWorkspaceViewContext.Provider>
  );
}

export function useDeckWorkspaceView() {
  return useRequiredContext(DeckWorkspaceViewContext, "useDeckWorkspaceView");
}

export function useDeckWorkspaceActions() {
  return useRequiredContext(DeckWorkspaceActionsContext, "useDeckWorkspaceActions");
}

export function useDeckUiView() {
  return useRequiredContext(DeckUiViewContext, "useDeckUiView");
}

export function useDeckUiActions() {
  return useRequiredContext(DeckUiActionsContext, "useDeckUiActions");
}

export function useDeckDetailModel() {
  return useRequiredContext(DeckDetailModelContext, "useDeckDetailModel");
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
