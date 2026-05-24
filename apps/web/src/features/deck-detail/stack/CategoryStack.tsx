import { useDraggable, useDroppable } from "@dnd-kit/react";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import { ContextMenu, ContextMenuItem } from "#/components/ui/ContextMenu";
import { IconButton } from "#/components/ui/IconButton";
import type { DeckCardSort, DeckCardSortDirection } from "#/lib/deck";
import type { DeckTileCover } from "#/lib/deck";
import type { CardCategory, DeckCategory } from "#/lib/decklist";
import type { CategoryDiff, EditorRow } from "../editor/types";
import { cardLayoutToCssVars, type CardLayout } from "./cardLayout";
import { StackCard } from "./StackCard";
import { cardCategoryDropId } from "./stackIds";

type CategoryStackProps = {
  category: CardCategory;
  categoryName: string;
  categoryDiff?: CategoryDiff;
  diffCounts: CategoryDiffCounts;
  categories: DeckCategory[];
  cardCount: number;
  rows: EditorRow[];
  cardSort: DeckCardSort;
  cardSortDirection: DeckCardSortDirection;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onChangePrinting?: (row: EditorRow) => void;
  onSetDeckCover?: (cover: DeckTileCover) => void;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
  onCategoryChange?: (category: CardCategory, patch: Partial<DeckCategory>) => void;
  onRenameCategory?: (category: CardCategory, name: string) => void;
  shouldStartRenaming?: boolean;
  readOnly: boolean;
  onCategoryRef: (element: HTMLElement | null) => void;
};

type MenuState = {
  isMenuOpen: boolean;
  isMovingCards: boolean;
  isRenaming: boolean;
  renameDraft: string;
};

type CategoryDiffCounts = {
  added: number;
  changed: number;
  removed: number;
};

const initialMenuState: MenuState = {
  isMenuOpen: false,
  isMovingCards: false,
  isRenaming: false,
  renameDraft: "",
};

