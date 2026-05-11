import { CollisionPriority } from "@dnd-kit/abstract";
import {
  DragDropProvider,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/react";
import { Minus, MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { DeckStackLayout } from "../../lib/deck";
import { CARD_CATEGORIES, type CardCategory } from "../../lib/decklist";
import { getCardPreview } from "../../lib/scryfall";
import type { EditorRow } from "./types";

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

type DropPreview = {
  category: CardCategory;
  laneIndex: number;
  insertIndex: number;
  height: number;
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

  function handleDragOver(event: DragOverEvent) {
    const { source } = event.operation;

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
      event.operation.position.current.x,
      event.operation.position.current.y,
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

  function renderCategoryStacks(lane: CardCategory[], laneIndex: number) {
    const placeholderIndex = getPlaceholderRenderIndex(lane, laneIndex, dropPreview);
    const nodes: ReactNode[] = [];

    for (const [categoryIndex, category] of lane.entries()) {
      if (placeholderIndex === categoryIndex) {
        nodes.push(<DropPlaceholder key="drop-placeholder" height={dropPreview?.height ?? 96} />);
      }

      nodes.push(
        <CategoryStack
          key={category}
          category={category}
          rows={visibleGroupedRows[category]}
          onAdjustQuantity={onAdjustQuantity}
          onMoveCardCategory={onMoveCardCategory}
          readOnly={readOnly}
          onCategoryRef={(element) => {
            if (element) {
              categoryElements.current.set(category, element);
            } else {
              categoryElements.current.delete(category);
            }
          }}
        />,
      );
    }

    if (placeholderIndex === lane.length) {
      nodes.push(<DropPlaceholder key="drop-placeholder" height={dropPreview?.height ?? 96} />);
    }

    return nodes;
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
            className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
              showDiffOnly
                ? "border-cyan-500/70 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
            }`}
          >
            <Minus className="h-3.5 w-3.5 translate-y-[2px]" strokeWidth={2} />
            <Plus className="absolute h-3.5 w-3.5 -translate-y-[2px]" strokeWidth={2} />
          </button>
        </div>
      </div>

      <DragDropProvider
        onDragStart={handleDragStart}
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
              {renderCategoryStacks(lane, laneIndex)}
            </CategoryLane>
          ))}
        </div>
      </DragDropProvider>
    </div>
  );
}

function laneId(index: number) {
  return `lane-${index}`;
}

function cardDragId(oracleId: string) {
  return `card:${oracleId}`;
}

function cardCategoryDropId(category: CardCategory) {
  return `card-category:${category}`;
}

function moveLayoutByPointer(
  layout: DeckStackLayout,
  sourceId: string | number,
  pointerX: number,
  pointerY: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
): DeckStackLayout {
  if (!CARD_CATEGORIES.includes(sourceId as CardCategory)) {
    return layout;
  }

  const sourceCategory = sourceId as CardCategory;
  const lanes = layout.lanes.map((lane) => lane.filter((category) => category !== sourceCategory));
  const { laneIndex, insertIndex } = getDropPlacement(
    layout,
    sourceCategory,
    pointerX,
    pointerY,
    laneElements,
    categoryElements,
  );
  lanes[laneIndex]?.splice(insertIndex, 0, sourceCategory);

  return { lanes };
}

function getDropPlacement(
  layout: DeckStackLayout,
  sourceCategory: CardCategory,
  pointerX: number,
  pointerY: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
) {
  const lanes = layout.lanes.map((lane) => lane.filter((category) => category !== sourceCategory));
  const laneIndex = getPointerLaneIndex(lanes, pointerX, laneElements);
  const insertIndex = getPointerCategoryIndex(lanes[laneIndex] ?? [], pointerY, categoryElements);

  return { laneIndex, insertIndex };
}

function getPlaceholderRenderIndex(
  lane: CardCategory[],
  laneIndex: number,
  preview: DropPreview | null,
) {
  if (!preview || preview.laneIndex !== laneIndex) {
    return -1;
  }

  const sourceIndex = lane.indexOf(preview.category);

  if (sourceIndex === preview.insertIndex) {
    return -1;
  }

  if (sourceIndex !== -1 && sourceIndex <= preview.insertIndex) {
    return preview.insertIndex + 1;
  }

  return preview.insertIndex;
}

function getPointerLaneIndex(
  lanes: CardCategory[][],
  pointerX: number,
  laneElements: ReadonlyMap<number, HTMLElement>,
) {
  let nearestLaneIndex = 0;
  let nearestLaneDistance = Number.POSITIVE_INFINITY;

  for (const [laneIndex, element] of laneElements) {
    const rect = element.getBoundingClientRect();

    if (pointerX >= rect.left && pointerX <= rect.right) {
      return laneIndex;
    }

    const distance = Math.abs(pointerX - (rect.left + rect.width / 2));
    if (distance < nearestLaneDistance) {
      nearestLaneDistance = distance;
      nearestLaneIndex = laneIndex;
    }
  }

  return Math.min(nearestLaneIndex, Math.max(0, lanes.length - 1));
}

function getPointerCategoryIndex(
  lane: CardCategory[],
  pointerY: number,
  categoryElements: ReadonlyMap<CardCategory, HTMLElement>,
) {
  for (const [index, category] of lane.entries()) {
    const element = categoryElements.get(category);
    if (!element) {
      continue;
    }

    const rect = element.getBoundingClientRect();
    if (pointerY < rect.top + rect.height / 2) {
      return index;
    }
  }

  return lane.length;
}

type CategoryLaneProps = {
  laneIndex: number;
  categories: CardCategory[];
  hasPreview: boolean;
  onLaneRef: (element: HTMLDivElement | null) => void;
  children: ReactNode;
};

function CategoryLane({
  laneIndex,
  categories,
  hasPreview,
  onLaneRef,
  children,
}: CategoryLaneProps) {
  const { ref } = useDroppable({
    id: laneId(laneIndex),
    type: "lane",
    accept: "category",
    collisionPriority: CollisionPriority.Low,
  });

  return (
    <div
      ref={(element) => {
        ref(element);
        onLaneRef(element);
      }}
      className="flex min-h-80 min-w-0 flex-col gap-3 p-1"
    >
      {categories.length === 0 && !hasPreview ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl bg-zinc-900/25 px-4 text-center text-sm font-semibold text-zinc-600">
          Empty lane
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function DropPlaceholder({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-dashed border-cyan-500/40 bg-cyan-500/5 transition-all duration-150"
      style={{ minHeight: `${height}px` }}
    />
  );
}

type CategoryStackProps = {
  category: CardCategory;
  rows: EditorRow[];
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  readOnly: boolean;
  onCategoryRef: (element: HTMLElement | null) => void;
};

function CategoryStack({
  category,
  rows,
  onAdjustQuantity,
  onMoveCardCategory,
  readOnly,
  onCategoryRef,
}: CategoryStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sortedRows = [...rows].sort(
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
  } = useDraggable({
    id: category,
    type: "category",
    disabled: readOnly,
  });
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
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <MoreHorizontal className="h-4 w-4" />
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

type StackCardProps = {
  row: EditorRow;
  index: number;
  isHovered: boolean;
  isShifted: boolean;
  onHover: () => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  readOnly: boolean;
};

function StackCard({
  row,
  index,
  isHovered,
  isShifted,
  onHover,
  onAdjustQuantity,
  onMoveCardCategory,
  readOnly,
}: StackCardProps) {
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const isMoveDisabled = readOnly || !onMoveCardCategory || row.currentQuantity <= 0;
  const { isDragging, ref } = useDraggable({
    id: cardDragId(row.oracleId),
    type: "card",
    disabled: isMoveDisabled,
    data: { row },
  });
  const imageUrl = row.imageUrl ?? fallbackImageUrl;
  const toneClass =
    row.status === "added"
      ? "ring-emerald-400/40"
      : row.status === "removed"
        ? "ring-rose-400/40 opacity-70"
        : row.status === "changed"
          ? "ring-amber-400/40"
          : "ring-zinc-700/80";

  useEffect(() => {
    if (row.imageUrl) {
      return;
    }

    let isCancelled = false;
    getCardPreview({
      name: row.name,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
    }).then((preview) => {
      if (!isCancelled) {
        setFallbackImageUrl(preview?.imageUrl ?? null);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [row.collectorNumber, row.imageUrl, row.name, row.setCode]);

  return (
    <div
      className={`pointer-events-none absolute left-3 right-3 overflow-visible transition-transform duration-500 will-change-transform ${isShifted ? "translate-y-[calc(100%_-_2.25rem)]" : "translate-y-0"}`}
      style={{ top: `${index * 36 + 8}px`, zIndex: index + 1 }}
      onFocus={onHover}
    >
      <div
        ref={ref}
        onPointerEnter={onHover}
        className={`pointer-events-auto relative aspect-[488/680] overflow-hidden rounded-xl bg-zinc-900 shadow-lg shadow-black/30 ring-1 transition-all duration-300 ${isMoveDisabled ? "" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "scale-[1.04] rotate-1 opacity-90 shadow-2xl shadow-cyan-950/50 ring-2 ring-cyan-200" : isHovered ? "ring-cyan-300/70" : ""} ${toneClass}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={row.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-start justify-center bg-zinc-900 px-3 pt-8 text-center text-sm font-semibold text-zinc-400">
            {row.name}
          </div>
        )}

        <div className="absolute left-0 top-0 rounded-br-lg bg-zinc-950/75 px-2 py-1 font-mono text-sm font-semibold text-zinc-100 shadow-lg shadow-black/30">
          {row.currentQuantity}
        </div>

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent opacity-80" />

        <div
          className={`absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/20 bg-zinc-950/45 shadow-xl shadow-black/30 backdrop-blur-sm transition duration-200 ${isHovered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        >
          {readOnly ? null : (
            <>
              <button
                type="button"
                aria-label={`Increase ${row.name} quantity`}
                onClick={() => onAdjustQuantity?.(row, 1)}
                className="inline-flex h-9 w-9 items-center justify-center text-zinc-100 transition hover:bg-white/15"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label={`Decrease ${row.name} quantity`}
                onClick={() => onAdjustQuantity?.(row, -1)}
                disabled={row.currentQuantity === 0 && row.baselineQuantity === 0}
                className="inline-flex h-9 w-9 items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </>
          )}
          <button
            type="button"
            aria-label={`${row.name} actions`}
            className="inline-flex h-9 w-9 items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
