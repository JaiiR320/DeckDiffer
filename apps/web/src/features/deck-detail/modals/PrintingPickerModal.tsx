import { X } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { DropdownSelect } from "#/components/ui/DropdownSelect";
import { getCardPrintings, type CardPrintingOption } from "#/lib/scryfall";
import type { EditorRow } from "../editor/types";

type PrintingSort = "date" | "set" | "price";

const PRINTING_SORT_OPTIONS = [
  { value: "date", label: "Edition date" },
  { value: "set", label: "Set Name" },
  { value: "price", label: "Price" },
] satisfies Array<{ value: PrintingSort; label: string }>;

type PrintingPickerModalProps = {
  row: EditorRow;
  onClose: () => void;
  onSelect: (printing: CardPrintingOption) => void;
};

type PrintingsState = {
  oracleId: string;
  printings: CardPrintingOption[];
  status: "loading" | "ready" | "error";
};

export function PrintingPickerModal({ row, onClose, onSelect }: PrintingPickerModalProps) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<PrintingSort>("date");
  const [printingsState, setPrintingsState] = useReducer(
    (current: PrintingsState, next: Partial<PrintingsState>) => ({ ...current, ...next }),
    { oracleId: "", printings: [], status: "loading" },
  );
  const isCurrentRowLoaded = printingsState.oracleId === row.oracleId;
  const printings = isCurrentRowLoaded ? printingsState.printings : [];
  const status = isCurrentRowLoaded ? printingsState.status : "loading";

  useEffect(() => {
    let isCurrent = true;
    getCardPrintings(row.oracleId)
      .then((nextPrintings) => ({ printings: nextPrintings, status: "ready" as const }))
      .catch(() => ({ printings: [], status: "error" as const }))
      .then((nextState) => {
        if (isCurrent) setPrintingsState({ oracleId: row.oracleId, ...nextState });
      });

    return () => {
      isCurrent = false;
    };
  }, [row.oracleId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const visiblePrintings = sortPrintings(
    printings.filter((printing) =>
      printing.setName.toLowerCase().includes(filter.trim().toLowerCase()),
    ),
    sort,
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/80 px-4 py-5 backdrop-blur-sm sm:px-6">
      <button
        type="button"
        aria-label="Close printing picker"
        className="fixed inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-zinc-100">Select a printing</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,360px)_170px]">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-200">Search printings…</span>
                <input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter set name"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-cyan-500"
                />
              </label>
              <div>
                <span className="text-sm font-semibold text-zinc-200">Order by</span>
                <DropdownSelect
                  value={sort}
                  options={PRINTING_SORT_OPTIONS}
                  onChange={setSort}
                  aria-label="Order printings by"
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {status === "loading" ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-sm font-semibold text-zinc-400">
            Loading printings…
          </div>
        ) : status === "error" ? (
          <div className="rounded-2xl border border-rose-900/70 bg-rose-950/30 p-8 text-center text-sm font-semibold text-rose-200">
            Could not load printings from Scryfall.
          </div>
        ) : visiblePrintings.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 text-center text-sm font-semibold text-zinc-400">
            No printings match that set name.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {visiblePrintings.map((printing) => {
              const isSelected =
                row.setCode === printing.setCode &&
                row.collectorNumber === printing.collectorNumber;
              return (
                <button
                  key={printing.scryfallId}
                  type="button"
                  onClick={() => onSelect(printing)}
                  className="group min-w-0 text-left"
                >
                  <div
                    className={`relative overflow-hidden rounded-xl bg-zinc-950 shadow-xl shadow-black/30 transition group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-cyan-300/80 ${isSelected ? "ring-2 ring-cyan-300" : "ring-1 ring-zinc-700"}`}
                  >
                    {isSelected ? (
                      <div className="absolute inset-x-3 top-3 z-10 rounded-full border border-cyan-200/60 bg-cyan-400/95 py-1 text-center text-xs font-bold uppercase tracking-[0.08em] text-cyan-950 shadow-lg shadow-black/30">
                        Selected printing
                      </div>
                    ) : null}
                    <div className="aspect-[488/680] bg-zinc-900">
                      {printing.imageUrl ? (
                        <img
                          src={printing.imageUrl}
                          alt={`${printing.name} ${printing.setCode}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-start justify-center px-3 pt-8 text-center text-sm font-semibold text-zinc-500">
                          {printing.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 px-1 text-sm text-zinc-200">
                    <span className="truncate font-semibold">{printing.setCode}</span>
                    <span>{formatPrice(printing.priceUsd)}</span>
                  </div>
                  <p className="mt-1 truncate px-1 text-xs text-zinc-500">
                    {printing.setName} · {printing.releasedAt || "Unknown date"}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function sortPrintings(printings: CardPrintingOption[], sort: PrintingSort) {
  return printings.slice().sort((left, right) => {
    if (sort === "set") {
      return (
        left.setName.localeCompare(right.setName) ||
        left.collectorNumber.localeCompare(right.collectorNumber)
      );
    }

    if (sort === "price") {
      const leftPrice = left.priceUsd ?? Number.POSITIVE_INFINITY;
      const rightPrice = right.priceUsd ?? Number.POSITIVE_INFINITY;
      return leftPrice - rightPrice || right.releasedAt.localeCompare(left.releasedAt);
    }

    return (
      right.releasedAt.localeCompare(left.releasedAt) || left.setName.localeCompare(right.setName)
    );
  });
}

function formatPrice(price: number | undefined) {
  return price === undefined ? "--" : `$${price.toFixed(2)}`;
}