export function CategoryStack({
  category,
  categoryName,
  categoryDiff,
  diffCounts,
  categories,
  cardCount,
  rows,
  cardSort,
  cardSortDirection,
  onAdjustQuantity,
  onMoveCardCategory,
  onChangePrinting,
  onSetDeckCover,
  onMoveCategoryCards,
  onRemoveCategory,
  onCategoryChange,
  onRenameCategory,
  shouldStartRenaming = false,
  readOnly,
  onCategoryRef,
}: CategoryStackProps) {
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const handledStartRenameRef = useRef(false);
  const [cardLayout, setCardLayout] = useState<CardLayout | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [menuState, setMenuState] = useReducer(
    (current: MenuState, next: Partial<MenuState>) => ({ ...current, ...next }),
    initialMenuState,
  );
  const { isMenuOpen, isMovingCards, isRenaming, renameDraft } = menuState;
  const sortedRows = rows.slice().sort((left, right) => {
    if (cardSort === "alphabetical") {
      const nameComparison = left.name.localeCompare(right.name);
      return (
        applySortDirection(nameComparison, cardSortDirection) || right.manaValue - left.manaValue
      );
    }

    if (cardSort === "price") {
      const priceComparison = comparePrices(left.priceUsd, right.priceUsd, cardSortDirection);
      return priceComparison || left.name.localeCompare(right.name);
    }

    if (cardSort === "edhrecRank") {
      const rankComparison = compareEdhrecRanks(
        left.edhrecRank,
        right.edhrecRank,
        cardSortDirection,
      );
      return rankComparison || left.name.localeCompare(right.name);
    }

    const manaValueComparison = left.manaValue - right.manaValue;
    return (
      applySortDirection(manaValueComparison, cardSortDirection) ||
      left.name.localeCompare(right.name)
    );
  });
  const lastCardOffset = Math.max(0, sortedRows.length - 1);
  const totalQuantity = sortedRows.reduce((sum, row) => sum + row.currentQuantity, 0);
  const totalPrice = sortedRows.reduce(
    (sum, row) => sum + (row.priceUsd ?? 0) * row.currentQuantity,
    0,
  );
  const {
    isDragging,
    ref: draggableRef,
    handleRef,
  } = useDraggable({ id: category, type: "category", disabled: readOnly });
  const { isDropTarget: isCardDropTarget, ref: droppableRef } = useDroppable({
    id: cardCategoryDropId(category),
    type: "card-category",
    accept: ["card", "search-card"],
    disabled: readOnly,
    data: { category },
  });

  function saveRename() {
    const nextName = renameDraft.trim();
    if (!nextName) return;
    onRenameCategory?.(category, nextName);
    setMenuState({ isRenaming: false, isMenuOpen: false });
  }

  const handleCardLayout = useCallback((nextLayout: CardLayout) => {
    setCardLayout((current) => (areCardLayoutsEqual(current, nextLayout) ? current : nextLayout));
  }, []);

  useEffect(() => {
    if (!shouldStartRenaming) {
      handledStartRenameRef.current = false;
      return;
    }

    if (handledStartRenameRef.current) {
      return;
    }

    handledStartRenameRef.current = true;
    setMenuState({
      isMenuOpen: true,
      isMovingCards: false,
      isRenaming: true,
      renameDraft: categoryName,
    });
  }, [categoryName, shouldStartRenaming]);

  return (
    <section
      data-category-stack="true"
      ref={(element) => {
        draggableRef(element);
        droppableRef(element);
        onCategoryRef(element);
      }}
      className={`relative select-none overflow-visible rounded-xl border bg-zinc-950/80 transition ${
        isDragging ? "scale-[1.02] border-cyan-400/70 shadow-2xl shadow-cyan-950/30" : ""
      } ${
        isCardDropTarget
          ? "border-cyan-300/80 bg-cyan-950/20 shadow-2xl shadow-cyan-950/40"
          : "border-zinc-800"
      }`}
    >
      <div className="overflow-hidden rounded-xl">
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
          <div className="flex items-start justify-between gap-3">
            <div
              ref={handleRef}
              className={`min-w-0 flex-1 ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
            >
              <h3 className="truncate font-mono text-sm font-semibold uppercase tracking-[0.08em] text-zinc-300">
                {categoryName}
              </h3>
            </div>
            <CategoryStackMenu
              menu={{
                cardCount,
                categories,
                category,
                categoryName,
                isMenuOpen,
                isMovingCards,
                isRenaming,
                menuButtonRef,
                onMoveCategoryCards,
                onRemoveCategory,
                onCategoryChange,
                onRenameCategory,
                readOnly,
                renameDraft,
                renameInputRef,
                rowCount: rows.length,
                saveRename,
                setMenuState,
              }}
            />
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-3 font-mono text-xs text-zinc-600">
            <p className="min-w-0 truncate">
              Qty: {totalQuantity}
              <span className="ml-2 text-emerald-300">+{diffCounts.added}</span>
              <span className="ml-1 text-amber-300">~{diffCounts.changed}</span>
              <span className="ml-1 text-rose-300">-{diffCounts.removed}</span>
              {categoryDiff?.previousName ? (
                <span className="ml-2 uppercase tracking-[0.08em] text-amber-300/80">
                  was: {categoryDiff.previousName}
                </span>
              ) : null}
            </p>
            <span className="shrink-0 text-zinc-400">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {isCardDropTarget ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-cyan-400/5 p-3">
            <div className="rounded-full border border-cyan-300/50 bg-zinc-950/90 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200 shadow-xl shadow-black/30">
              Move to {categoryName}
            </div>
          </div>
        ) : null}

        {sortedRows.length === 0 ? (
          <div className="flex min-h-64 items-center justify-center bg-zinc-900/40 px-5 text-center text-sm font-semibold text-zinc-500">
            Empty stack
          </div>
        ) : (
          <div
            className="relative min-h-64 overflow-hidden px-3 pb-3"
            style={cardLayout ? (cardLayoutToCssVars(cardLayout) as CSSProperties) : undefined}
            onPointerLeave={() => setHoveredIndex(null)}
          >
            {sortedRows.map((row, index) => (
              <StackCard
                key={row.oracleId}
                row={row}
                index={index}
                isHovered={hoveredIndex === index}
                isShifted={hoveredIndex !== null && index > hoveredIndex}
                onHover={() => setHoveredIndex(index)}
                onAdjustQuantity={onAdjustQuantity}
                onCardLayout={handleCardLayout}
                onMoveCardCategory={onMoveCardCategory}
                onChangePrinting={onChangePrinting}
                onSetDeckCover={onSetDeckCover}
                readOnly={readOnly}
                showEdhrecRank={cardSort === "edhrecRank"}
              />
            ))}
            <div
              aria-hidden="true"
              className="pointer-events-none invisible aspect-488/680"
              style={{
                marginTop: `calc(${lastCardOffset} * var(--stack-card-peek) + var(--stack-card-top-inset))`,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

function applySortDirection(value: number, direction: DeckCardSortDirection) {
  return direction === "asc" ? value : -value;
}

function comparePrices(
  leftPrice: number | undefined,
  rightPrice: number | undefined,
  direction: DeckCardSortDirection,
) {
  if (leftPrice === undefined && rightPrice === undefined) return 0;
  if (leftPrice === undefined) return 1;
  if (rightPrice === undefined) return -1;
  return applySortDirection(leftPrice - rightPrice, direction);
}

export function compareEdhrecRanks(
  leftRank: number | null | undefined,
  rightRank: number | null | undefined,
  direction: DeckCardSortDirection,
) {
  if (leftRank == null && rightRank == null) return 0;
  if (leftRank == null) return 1;
  if (rightRank == null) return -1;
  return applySortDirection(leftRank - rightRank, direction);
}

function areCardLayoutsEqual(left: CardLayout | null, right: CardLayout) {
  return (
    left !== null &&
    left.badgeFontSize === right.badgeFontSize &&
    left.badgePaddingX === right.badgePaddingX &&
    left.badgePaddingY === right.badgePaddingY &&
    left.controlIconSize === right.controlIconSize &&
    left.controlRight === right.controlRight &&
    left.controlSize === right.controlSize &&
    left.controlTop === right.controlTop &&
    left.stackHoverGap === right.stackHoverGap &&
    left.stackPeek === right.stackPeek &&
    left.stackTopInset === right.stackTopInset
  );
}

type CategoryStackMenuModel = {
  cardCount: number;
  categories: DeckCategory[];
  category: CardCategory;
  categoryName: string;
  isMenuOpen: boolean;
  isMovingCards: boolean;
  isRenaming: boolean;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
  onCategoryChange?: (category: CardCategory, patch: Partial<DeckCategory>) => void;
  onRenameCategory?: (category: CardCategory, name: string) => void;
  readOnly: boolean;
  renameDraft: string;
  renameInputRef: RefObject<HTMLInputElement | null>;
  rowCount: number;
  saveRename: () => void;
  setMenuState: (state: Partial<MenuState>) => void;
};

function CategoryStackMenu({ menu }: { menu: CategoryStackMenuModel }) {
  const {
    cardCount,
    categories,
    category,
    categoryName,
    isMenuOpen,
    isMovingCards,
    isRenaming,
    menuButtonRef,
    onMoveCategoryCards,
    onRemoveCategory,
    onCategoryChange,
    onRenameCategory,
    readOnly,
    renameDraft,
    renameInputRef,
    rowCount,
    saveRename,
    setMenuState,
  } = menu;

  return (
    <div>
      <IconButton
        ref={menuButtonRef}
        aria-label={`${categoryName} actions`}
        title={`${categoryName} actions`}
        onClick={() => setMenuState({ isMenuOpen: !isMenuOpen })}
        variant="ghost"
        size="sm"
        className="size-5 rounded-md text-zinc-400 hover:text-zinc-100"
      >
        <MoreHorizontal className="size-3.5" />
      </IconButton>
      {isMenuOpen ? (
        <ContextMenu
          open={isMenuOpen}
          onOpenChange={(open) =>
            setMenuState({
              isMenuOpen: open,
              isMovingCards: open ? isMovingCards : false,
              isRenaming: open ? isRenaming : false,
            })
          }
          anchorRef={menuButtonRef}
          placement="bottom-end"
        >
          {isRenaming ? (
            <div
              role="group"
              className="space-y-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") saveRename();
                if (event.key === "Escape")
                  setMenuState({ isMovingCards: false, isRenaming: false });
              }}
            >
              <label
                className="block text-xs font-medium text-zinc-500"
                htmlFor={`rename-${category}`}
              >
                Rename category
              </label>
              <input
                ref={(element) => {
                  renameInputRef.current = element;
                  if (element && document.activeElement !== element) {
                    element.focus();
                    element.select();
                  }
                }}
                id={`rename-${category}`}
                value={renameDraft}
                onChange={(event) => setMenuState({ renameDraft: event.target.value })}
                className="w-full select-text rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMenuState({ renameDraft: categoryName, isRenaming: false })}
                  className="flex-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveRename}
                  className="flex-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300"
                >
                  Save
                </button>
              </div>
            </div>
          ) : isMovingCards ? (
            <div className="space-y-2">
              <p className="px-3 py-1 text-xs font-medium text-zinc-500">Move cards to</p>
              {categories.map((targetCategory) =>
                targetCategory.id === category ? null : (
                  <button
                    key={targetCategory.id}
                    type="button"
                    onClick={() => {
                      onMoveCategoryCards?.(category, targetCategory.id);
                      setMenuState({ isMovingCards: false, isMenuOpen: false });
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-100"
                  >
                    {targetCategory.name}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setMenuState({ isMovingCards: false })}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
              >
                Back
              </button>
            </div>
          ) : (
            <>
              <ContextMenuItem
                disabled={readOnly || cardCount === 0 || !onMoveCategoryCards}
                closeOnSelect={false}
                onSelect={() => setMenuState({ isMovingCards: true, isMenuOpen: true })}
              >
                Move all cards
              </ContextMenuItem>
              <ContextMenuItem
                disabled={readOnly || !onRenameCategory}
                closeOnSelect={false}
                onSelect={() =>
                  setMenuState({ renameDraft: categoryName, isRenaming: true, isMenuOpen: true })
                }
              >
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                disabled={readOnly || !onCategoryChange}
                onSelect={() => {
                  onCategoryChange?.(category, { hidden: true });
                }}
              >
                Hide category
              </ContextMenuItem>
              <ContextMenuItem
                disabled={readOnly || rowCount > 0 || !onRemoveCategory}
                title={rowCount > 0 ? "Move cards out before removing." : "Remove category"}
                tone="danger"
                onSelect={() => {
                  onRemoveCategory?.(category);
                }}
              >
                Remove
              </ContextMenuItem>
            </>
          )}
        </ContextMenu>
      ) : null}
    </div>
  );
}
