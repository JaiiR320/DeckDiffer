import { Minus, MoreHorizontal, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { CARD_CATEGORIES, type CardCategory } from "../../lib/decklist";
import { getCardPreview } from "../../lib/scryfall";
import type { EditorRow } from "./types";

type EditorDeckStackProps = {
  groupedRows: Record<CardCategory, EditorRow[]>;
  resultCardTotal: number;
  showDiffOnly: boolean;
  columnCount: number;
  onToggleShowDiffOnly: () => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  readOnly?: boolean;
};

export function EditorDeckStack({
  groupedRows,
  resultCardTotal,
  showDiffOnly,
  columnCount,
  onToggleShowDiffOnly,
  onAdjustQuantity,
  readOnly = false,
}: EditorDeckStackProps) {
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

      <div
        className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(var(--stack-columns),minmax(0,1fr))]"
        style={{ "--stack-columns": columnCount } as CSSProperties}
      >
        {CARD_CATEGORIES.map((category) => (
          <CategoryStack
            key={category}
            category={category}
            rows={visibleGroupedRows[category]}
            onAdjustQuantity={onAdjustQuantity}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

type CategoryStackProps = {
  category: CardCategory;
  rows: EditorRow[];
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  readOnly: boolean;
};

function CategoryStack({ category, rows, onAdjustQuantity, readOnly }: CategoryStackProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const lastCardOffset = Math.max(0, rows.length - 1) * 36;
  const totalQuantity = rows.reduce((sum, row) => sum + row.currentQuantity, 0);
  const addedCount = rows.filter((row) => row.status === "added").length;
  const changedCount = rows.filter((row) => row.status === "changed").length;
  const removedCount = rows.filter((row) => row.status === "removed").length;

  return (
    <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
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

      {rows.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center bg-zinc-900/40 px-5 text-center text-sm font-semibold text-zinc-500">
          Empty stack
        </div>
      ) : (
        <div
          className="relative min-h-64 overflow-hidden px-3 pb-3 pt-2"
          onPointerLeave={() => setHoveredIndex(null)}
        >
          {rows.map((row, index) => (
            <StackCard
              key={row.oracleId}
              row={row}
              index={index}
              isHovered={hoveredIndex === index}
              isShifted={hoveredIndex !== null && index > hoveredIndex}
              onHover={() => setHoveredIndex(index)}
              onAdjustQuantity={onAdjustQuantity}
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
  readOnly: boolean;
};

function StackCard({
  row,
  index,
  isHovered,
  isShifted,
  onHover,
  onAdjustQuantity,
  readOnly,
}: StackCardProps) {
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
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
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 h-9"
        onPointerEnter={onHover}
      />
      <div
        className={`relative aspect-[488/680] overflow-hidden rounded-xl bg-zinc-900 shadow-lg shadow-black/30 ring-1 transition-all duration-300 ${isHovered ? "ring-cyan-300/70" : ""} ${toneClass}`}
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
