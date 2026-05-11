import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  useDragOperation,
} from "@dnd-kit/react";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent, ReactNode, RefObject } from "react";
import type { DeckStackLayout } from "../../../lib/deck";
import { createCategoryId, type CardCategory, type DeckCategory } from "../../../lib/decklist";
import type { SearchCardResult } from "../../../lib/scryfall";
import type { CategoryDiff, EditorRow } from "../types";
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
  categories: DeckCategory[];
  categoryDiffs: Record<CardCategory, CategoryDiff>;
  groupedRows: Record<CardCategory, EditorRow[]>;
  resultCardTotal: number;
  showDiffOnly: boolean;
  layout: DeckStackLayout;
  onToggleShowDiffOnly: () => void;
  onLayoutChange: (layout: DeckStackLayout) => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onCreateCategoryInLane?: (laneIndex: number, category: DeckCategory) => void;
  onRemoveLane?: (laneIndex: number) => void;
  onRemoveCategory?: (category: CardCategory) => void;
  onRenameCategory?: (category: CardCategory, name: string) => void;
  onAddSearchCard?: (card: SearchCardResult, category: CardCategory) => void;
  searchToolbar: ReactNode;
  readOnly?: boolean;
};

export function EditorDeckStack({
  categories,
  categoryDiffs,
  groupedRows,
  resultCardTotal,
  showDiffOnly,
  layout,
  onToggleShowDiffOnly,
  onLayoutChange,
  onAdjustQuantity,
  onMoveCardCategory,
  onMoveCategoryCards,
  onCreateCategoryInLane,
  onRemoveLane,
  onRemoveCategory,
  onRenameCategory,
  onAddSearchCard,
  searchToolbar,
  readOnly = false,
}: EditorDeckStackProps) {
  const previousLayout = useRef(layout);
  const laneMenuRef = useRef<HTMLDivElement | null>(null);
  const laneElements = useRef(new Map<number, HTMLDivElement>());
  const categoryElements = useRef(new Map<CardCategory, HTMLElement>());
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [laneMenu, setLaneMenu] = useState<{ x: number; y: number; laneIndex: number } | null>(
    null,
  );
  const [renamingCategoryId, setRenamingCategoryId] = useState<CardCategory | null>(null);
  const allRows = Object.values(groupedRows).flat();
  const visibleGroupedRows = Object.fromEntries(
    categories.map((category) => [
      category.id,
      showDiffOnly
        ? (groupedRows[category.id] ?? []).filter((row) => row.status !== "same")
        : (groupedRows[category.id] ?? []),
    ]),
  ) as Record<CardCategory, EditorRow[]>;
  const visibleRows = Object.values(visibleGroupedRows).flat();
  const totalAdded = allRows.filter((row) => row.status === "added").length;
  const totalChanged = allRows.filter((row) => row.status === "changed").length;
  const totalRemoved = allRows.filter((row) => row.status === "removed").length;

  useEffect(() => {
    if (!laneMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!laneMenuRef.current?.contains(event.target as Node)) {
        setLaneMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [laneMenu]);

  function handleDragStart() {
    previousLayout.current = layout;
    setLaneMenu(null);
  }

  function openLaneMenu(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (readOnly || target.closest("[data-category-stack],button,input,textarea,select")) {
      return;
    }

    event.preventDefault();
    const laneIndex = getPointerLaneIndex(event.clientX);
    setLaneMenu({ x: event.clientX, y: event.clientY, laneIndex });
  }

  function getPointerLaneIndex(pointerX: number) {
    let nearestLaneIndex = 0;
    let nearestLaneDistance = Number.POSITIVE_INFINITY;

    for (const [laneIndex, element] of laneElements.current) {
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

    return nearestLaneIndex;
  }

  function createCategoryInLane(laneIndex: number) {
    const category: DeckCategory = {
      id: createCategoryId("New category", categories),
      name: "New category",
      kind: "custom",
    };

    onCreateCategoryInLane?.(laneIndex, category);
    setRenamingCategoryId(category.id);
    setLaneMenu(null);
  }

  function updateCategoryDropPreview(
    operation: DragMoveEvent["operation"] | DragOverEvent["operation"],
  ) {
    const { source } = operation;

    if (readOnly || source?.type !== "category") {
      return;
    }

    const category = source.id as CardCategory;
    if (!categories.some((item) => item.id === category)) {
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

      if (
        !event.operation.canceled &&
        row &&
        category &&
        categories.some((item) => item.id === category)
      ) {
        onMoveCardCategory?.(row, category);
      }

      setDropPreview(null);
      return;
    }

    if (source?.type === "search-card") {
      const card = source.data.card as SearchCardResult | undefined;
      const category = target?.data.category as CardCategory | undefined;

      if (
        !event.operation.canceled &&
        card &&
        category &&
        categories.some((item) => item.id === category)
      ) {
        onAddSearchCard?.(card, category);
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
    <div>
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {searchToolbar}
        <SearchCardDragOverlayHost />
        <LaneMenu
          laneMenu={laneMenu}
          laneMenuRef={laneMenuRef}
          onCreateCategory={createCategoryInLane}
        />
        <div className="space-y-4 px-5 pb-5 pt-5">
          <StackSummary
            resultCardTotal={resultCardTotal}
            showDiffOnly={showDiffOnly}
            totalAdded={totalAdded}
            totalChanged={totalChanged}
            totalRemoved={totalRemoved}
            visibleRowsCount={visibleRows.length}
            onToggleShowDiffOnly={onToggleShowDiffOnly}
          />
          <div
            className="grid select-none items-start gap-0 pb-2"
            onContextMenu={openLaneMenu}
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
                onRemoveLane={readOnly ? undefined : onRemoveLane}
              >
                <CategoryStackList
                  categoryElements={categoryElements.current}
                  dropPreview={dropPreview}
                  lane={lane}
                  laneIndex={laneIndex}
                  onAdjustQuantity={onAdjustQuantity}
                  onMoveCardCategory={onMoveCardCategory}
                  onMoveCategoryCards={onMoveCategoryCards}
                  onRemoveCategory={onRemoveCategory}
                  onRenameCategory={onRenameCategory}
                  readOnly={readOnly}
                  categories={categories}
                  categoryDiffs={categoryDiffs}
                  groupedRows={groupedRows}
                  renamingCategoryId={renamingCategoryId}
                  visibleGroupedRows={visibleGroupedRows}
                />
              </CategoryLane>
            ))}
          </div>
        </div>
      </DragDropProvider>
    </div>
  );
}

function LaneMenu({
  laneMenu,
  laneMenuRef,
  onCreateCategory,
}: {
  laneMenu: { x: number; y: number; laneIndex: number } | null;
  laneMenuRef: RefObject<HTMLDivElement | null>;
  onCreateCategory: (laneIndex: number) => void;
}) {
  if (!laneMenu) {
    return null;
  }

  return (
    <div
      ref={laneMenuRef}
      className="fixed z-50 w-44 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40"
      style={{ left: laneMenu.x, top: laneMenu.y }}
    >
      <button
        type="button"
        onClick={() => onCreateCategory(laneMenu.laneIndex)}
        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-zinc-900"
      >
        New category
      </button>
    </div>
  );
}

function StackSummary({
  resultCardTotal,
  showDiffOnly,
  totalAdded,
  totalChanged,
  totalRemoved,
  visibleRowsCount,
  onToggleShowDiffOnly,
}: {
  resultCardTotal: number;
  showDiffOnly: boolean;
  totalAdded: number;
  totalChanged: number;
  totalRemoved: number;
  visibleRowsCount: number;
  onToggleShowDiffOnly: () => void;
}) {
  const shownCount = showDiffOnly ? visibleRowsCount : resultCardTotal;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="font-mono text-sm font-medium uppercase tracking-[0.08em] text-zinc-500">
        {shownCount} {showDiffOnly ? "diff card" : "total card"}
        {shownCount === 1 ? "" : "s"}
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
  );
}

function SearchCardDragOverlayHost() {
  const { source } = useDragOperation();

  if (source?.type !== "search-card") {
    return null;
  }

  return (
    <DragOverlay dropAnimation={null}>
      <SearchCardDragOverlay card={source.data.card as SearchCardResult} />
    </DragOverlay>
  );
}

function SearchCardDragOverlay({ card }: { card: SearchCardResult }) {
  const imageUrl = card.imageUrl ?? card.smallImageUrl;

  return (
    <div className="pointer-events-none w-64 rotate-1 overflow-hidden rounded-xl bg-zinc-900 shadow-2xl shadow-cyan-950/50 ring-2 ring-cyan-200">
      <div className="relative aspect-[488/680]">
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-start justify-center bg-zinc-900 px-3 pt-8 text-center text-sm font-semibold text-zinc-400">
            {card.name}
          </div>
        )}
        <div className="absolute left-0 top-0 rounded-br-lg bg-zinc-950/75 px-2 py-1 font-mono text-sm font-semibold text-zinc-100 shadow-lg shadow-black/30">
          1
        </div>
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent opacity-80" />
      </div>
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
  onMoveCategoryCards,
  onRemoveCategory,
  onRenameCategory,
  readOnly,
  categories,
  categoryDiffs,
  groupedRows,
  renamingCategoryId,
  visibleGroupedRows,
}: {
  categoryElements: Map<CardCategory, HTMLElement>;
  dropPreview: DropPreview | null;
  lane: CardCategory[];
  laneIndex: number;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
  onRenameCategory?: (category: CardCategory, name: string) => void;
  readOnly: boolean;
  categories: DeckCategory[];
  categoryDiffs: Record<CardCategory, CategoryDiff>;
  groupedRows: Record<CardCategory, EditorRow[]>;
  renamingCategoryId: CardCategory | null;
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
          onMoveCategoryCards={onMoveCategoryCards}
          onRemoveCategory={onRemoveCategory}
          onRenameCategory={onRenameCategory}
          placeholderIndex={placeholderIndex}
          readOnly={readOnly}
          rows={visibleGroupedRows[category] ?? []}
          cardCount={groupedRows[category]?.length ?? 0}
          diffCounts={getCategoryDiffCounts(groupedRows[category] ?? [])}
          categories={categories}
          categoryDiff={categoryDiffs[category]}
          shouldStartRenaming={renamingCategoryId === category}
          categoryName={categories.find((item) => item.id === category)?.name ?? category}
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
  onMoveCategoryCards,
  onRemoveCategory,
  onRenameCategory,
  placeholderIndex,
  readOnly,
  rows,
  cardCount,
  diffCounts,
  categories,
  categoryDiff,
  categoryName,
  shouldStartRenaming,
}: {
  category: CardCategory;
  categoryElements: Map<CardCategory, HTMLElement>;
  categoryIndex: number;
  dropPreview: DropPreview | null;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onMoveCategoryCards?: (category: CardCategory, targetCategory: CardCategory) => void;
  onRemoveCategory?: (category: CardCategory) => void;
  onRenameCategory?: (category: CardCategory, name: string) => void;
  placeholderIndex: number;
  readOnly: boolean;
  rows: EditorRow[];
  cardCount: number;
  diffCounts: CategoryDiffCounts;
  categories: DeckCategory[];
  categoryDiff?: CategoryDiff;
  categoryName: string;
  shouldStartRenaming: boolean;
}) {
  return (
    <>
      {placeholderIndex === categoryIndex ? (
        <DropPlaceholder height={dropPreview?.height ?? 96} />
      ) : null}
      <CategoryStack
        category={category}
        categoryName={categoryName}
        categoryDiff={categoryDiff}
        categories={categories}
        cardCount={cardCount}
        diffCounts={diffCounts}
        shouldStartRenaming={shouldStartRenaming}
        rows={rows}
        onAdjustQuantity={onAdjustQuantity}
        onMoveCardCategory={onMoveCardCategory}
        onMoveCategoryCards={onMoveCategoryCards}
        onRemoveCategory={onRemoveCategory}
        onRenameCategory={onRenameCategory}
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

type CategoryDiffCounts = {
  added: number;
  changed: number;
  removed: number;
};

function getCategoryDiffCounts(rows: EditorRow[]): CategoryDiffCounts {
  return rows.reduce<CategoryDiffCounts>(
    (counts, row) => {
      if (row.status === "added") counts.added += 1;
      if (row.status === "changed") counts.changed += 1;
      if (row.status === "removed") counts.removed += 1;
      return counts;
    },
    { added: 0, changed: 0, removed: 0 },
  );
}
