import { useDraggable, useDroppable } from "@dnd-kit/react";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import type { RefObject } from "react";
import type { CardCategory, DeckCategory } from "#/lib/decklist";
import type { CategoryDiff, EditorRow } from "../editor/types";
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
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onChangePrinting?: (row: EditorRow) => void;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
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
  onAdjustQuantity,
  onMoveCardCategory,
  onChangePrinting,
  onMoveCategoryCards,
  onRemoveCategory,
  onRenameCategory,
  shouldStartRenaming = false,
  readOnly,
  onCategoryRef,
}: CategoryStackProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const handledStartRenameRef = useRef(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [menuState, setMenuState] = useReducer(
    (current: MenuState, next: Partial<MenuState>) => ({ ...current, ...next }),
    initialMenuState,
  );
  const { isMenuOpen, isMovingCards, isRenaming, renameDraft } = menuState;
  const sortedRows = rows
    .slice()
    .sort((left, right) => right.manaValue - left.manaValue || left.name.localeCompare(right.name));
  const lastCardOffset = Math.max(0, sortedRows.length - 1) * 44;
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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuState({
          isMenuOpen: false,
          isMovingCards: false,
          isRenaming: false,
        });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

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
        <div className="border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
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
                menuRef,
                onMoveCategoryCards,
                onRemoveCategory,
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
          <div className="mt-1 flex items-center justify-between gap-3 font-mono text-xs text-zinc-600">
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
            className="relative min-h-64 overflow-hidden px-3 pb-3 pt-2"
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
                onMoveCardCategory={onMoveCardCategory}
                onChangePrinting={onChangePrinting}
                readOnly={readOnly}
              />
            ))}
            <div
              aria-hidden="true"
              className="pointer-events-none invisible aspect-488/680"
              style={{ marginTop: `${lastCardOffset}px` }}
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

type CategoryStackMenuModel = {
  cardCount: number;
  categories: DeckCategory[];
  category: CardCategory;
  categoryName: string;
  isMenuOpen: boolean;
  isMovingCards: boolean;
  isRenaming: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
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
    menuRef,
    onMoveCategoryCards,
    onRemoveCategory,
    onRenameCategory,
    readOnly,
    renameDraft,
    renameInputRef,
    rowCount,
    saveRename,
    setMenuState,
  } = menu;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`${categoryName} actions`}
        title={`${categoryName} actions`}
        onClick={() => setMenuState({ isMenuOpen: !isMenuOpen })}
        className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {isMenuOpen ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
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
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900"
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
              <button
                type="button"
                disabled={readOnly || cardCount === 0 || !onMoveCategoryCards}
                onClick={() => setMenuState({ isMovingCards: true })}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Move all cards
              </button>
              <button
                type="button"
                disabled={readOnly || !onRenameCategory}
                onClick={() => setMenuState({ renameDraft: categoryName, isRenaming: true })}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Rename
              </button>
              <button
                type="button"
                disabled={readOnly || rowCount > 0 || !onRemoveCategory}
                title={rowCount > 0 ? "Move cards out before removing." : "Remove category"}
                onClick={() => {
                  onRemoveCategory?.(category);
                  setMenuState({ isMenuOpen: false });
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-950/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
