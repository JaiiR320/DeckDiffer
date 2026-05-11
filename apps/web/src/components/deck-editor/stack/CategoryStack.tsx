import { useDraggable, useDroppable } from "@dnd-kit/react";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CardCategory, DeckCategory } from "../../../lib/decklist";
import type { EditorRow } from "../types";
import { StackCard } from "./StackCard";
import { cardCategoryDropId } from "./stackIds";

type CategoryStackProps = {
  category: CardCategory;
  categoryName: string;
  categories: DeckCategory[];
  cardCount: number;
  rows: EditorRow[];
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
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

const initialMenuState: MenuState = {
  isMenuOpen: false,
  isMovingCards: false,
  isRenaming: false,
  renameDraft: "",
};

export function CategoryStack({
  category,
  categoryName,
  categories,
  cardCount,
  rows,
  onAdjustQuantity,
  onMoveCardCategory,
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
  const lastCardOffset = Math.max(0, sortedRows.length - 1) * 36;
  const totalQuantity = sortedRows.reduce((sum, row) => sum + row.currentQuantity, 0);
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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuState({ isMenuOpen: false, isMovingCards: false, isRenaming: false });
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
      className={`relative overflow-visible rounded-xl border bg-zinc-950/80 transition ${
        isDragging ? "scale-[1.02] border-cyan-400/70 shadow-2xl shadow-cyan-950/30" : ""
      } ${
        isCardDropTarget
          ? "border-cyan-300/80 bg-cyan-950/20 shadow-2xl shadow-cyan-950/40"
          : "border-zinc-800"
      }`}
    >
      <div className="overflow-hidden rounded-xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
          <div
            ref={handleRef}
            className={`min-w-0 flex-1 ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
          >
            <h3 className="truncate font-mono text-sm font-semibold uppercase tracking-[0.08em] text-zinc-300">
              {categoryName}
            </h3>
            <p className="mt-1 font-mono text-xs text-zinc-600">Qty: {totalQuantity}</p>
          </div>
          <div className="flex items-center gap-2">
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
                        if (event.key === "Enter") {
                          const nextName = renameDraft.trim();
                          if (nextName) {
                            onRenameCategory?.(category, nextName);
                            setMenuState({ isRenaming: false, isMenuOpen: false });
                          }
                        }

                        if (event.key === "Escape") {
                          setMenuState({ isMovingCards: false, isRenaming: false });
                        }
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
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-cyan-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuState({ renameDraft: categoryName, isRenaming: false });
                          }}
                          className="flex-1 rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const nextName = renameDraft.trim();
                            if (nextName) {
                              onRenameCategory?.(category, nextName);
                              setMenuState({ isRenaming: false, isMenuOpen: false });
                            }
                          }}
                          className="flex-1 rounded-lg bg-cyan-400 px-3 py-1.5 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : isMovingCards ? (
                    <div className="space-y-2">
                      <p className="px-3 py-1 text-xs font-medium text-zinc-500">Move cards to</p>
                      {categories.reduce<ReactNode[]>((buttons, targetCategory) => {
                        if (targetCategory.id === category) {
                          return buttons;
                        }

                        return [
                          ...buttons,
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
                          </button>,
                        ];
                      }, [])}
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
                        onClick={() => {
                          setMenuState({ renameDraft: categoryName, isRenaming: true });
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={readOnly || rows.length > 0 || !onRemoveCategory}
                        title={
                          rows.length > 0 ? "Move cards out before removing." : "Remove category"
                        }
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
                readOnly={readOnly}
              />
            ))}
            <div
              aria-hidden="true"
              className="pointer-events-none invisible aspect-[488/680]"
              style={{ marginTop: `${lastCardOffset}px` }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
