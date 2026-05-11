import { useDraggable, useDroppable } from "@dnd-kit/react";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import type { CardCategory } from "../../../lib/decklist";
import type { EditorRow } from "../types";
import { StackCard } from "./StackCard";
import { cardCategoryDropId } from "./stackIds";

type CategoryStackProps = {
  category: CardCategory;
  rows: EditorRow[];
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  readOnly: boolean;
  onCategoryRef: (element: HTMLElement | null) => void;
};

export function CategoryStack({
  category,
  rows,
  onAdjustQuantity,
  onMoveCardCategory,
  readOnly,
  onCategoryRef,
}: CategoryStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sortedRows = rows.slice().sort(
    (left, right) => right.manaValue - left.manaValue || left.name.localeCompare(right.name),
  );
  const lastCardOffset = Math.max(0, sortedRows.length - 1) * 36;
  const totalQuantity = sortedRows.reduce((sum, row) => sum + row.currentQuantity, 0);
  const addedCount = sortedRows.filter((row) => row.status === "added").length;
  const changedCount = sortedRows.filter((row) => row.status === "changed").length;
  const removedCount = sortedRows.filter((row) => row.status === "removed").length;
  const {
    isDragging,
    ref: draggableRef,
    handleRef,
  } = useDraggable({ id: category, type: "category", disabled: readOnly });
  const { isDropTarget: isCardDropTarget, ref: droppableRef } = useDroppable({
    id: cardCategoryDropId(category),
    type: "card-category",
    accept: "card",
    disabled: readOnly || !onMoveCardCategory,
    data: { category },
  });

  return (
    <section
      ref={(element) => {
        draggableRef(element);
        droppableRef(element);
        onCategoryRef(element);
      }}
      className={`relative overflow-hidden rounded-xl border bg-zinc-950/80 transition ${
        isDragging ? "scale-[1.02] border-cyan-400/70 shadow-2xl shadow-cyan-950/30" : ""
      } ${
        isCardDropTarget
          ? "border-cyan-300/80 bg-cyan-950/20 shadow-2xl shadow-cyan-950/40 ring-2 ring-cyan-300/50"
          : "border-zinc-800"
      }`}
    >
      <div
        ref={handleRef}
        className={`flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2 ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
      >
        <div className="min-w-0">
          <h3 className="truncate font-mono text-sm font-semibold uppercase tracking-[0.08em] text-zinc-300">
            {category}
          </h3>
          <p className="mt-1 font-mono text-xs text-zinc-600">Qty: {totalQuantity}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.08em] xl:flex">
            <span className="text-emerald-300">+{addedCount}</span>
            <span className="text-amber-300">~{changedCount}</span>
            <span className="text-rose-300">-{removedCount}</span>
          </div>
          <button
            type="button"
            aria-label={`${category} actions`}
            title={`${category} actions`}
            className="inline-flex size-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {isCardDropTarget ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-start justify-center rounded-xl bg-cyan-400/5 p-3 ring-1 ring-inset ring-cyan-200/40">
          <div className="rounded-full border border-cyan-300/50 bg-zinc-950/90 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-cyan-200 shadow-xl shadow-black/30">
            Move to {category}
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
    </section>
  );
}
