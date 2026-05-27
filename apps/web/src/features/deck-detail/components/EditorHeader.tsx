import { useDragDropMonitor } from "@dnd-kit/react";
import { ArrowDown, ArrowUp, Download, Import, Redo2, Undo2 } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button } from "#/components/ui/Button";
import { DropdownSelect } from "#/components/ui/DropdownSelect";
import { IconButton } from "#/components/ui/IconButton";
import { Input } from "#/components/ui/Input";
import type { DeckCardSort, DeckCardSortDirection } from "#/lib/deck";
import { searchCards, type SearchCardResult } from "#/lib/scryfall";
import type { EditorRow } from "../editor/types";
import { CARD_GROUP_VIEW_OPTIONS, type CardGroupView } from "../stack/cardGroupView";
import { StackCard } from "../stack/StackCard";

type EditorHeaderProps = {
  onImport: () => void;
  onExport: () => void;
  exportDisabled: boolean;
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onUndo: () => void;
  cardSort: DeckCardSort;
  cardSortDirection: DeckCardSortDirection;
  cardGroupView: CardGroupView;
  onCardSortChange: (sort: DeckCardSort) => void;
  onCardGroupViewChange: (groupView: CardGroupView) => void;
  onReverseCardSortDirection: () => void;
  onPreviewCard: (card: SearchCardResult) => void;
};

const SEARCH_RESULTS_IDLE_CLOSE_MS = 10000;
const CARD_SORT_OPTIONS = [
  { value: "manaValue", label: "Mana value" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "price", label: "Price" },
  { value: "edhrecRank", label: "EDHREC rank" },
] satisfies Array<{ value: DeckCardSort; label: string }>;

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
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  cardSort,
  cardSortDirection,
  cardGroupView,
  onCardSortChange,
  onCardGroupViewChange,
  onReverseCardSortDirection,
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
          <Input
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
            inputSize="sm"
            className="w-full py-2.5"
          />

          {query.trim().length >= 3 && isResultsOpen ? (
            <div
              className={`absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[1000] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 ${isDraggingSearchCard ? "pointer-events-none opacity-0" : "opacity-100"}`}
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

        <ToolbarDivider />
        <div className="flex shrink-0 items-center gap-2">
          <DropdownSelect
            value={cardGroupView}
            options={CARD_GROUP_VIEW_OPTIONS}
            onChange={onCardGroupViewChange}
            aria-label="Group cards"
            className="w-40"
          />
          <ToolbarDivider />
          <DropdownSelect
            value={cardSort}
            options={CARD_SORT_OPTIONS}
            onChange={onCardSortChange}
            aria-label="Sort cards"
            className="w-44"
          />
          <IconButton
            onClick={onReverseCardSortDirection}
            title={`Reverse to ${cardSortDirection === "asc" ? "descending" : "ascending"}`}
            aria-label="Reverse card sort direction"
          >
            {cardSortDirection === "asc" ? (
              <ArrowUp className="size-4" strokeWidth={1.75} />
            ) : (
              <ArrowDown className="size-4" strokeWidth={1.75} />
            )}
          </IconButton>
          <ToolbarDivider />
          <IconButton onClick={onUndo} disabled={!canUndo} title="Undo" aria-label="Undo">
            <Undo2 className="size-4" strokeWidth={1.75} />
          </IconButton>
          <IconButton onClick={onRedo} disabled={!canRedo} title="Redo" aria-label="Redo">
            <Redo2 className="size-4" strokeWidth={1.75} />
          </IconButton>
          <ToolbarDivider />
          <Button onClick={onExport} disabled={exportDisabled} size="sm">
            <Download className="size-4" strokeWidth={1.75} />
            Export
          </Button>
          <Button onClick={onImport} size="sm">
            <Import className="size-4" strokeWidth={1.75} />
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <div aria-hidden="true" className="mx-1 h-10 border-l border-zinc-800" />;
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
    manaCost: card.manaCost,
    manaValue: card.manaValue,
    producedMana: card.producedMana,
    setCode: card.setCode,
    collectorNumber: card.collectorNumber,
    smallImageUrl: card.smallImageUrl,
    imageUrl: card.imageUrl,
    edhrecRank: card.edhrecRank,
    baselineQuantity: 0,
    currentQuantity: 1,
    status: "same",
  };

  return (
    <div onMouseEnter={onPreview} onFocus={onPreview}>
      <StackCard
        row={row}
        index={index}
        onHover={onPreview}
        dragId={`search-card:${card.oracleId}:${card.setCode ?? ""}:${card.collectorNumber ?? ""}`}
        dragType="search-card"
        dragData={{ card }}
        layout="inline"
        readOnly={false}
        viewState={{
          hovered: false,
          shifted: false,
          showControls: false,
          showEdhrecRank: false,
        }}
      />
    </div>
  );
}
