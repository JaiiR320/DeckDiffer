import { useDraggable } from "@dnd-kit/react";
import { Minus, MoreHorizontal, Plus } from "lucide-react";
import type { CardCategory } from "../../../lib/decklist";
import type { EditorRow } from "../types";
import { cardDragId } from "./stackIds";
import { useFallbackCardImage } from "./useFallbackCardImage";

type StackCardProps = {
  row: EditorRow;
  index: number;
  isHovered: boolean;
  isShifted: boolean;
  onHover: () => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  dragData?: Record<string, unknown>;
  dragId?: string;
  dragType?: "card" | "search-card";
  layout?: "stack" | "inline";
  readOnly: boolean;
  showControls?: boolean;
};

export function StackCard({
  row,
  index,
  isHovered,
  isShifted,
  onHover,
  onAdjustQuantity,
  onMoveCardCategory,
  dragData,
  dragId,
  dragType = "card",
  layout = "stack",
  readOnly,
  showControls = true,
}: StackCardProps) {
  const isMoveDisabled =
    readOnly || (dragType === "card" && (!onMoveCardCategory || row.currentQuantity <= 0));
  const { isDragging, ref } = useDraggable({
    id: dragId ?? cardDragId(row.oracleId),
    type: dragType,
    disabled: isMoveDisabled,
    data: dragData ?? { row },
  });
  const imageUrl = useFallbackCardImage(row);
  const toneClass =
    row.status === "added"
      ? "ring-emerald-400/40"
      : row.status === "removed"
        ? "ring-rose-400/40 opacity-70"
        : row.status === "changed"
          ? "ring-amber-400/40"
          : "ring-zinc-700/80";

  return (
    <div
      className={
        layout === "stack"
          ? `pointer-events-none absolute left-3 right-3 overflow-visible transition-transform duration-500 will-change-transform ${isShifted ? "translate-y-[calc(100%_-_2.25rem)]" : "translate-y-0"}`
          : "pointer-events-none w-36 shrink-0 overflow-visible"
      }
      style={layout === "stack" ? { top: `${index * 36 + 8}px`, zIndex: index + 1 } : undefined}
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

        {showControls ? (
          <div
            className={`absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-white/20 bg-zinc-950/45 shadow-xl shadow-black/30 backdrop-blur-sm transition duration-200 ${isHovered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {readOnly ? null : (
              <>
                <button
                  type="button"
                  aria-label={`Increase ${row.name} quantity`}
                  onClick={() => onAdjustQuantity?.(row, 1)}
                  className="inline-flex size-9 items-center justify-center text-zinc-100 transition hover:bg-white/15"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  aria-label={`Decrease ${row.name} quantity`}
                  onClick={() => onAdjustQuantity?.(row, -1)}
                  disabled={row.currentQuantity === 0 && row.baselineQuantity === 0}
                  className="inline-flex size-9 items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" strokeWidth={2.5} />
                </button>
              </>
            )}
            <button
              type="button"
              aria-label={`${row.name} actions`}
              className="inline-flex size-9 items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15"
            >
              <MoreHorizontal className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
