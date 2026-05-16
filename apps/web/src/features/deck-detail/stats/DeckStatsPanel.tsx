import { useMemo } from "react";
import { ManaSymbolIcon } from "#/components/cards/ManaSymbolIcon";
import { useDeckWorkspaceView } from "../deckDetailContext";
import { buildDeckStats, MANA_COLORS, type ManaColor, type ManaColorCounts } from "./deckStats";

const MANA_COLOR_LABELS = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
  C: "Colorless",
};

const MANA_COLOR_BACKGROUNDS = {
  W: "#f8f6d8",
  U: "#c1d7e9",
  B: "#cac5c0",
  R: "#e49977",
  G: "#a3c095",
  C: "#cac5c0",
};

export function DeckStatsPanel() {
  const { categories, deck, workingCards } = useDeckWorkspaceView();
  const stats = useMemo(
    () => buildDeckStats(workingCards, categories, deck.colors),
    [categories, deck.colors, workingCards],
  );
  const maxCurveCount = Math.max(...stats.manaCurve.map((bucket) => bucket.count), 1);

  return (
    <div className="space-y-8 p-6">
      <div>
        <p className="text-lg font-semibold text-zinc-100">
          Avg Mana Value: {formatNumber(stats.averageManaValue)}
        </p>
        <p className="text-sm font-medium text-zinc-300">
          Total Mana Value: {formatNumber(stats.totalManaValue)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Based on {stats.spellCardTotal} nonland card{stats.spellCardTotal === 1 ? "" : "s"} in a{" "}
          {stats.deckCardTotal} card deck.
        </p>
      </div>

      <section
        aria-labelledby="mana-curve-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="mana-curve-heading" className="text-sm font-semibold text-zinc-100">
            Mana Curve
          </h2>
          <span className="text-xs text-zinc-500">Nonland spells</span>
        </div>
        <div className="mt-6 grid h-44 grid-cols-9 items-end gap-3 border-b border-zinc-800 bg-[linear-gradient(to_top,rgba(39,39,42,0.45)_1px,transparent_1px)] bg-[size:100%_25%] pb-2">
          {stats.manaCurve.map((bucket) => (
            <div
              key={bucket.label}
              className="flex h-full min-w-0 flex-col items-center justify-end"
            >
              <span className="mb-2 h-4 text-xs font-medium text-zinc-400">
                {bucket.count || ""}
              </span>
              <div
                className="w-full max-w-16 rounded-t-md border border-cyan-300/25 bg-gradient-to-t from-cyan-700 to-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.14)]"
                style={{
                  height: `${Math.max((bucket.count / maxCurveCount) * 82, bucket.count ? 3 : 0)}%`,
                }}
                aria-label={`${bucket.label} mana value: ${bucket.count} cards`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-9 gap-3 text-center text-base font-semibold text-zinc-300">
          {stats.manaCurve.map((bucket) => (
            <span key={bucket.label}>{bucket.label}</span>
          ))}
        </div>
      </section>

      <ManaColorComparison
        rows={[
          { title: "Mana Cost", counts: stats.costColors },
          { title: "Land Production", counts: stats.landProductionColors },
          { title: "All Production", counts: stats.allProductionColors },
        ]}
        visibleColors={getPinnedVisibleColors(deck.colors)}
      />
    </div>
  );
}

function ManaColorComparison({
  rows,
  visibleColors,
}: {
  rows: Array<{ title: string; counts: ManaColorCounts }>;
  visibleColors: readonly ManaColor[];
}) {
  return (
    <section className="rounded-xl border border-zinc-800 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-200">Mana Colors</h2>
        <span className="text-xs text-zinc-500">Cost vs production</span>
      </div>
      <div className="mt-5 space-y-5">
        {rows.map((row) => (
          <ManaColorComparisonRow key={row.title} row={row} visibleColors={visibleColors} />
        ))}
      </div>
      <ManaColorSummary rows={rows} visibleColors={visibleColors} />
    </section>
  );
}

function ManaColorComparisonRow({
  row,
  visibleColors,
}: {
  row: { title: string; counts: ManaColorCounts };
  visibleColors: readonly ManaColor[];
}) {
  const total = visibleColors.reduce((sum, color) => sum + row.counts[color], 0);

  return (
    <div className="grid gap-2 md:grid-cols-[9rem_1fr] md:items-center">
      <div>
        <p className="text-sm font-semibold text-zinc-100">{row.title}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{total} total</p>
      </div>
      <div className="flex h-10 overflow-hidden rounded-full bg-zinc-900 ring-1 ring-zinc-800">
        {visibleColors.map((color) => {
          const count = row.counts[color];
          const percentage = total > 0 ? (count / total) * 100 : 0;
          return count > 0 ? (
            <div
              key={color}
              className="relative flex min-w-8 items-center justify-center border-r-2 border-zinc-950 last:border-r-0"
              style={{ width: `${percentage}%` }}
            >
              <div
                className="absolute inset-0"
                style={{ backgroundColor: MANA_COLOR_BACKGROUNDS[color] }}
              />
              <ManaIcon color={color} />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
}

function ManaColorSummary({
  rows,
  visibleColors,
}: {
  rows: Array<{ title: string; counts: ManaColorCounts }>;
  visibleColors: readonly ManaColor[];
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/70">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3 text-left font-medium">Color</th>
            {rows.map((row) => (
              <th key={row.title} className="px-4 py-3 text-right font-medium">
                {row.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleColors.map((color) => (
            <tr key={color} className="border-b border-zinc-900 last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-zinc-200">
                  <ManaIcon color={color} />
                  <span>{MANA_COLOR_LABELS[color]}</span>
                </div>
              </td>
              {rows.map((row) => {
                const total = visibleColors.reduce(
                  (sum, rowColor) => sum + row.counts[rowColor],
                  0,
                );
                const count = row.counts[color];
                return (
                  <td key={row.title} className="px-4 py-3 text-right text-zinc-300">
                    {count}
                    <span className="ml-2 text-xs text-zinc-500">
                      {total > 0 ? formatPercent((count / total) * 100) : "0.0%"}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getPinnedVisibleColors(deckColors: ManaColor[] | undefined): ManaColor[] {
  return deckColors && deckColors.length > 0 ? [...deckColors, "C"] : [...MANA_COLORS];
}

function ManaIcon({ color }: { color: ManaColor }) {
  return (
    <span className="relative z-10 inline-flex size-6 items-center justify-center rounded-full">
      <ManaSymbolIcon symbol={color} label={MANA_COLOR_LABELS[color]} className="size-6" />
    </span>
  );
}

function formatNumber(value: number) {
  return value.toFixed(2);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
