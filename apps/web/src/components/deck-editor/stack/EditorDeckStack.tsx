import {
  DragDropProvider,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
} from "@dnd-kit/react";
import { Minus, Plus } from "lucide-react";
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DeckStackLayout } from "../../../lib/deck";
import { CARD_CATEGORIES, type CardCategory } from "../../../lib/decklist";
import type { EditorRow } from "../types";
import { CategoryLane } from "./CategoryLane";
import { CategoryStack } from "./CategoryStack";
import { DropPlaceholder } from "./DropPlaceholder";
import {
  getDropPlacement,
  getPlaceholderRenderIndex,
  moveLayoutByPointer,
  type DropPreview,
} from "./stackLayoutDrag";

type EditorDeckStackProps = {
  groupedRows: Record<CardCategory, EditorRow[]>;
  resultCardTotal: number;
  showDiffOnly: boolean;
  layout: DeckStackLayout;
  onToggleShowDiffOnly: () => void;
  onLayoutChange: (layout: DeckStackLayout) => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  readOnly?: boolean;
};

export function EditorDeckStack({
  groupedRows,
  resultCardTotal,
  showDiffOnly,
  layout,
  onToggleShowDiffOnly,
  onLayoutChange,
  onAdjustQuantity,
  onMoveCardCategory,
  readOnly = false,
}: EditorDeckStackProps) {
  const previousLayout = useRef(layout);
  const laneElements = useRef(new Map<number, HTMLDivElement>());
  const categoryElements = useRef(new Map<CardCategory, HTMLElement>());
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const allRows = Object.values(groupedRows).flat();
  const visibleGroupedRows = Object.fromEntries(
    CARD_CATEGORIES.map((category) => [
      category,
      showDiffOnly
        ? groupedRows[category].filter((row) => row.status !== "same")
        : groupedRows[category],
    ]),
  ) as Record<CardCategory, EditorRow[]>;
  const visibleRows = Object.values(visibleGroupedRows).flat();
  const totalAdded = allRows.filter((row) => row.status === "added").length;
  const totalChanged = allRows.filter((row) => row.status === "changed").length;
  const totalRemoved = allRows.filter((row) => row.status === "removed").length;

  function handleDragStart() {
    previousLayout.current = layout;
  }

  function updateCategoryDropPreview(
    operation: DragMoveEvent["operation"] | DragOverEvent["operation"],
  ) {
    const { source } = operation;

    if (readOnly || source?.type !== "category") {
      return;
    }

    const category = source.id as CardCategory;
    if (!CARD_CATEGORIES.includes(category)) {
      return;
    }

    const placement = getDropPlacement(
      layout,
      category,
      operation.position.current.x,
      operation.position.current.y,
      laneElements.current,
      categoryElements.current,
    );
    const height = categoryElements.current.get(category)?.getBoundingClientRect().height ?? 96;

    setDropPreview((current) => {
      if (
        current?.category === category &&
        current.laneIndex === placement.laneIndex &&
        current.insertIndex === placement.insertIndex &&
        current.height === height
      ) {
        return current;
      }

      return { category, height, ...placement };
    });
  }

  function handleDragMove(event: DragMoveEvent) {
    updateCategoryDropPreview(event.operation);
  }

  function handleDragOver(event: DragOverEvent) {
    updateCategoryDropPreview(event.operation);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { source, target } = event.operation;

    if (readOnly) {
      setDropPreview(null);
      return;
    }

    if (source?.type === "card") {
      const row = source.data.row as EditorRow | undefined;
      const category = target?.data.category as CardCategory | undefined;

      if (!event.operation.canceled && row && category && CARD_CATEGORIES.includes(category)) {
        onMoveCardCategory?.(row, category);
      }

      setDropPreview(null);
      return;
    }

    if (source?.type !== "category") {
      setDropPreview(null);
      return;
    }

    if (event.operation.canceled) {
      onLayoutChange(previousLayout.current);
      setDropPreview(null);
      return;
    }

    onLayoutChange(
      moveLayoutByPointer(
        layout,
        source.id,
        event.operation.position.current.x,
        event.operation.position.current.y,
        laneElements.current,
        categoryElements.current,
      ),
    );
    setDropPreview(null);
  }

  return (
    <div className="space-y-4 px-5 pb-5 pt-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-zinc-500">
          {showDiffOnly ? visibleRows.length : resultCardTotal}{" "}
          {showDiffOnly ? "diff card" : "total card"}
          {showDiffOnly ? (visibleRows.length === 1 ? "" : "s") : resultCardTotal === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 font-mono text-sm font-medium uppercase tracking-[0.08em]">
            <span className="text-emerald-300">+{totalAdded}</span>
            <span className="text-amber-300">~{totalChanged}</span>
            <span className="text-rose-300">-{totalRemoved}</span>
          </div>
          <button
            type="button"
            onClick={onToggleShowDiffOnly}
            aria-pressed={showDiffOnly}
            aria-label={showDiffOnly ? "Show all cards" : "Show differences only"}
            title={showDiffOnly ? "Show all cards" : "Show differences only"}
            className={`relative inline-flex size-7 items-center justify-center rounded-md border transition ${
              showDiffOnly
                ? "border-cyan-500/70 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            <Minus className="size-3.5 translate-y-[2px]" strokeWidth={2} />
            <Plus className="absolute size-3.5 -translate-y-[2px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      <DragDropProvider
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid items-start gap-0 pb-2"
          style={
            {
              gridTemplateColumns: `repeat(${layout.lanes.length}, minmax(0, 1fr))`,
            } as CSSProperties
          }
        >
          {layout.lanes.map((lane, laneIndex) => (
            <CategoryLane
              key={laneIndex}
              laneIndex={laneIndex}
              categories={lane}
              hasPreview={dropPreview?.laneIndex === laneIndex}
              onLaneRef={(element) => {
                if (element) {
                  laneElements.current.set(laneIndex, element);
                } else {
                  laneElements.current.delete(laneIndex);
                }
              }}
            >
              <CategoryStackList
                categoryElements={categoryElements.current}
                dropPreview={dropPreview}
                lane={lane}
                laneIndex={laneIndex}
                onAdjustQuantity={onAdjustQuantity}
                onMoveCardCategory={onMoveCardCategory}
                readOnly={readOnly}
                visibleGroupedRows={visibleGroupedRows}
              />
            </CategoryLane>
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}

function CategoryStackList({
  categoryElements,
  dropPreview,
  lane,
  laneIndex,
  onAdjustQuantity,
  onMoveCardCategory,
  readOnly,
  visibleGroupedRows,
}: {
  categoryElements: Map<CardCategory, HTMLElement>;
  dropPreview: DropPreview | null;
  lane: CardCategory[];
  laneIndex: number;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  readOnly: boolean;
  visibleGroupedRows: Record<CardCategory, EditorRow[]>;
}) {
  const placeholderIndex = getPlaceholderRenderIndex(lane, laneIndex, dropPreview);

  return (
    <>
      {lane.map((category, categoryIndex) => (
        <FragmentWithPlaceholder
          key={category}
          category={category}
          categoryElements={categoryElements}
          categoryIndex={categoryIndex}
          dropPreview={dropPreview}
          onAdjustQuantity={onAdjustQuantity}
          onMoveCardCategory={onMoveCardCategory}
          placeholderIndex={placeholderIndex}
          readOnly={readOnly}
          rows={visibleGroupedRows[category]}
        />
      ))}
      {placeholderIndex === lane.length ? (
        <DropPlaceholder height={dropPreview?.height ?? 96} />
      ) : null}
    </>
  );
}

function FragmentWithPlaceholder({
  category,
  categoryElements,
  categoryIndex,
  dropPreview,
  onAdjustQuantity,
  onMoveCardCategory,
  placeholderIndex,
  readOnly,
  rows,
}: {
  category: CardCategory;
  categoryElements: Map<CardCategory, HTMLElement>;
  categoryIndex: number;
  dropPreview: DropPreview | null;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  placeholderIndex: number;
  readOnly: boolean;
  rows: EditorRow[];
}) {
  return (
    <>
      {placeholderIndex === categoryIndex ? (
        <DropPlaceholder height={dropPreview?.height ?? 96} />
      ) : null}
      <CategoryStack
        category={category}
        rows={rows}
        onAdjustQuantity={onAdjustQuantity}
        onMoveCardCategory={onMoveCardCategory}
        readOnly={readOnly}
        onCategoryRef={(element) => {
          if (element) {
            categoryElements.set(category, element);
          } else {
            categoryElements.delete(category);
          }
        }}
      />
    </>
  );
}
