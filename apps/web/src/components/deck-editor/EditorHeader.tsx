import { useDragDropMonitor } from "@dnd-kit/react";
import { Download, Import } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { searchCards, type SearchCardResult } from "../../lib/scryfall";
import { StackCard } from "./stack/StackCard";
import type { EditorRow } from "./types";

type EditorHeaderProps = {
  onImport: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  onPreviewCard: (card: SearchCardResult) => void;
};

const SEARCH_RESULTS_IDLE_CLOSE_MS = 10000;

type SearchState = {
  results: SearchCardResult[];
  isSearching: boolean;
  isResultsOpen: boolean;
};

type SearchAction =
  | { type: "clear" }
  | { type: "close" }
  | { type: "open" }
  | { type: "openLoading" }
  | { type: "results"; results: SearchCardResult[] };

function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "clear":
      return { results: [], isSearching: false, isResultsOpen: false };
    case "close":
      return { ...state, isResultsOpen: false };
    case "open":
      return { ...state, isResultsOpen: true };
    case "openLoading":
      return { ...state, isSearching: true, isResultsOpen: true };
    case "results":
      return { ...state, results: action.results, isSearching: false };
  }
}

export function EditorHeader({
  onImport,
  onExport,
  exportDisabled,
  onPreviewCard,
}: EditorHeaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inactivityTimeoutRef = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [isDraggingSearchCard, setIsDraggingSearchCard] = useState(false);
  const [{ results, isSearching, isResultsOpen }, dispatchSearch] = useReducer(searchReducer, {
    results: [],
    isSearching: false,
    isResultsOpen: false,
  });

  function clearInactivityTimer() {
    if (inactivityTimeoutRef.current !== null) {
      window.clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }

  function resetInactivityTimer() {
    clearInactivityTimer();

    inactivityTimeoutRef.current = window.setTimeout(() => {
      dispatchSearch({ type: "close" });
    }, SEARCH_RESULTS_IDLE_CLOSE_MS);
  }

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      dispatchSearch({ type: "clear" });
      clearInactivityTimer();
      return;
    }

    let isCancelled = false;
    dispatchSearch({ type: "openLoading" });
    resetInactivityTimer();

    const timeoutId = window.setTimeout(() => {
      void searchCards(trimmedQuery).then((nextResults) => {
        if (isCancelled) {
          return;
        }

        dispatchSearch({ type: "results", results: nextResults });
      });
    }, 300);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (!isResultsOpen) {
      clearInactivityTimer();
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        dispatchSearch({ type: "close" });
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isResultsOpen]);

  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, []);

  useDragDropMonitor({
    onDragStart(event) {
      if (event.operation.source?.type !== "search-card") {
        return;
      }

      clearInactivityTimer();
      setIsDraggingSearchCard(true);
    },
    onDragEnd(event) {
      if (event.operation.source?.type !== "search-card") {
        return;
      }

      setIsDraggingSearchCard(false);
      dispatchSearch({ type: "close" });
    },
  });

  return (
    <div className="border-b border-zinc-800 p-5">
      <div className="flex items-center gap-3">
        <div
          ref={containerRef}
          className="relative min-w-0 flex-1"
          onMouseEnter={resetInactivityTimer}
          onMouseMove={resetInactivityTimer}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                dispatchSearch({ type: "close" });
                clearInactivityTimer();
              }
            }}
            onFocus={() => {
              if (query.trim().length >= 3) {
                dispatchSearch({ type: "open" });
                resetInactivityTimer();
              }
            }}
            placeholder="Add card"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
          />

          {query.trim().length >= 3 && isResultsOpen ? (
            <div
              className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 ${isDraggingSearchCard ? "pointer-events-none opacity-0" : "opacity-100"}`}
            >
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-zinc-500">Searching cards…</div>
              ) : results.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto p-4">
                  {results.map((card, index) => (
                    <SearchResultCard
                      key={`${card.oracleId}-${card.name}`}
                      card={card}
                      index={index}
                      onPreview={() => {
                        resetInactivityTimer();
                        onPreviewCard(card);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-zinc-500">No cards found.</div>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export
          </button>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <Import className="size-4" strokeWidth={1.75} />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchResultCard({
  card,
  index,
  onPreview,
}: {
  card: SearchCardResult;
  index: number;
  onPreview: () => void;
}) {
  const row: EditorRow = {
    oracleId: card.oracleId,
    name: card.name,
    category: card.categoryId,
    typeLine: card.typeLine,
    manaValue: card.manaValue,
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
    smallImageUrl: card.smallImageUrl,
    imageUrl: card.imageUrl,
    baselineQuantity: 0,
    currentQuantity: 1,
    status: "same",
  };

  return (
    <div onMouseEnter={onPreview} onFocus={onPreview}>
      <StackCard
        row={row}
        index={index}
        isHovered={false}
        isShifted={false}
        onHover={onPreview}
        dragId={`search-card:${card.oracleId}:${card.setCode ?? ""}:${card.collectorNumber ?? ""}`}
        dragType="search-card"
        dragData={{ card }}
        layout="inline"
        readOnly={false}
        showControls={false}
      />
    </div>
  );
}
