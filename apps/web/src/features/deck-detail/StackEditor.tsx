import { DeckAlerts } from "./components/DeckAlerts";
import { EditorDeckStack } from "./stack/EditorDeckStack";
import type { EditorRow } from "./editor/types";
import type { ReactNode } from "react";
import {
  adjustCardQuantity,
  appendSearchCard,
  moveEditorRowCategory,
} from "./editor/deckCardMutations";
import { removeStackLane } from "./editor/stackLayoutLane";
import { normalizeStackLayout } from "#/lib/deckLayout";
import { createCategoryName, hasCategoryName, type CardCategory } from "#/lib/decklist";
import { useDeckDetailActions, useDeckDetailModel, useDeckDetailState } from "./deckDetailContext";

export function StackEditor({ searchToolbar }: { searchToolbar: ReactNode }) {
  const { baselineDeck, categories, compareMode, showDiffOnly, stackLayout } = useDeckDetailState();
  const { categoryDiffs, groupedRows, resultCardTotal } = useDeckDetailModel();
  const actions = useDeckDetailActions();

  return (
    <div className="min-w-0">
      <DeckAlerts
        deck={baselineDeck}
        onDismissWarnings={() =>
          actions.setBaselineDeck((current) => ({ ...current, invalidCards: [] }))
        }
      />
      <EditorDeckStack
        categories={categories}
        categoryDiffs={categoryDiffs}
        groupedRows={groupedRows}
        resultCardTotal={resultCardTotal}
        showDiffOnly={showDiffOnly}
        layout={stackLayout}
        onToggleShowDiffOnly={() => actions.setShowDiffOnly((current) => !current)}
        onLayoutChange={(layout) =>
          actions.updateEditorSnapshot((current) => ({
            ...current,
            stackLayout: normalizeStackLayout(layout, current.categories),
          }))
        }
        searchToolbar={searchToolbar}
        onAddSearchCard={(card, category) =>
          actions.updateEditorSnapshot((current) => ({
            ...current,
            workingCards: appendSearchCard(current.workingCards, card, category),
          }))
        }
        onAdjustQuantity={
          compareMode
            ? undefined
            : (row: EditorRow, delta: number) =>
                actions.updateEditorSnapshot((current) => ({
                  ...current,
                  workingCards: adjustCardQuantity(current.workingCards, row, delta),
                }))
        }
        onMoveCardCategory={
          compareMode
            ? undefined
            : (row: EditorRow, category: CardCategory) =>
                actions.updateEditorSnapshot((current) => ({
                  ...current,
                  workingCards: moveEditorRowCategory(current.workingCards, row, category),
                }))
        }
        onMoveCategoryCards={
          compareMode
            ? undefined
            : (category: CardCategory, targetCategory: CardCategory) =>
                actions.updateEditorSnapshot((current) => ({
                  ...current,
                  workingCards: current.workingCards.map((card) =>
                    card.categoryId === category ? { ...card, categoryId: targetCategory } : card,
                  ),
                }))
        }
        onCreateCategoryInLane={(laneIndex, category) => {
          if (compareMode) return;
          actions.updateEditorSnapshot((current) => {
            const name = createCategoryName(category.name, current.categories);
            const nextCategory = { ...category, name };

            return {
              ...current,
              categories: [...current.categories, nextCategory],
              stackLayout: {
                lanes: current.stackLayout.lanes.map((lane, index) =>
                  index === laneIndex ? [...lane, nextCategory.id] : lane,
                ),
              },
            };
          });
        }}
        onRemoveLane={(laneIndex) => {
          if (compareMode) return;
          actions.updateEditorSnapshot((current) => ({
            ...current,
            stackLayout: removeStackLane(current.stackLayout, laneIndex),
          }));
        }}
        onRenameCategory={(categoryId, name) => {
          if (compareMode) return;
          if (hasCategoryName(categories, name, categoryId)) return;
          actions.updateEditorSnapshot((current) => ({
            ...current,
            categories: current.categories.map((category) =>
              category.id === categoryId ? { ...category, name } : category,
            ),
          }));
        }}
        onRemoveCategory={(categoryId) => {
          if (compareMode || (groupedRows[categoryId] ?? []).length > 0) return;
          actions.updateEditorSnapshot((current) => ({
            ...current,
            categories: current.categories.filter((category) => category.id !== categoryId),
            stackLayout: {
              lanes: current.stackLayout.lanes.reduce<CardCategory[][]>((lanes, lane) => {
                const nextLane = lane.filter((category) => category !== categoryId);
                return nextLane.length > 0 ? [...lanes, nextLane] : lanes;
              }, []),
            },
          }));
        }}
        readOnly={compareMode}
      />
    </div>
  );
}
