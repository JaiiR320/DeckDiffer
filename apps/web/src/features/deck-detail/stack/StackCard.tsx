import { useDraggable } from "@dnd-kit/react";
import { Minus, MoreHorizontal, Plus, RotateCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ContextMenu, ContextMenuItem, ContextMenuSubmenuItem } from "#/components/ui/ContextMenu";
import type { DeckTileCover } from "#/lib/deck";
import type { CardCategory, DeckCategory } from "#/lib/decklist";
import type { EditorRow } from "../editor/types";
import { cardLayoutToCssVars, computeCardLayout, type CardLayout } from "./cardLayout";
import { createDeckTileCover } from "./deckTileCover";
import { cardDragId } from "./stackIds";
import { useFallbackCardImage } from "./useFallbackCardImage";

const noCategories: DeckCategory[] = [];

type StackCardProps = {
  row: EditorRow;
  index: number;
  onHover: () => void;
  onAdjustQuantity?: (row: EditorRow, delta: number) => void;
  onCardLayout?: (layout: CardLayout) => void;
  categories?: DeckCategory[];
  onMoveCardCategory?: (row: EditorRow, category: CardCategory) => void;
  onChangePrinting?: (row: EditorRow) => void;
  onSetDeckCover?: (cover: DeckTileCover) => void;
  dragData?: Record<string, unknown>;
  dragId?: string;
  dragType?: "card" | "search-card";
  layout?: "stack" | "inline";
  readOnly: boolean;
  viewState: {
    hovered: boolean;
    shifted: boolean;
    showControls: boolean;
    showEdhrecRank: boolean;
  };
};

export function StackCard({
  row,
  index,
  onHover,
  onAdjustQuantity,
  onCardLayout,
  categories = noCategories,
  onMoveCardCategory,
  onChangePrinting,
  onSetDeckCover,
  dragData,
  dragId,
  dragType = "card",
  layout = "stack",
  readOnly,
  viewState,
}: StackCardProps) {
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [cardLayout, setCardLayout] = useState<CardLayout | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const faceIdentity = `${row.oracleId}:${row.setCode ?? ""}:${row.collectorNumber ?? ""}:${row.name}`;
  const [faceState, setFaceState] = useState({ identity: faceIdentity, index: 0 });
  const faceIndex = faceState.identity === faceIdentity ? faceState.index : 0;
  const isMoveDisabled =
    readOnly || (dragType === "card" && (!onMoveCardCategory || row.currentQuantity <= 0));
  const { isDragging, ref: draggableRef } = useDraggable({
    id: dragId ?? cardDragId(row.oracleId, row.category),
    type: dragType,
    disabled: isMoveDisabled,
    data: dragData ?? { row },
  });
  const { imageUrl: fallbackImageUrl, faces } = useFallbackCardImage(row);
  const hasMultipleFaces = !!faces && faces.length > 1;
  const moveTargetCategories = categories.filter((category) => category.id !== row.category);
  const canMoveCard = !readOnly && !!onMoveCardCategory && row.currentQuantity > 0;
  const displayFaceIndex = hasMultipleFaces ? faceIndex % faces.length : 0;
  const imageUrl = hasMultipleFaces ? faces[displayFaceIndex]?.imageUrl : fallbackImageUrl;
  const imageName = hasMultipleFaces ? (faces[displayFaceIndex]?.name ?? row.name) : row.name;
  const isChanged = row.status !== "same";
  const toneClass =
    row.status === "added"
      ? "ring-emerald-400/40"
      : row.status === "removed"
        ? "ring-rose-400/40 opacity-70"
        : row.status === "changed"
          ? "ring-amber-400/40"
          : "ring-zinc-700/80";

  useEffect(() => () => resizeObserverRef.current?.disconnect(), []);

  const cardStyle = cardLayout ? (cardLayoutToCssVars(cardLayout) as CSSProperties) : undefined;
  const measureCardElement = useCallback(
    (element: HTMLDivElement) => {
      const { height, width } = element.getBoundingClientRect();
      if (height <= 0 || width <= 0) return;

      const nextLayout = computeCardLayout({ height, width });
      setCardLayout((current) => (areCardLayoutsEqual(current, nextLayout) ? current : nextLayout));
      onCardLayout?.(nextLayout);
    },
    [onCardLayout],
  );
  const setCardRef = useCallback(
    (element: HTMLDivElement | null) => {
      draggableRef(element);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (!element) return;

      measureCardElement(element);

      const observer = new ResizeObserver(() => measureCardElement(element));
      observer.observe(element);
      resizeObserverRef.current = observer;
    },
    [draggableRef, measureCardElement],
  );

  return (
    <div
      className={
        layout === "stack"
          ? `pointer-events-none absolute left-3 right-3 select-none overflow-visible transition-transform duration-500 will-change-transform ${viewState.shifted ? "translate-y-[calc(100%_-_var(--stack-card-peek,_0)_+_var(--stack-card-hover-gap,_0))]" : "translate-y-0"}`
          : "pointer-events-none w-36 shrink-0 select-none overflow-visible"
      }
      style={
        layout === "stack"
          ? {
              top: `calc(${index} * var(--stack-card-peek, 0) + var(--stack-card-top-inset, 0))`,
              zIndex: index + 1,
            }
          : undefined
      }
      onFocus={onHover}
    >
      <div
        ref={setCardRef}
        onPointerEnter={onHover}
        style={cardStyle}
        className={`pointer-events-auto relative aspect-[488/680] overflow-hidden rounded-xl bg-zinc-900 shadow-lg shadow-black/30 [container-type:inline-size] ${isChanged ? "ring-2" : "ring-1"} transition-all duration-300 ${isMoveDisabled ? "" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "scale-[1.04] rotate-1 opacity-90 shadow-2xl shadow-cyan-950/50 ring-2 ring-cyan-200" : viewState.hovered ? "ring-cyan-300/70" : ""} ${toneClass}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={row.name}
            draggable={false}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-start justify-center bg-zinc-900 px-3 pt-8 text-center text-sm font-semibold text-zinc-400">
            {row.name}
          </div>
        )}

        <div className="absolute left-0 top-0 rounded-br-lg bg-zinc-950/75 px-[var(--card-badge-padding-x)] py-[var(--card-badge-padding-y)] font-mono text-[length:var(--card-badge-font-size)] font-semibold text-zinc-100 shadow-lg shadow-black/30">
          {row.currentQuantity}
        </div>

        {viewState.showEdhrecRank && row.edhrecRank != null ? (
          <div className="absolute right-0 top-0 rounded-bl-lg bg-zinc-950/75 px-[var(--card-badge-padding-x)] py-[var(--card-badge-padding-y)] font-mono text-[length:var(--card-badge-font-size)] font-semibold text-zinc-100 shadow-lg shadow-black/30">
            #{row.edhrecRank}
          </div>
        ) : null}

        <div className="absolute bottom-0 left-0 rounded-tr-lg bg-zinc-950/75 px-[var(--card-badge-padding-x)] py-[var(--card-badge-padding-y)] font-mono text-[length:var(--card-badge-font-size)] font-semibold text-zinc-100 shadow-lg shadow-black/30">
          {formatPrice(row.priceUsd)}
        </div>

        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent opacity-80" />

        {viewState.showControls ? (
          <div
            className={`absolute right-[var(--card-control-right)] top-[var(--card-control-top)] z-20 flex -translate-y-1/2 flex-col rounded-lg border border-white/20 bg-zinc-950/45 shadow-xl shadow-black/30 backdrop-blur-sm transition duration-200 ${viewState.hovered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {readOnly ? null : (
              <>
                <button
                  type="button"
                  aria-label={`Increase ${row.name} quantity`}
                  onClick={() => onAdjustQuantity?.(row, 1)}
                  className="inline-flex size-[var(--card-control-size)] items-center justify-center text-zinc-100 transition hover:bg-white/15"
                >
                  <Plus className="size-[var(--card-control-icon-size)]" strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  aria-label={`Decrease ${row.name} quantity`}
                  onClick={() => onAdjustQuantity?.(row, -1)}
                  disabled={row.currentQuantity === 0 && row.baselineQuantity === 0}
                  className="inline-flex size-[var(--card-control-size)] items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-[var(--card-control-icon-size)]" strokeWidth={2.5} />
                </button>
              </>
            )}
            {hasMultipleFaces ? (
              <button
                type="button"
                aria-label={`Flip ${row.name}`}
                title="Flip card"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setFaceState((current) => ({
                    identity: faceIdentity,
                    index:
                      (current.identity === faceIdentity ? current.index + 1 : 1) % faces.length,
                  }));
                }}
                className="inline-flex size-[var(--card-control-size)] items-center justify-center border-t border-white/20 text-zinc-100 transition hover:bg-white/15"
              >
                <RotateCw className="size-[var(--card-control-icon-size)]" strokeWidth={2.5} />
              </button>
            ) : null}
            <div className="border-t border-white/20">
              <button
                ref={menuButtonRef}
                type="button"
                aria-label={`${row.name} actions`}
                disabled={!onChangePrinting && (!onSetDeckCover || !imageUrl)}
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen((current) => !current);
                }}
                className="inline-flex size-[var(--card-control-size)] items-center justify-center text-zinc-100 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MoreHorizontal
                  className="size-[var(--card-control-icon-size)]"
                  strokeWidth={2.5}
                />
              </button>
              {isMenuOpen ? (
                <ContextMenu
                  open={isMenuOpen}
                  onOpenChange={setIsMenuOpen}
                  anchorRef={menuButtonRef}
                  placement="left-start"
                  widthClassName="w-44"
                >
                  {imageUrl && onSetDeckCover ? (
                    <ContextMenuItem
                      onSelect={() => {
                        setIsMenuOpen(false);
                        onSetDeckCover(createDeckTileCover(row, imageUrl, imageName));
                      }}
                    >
                      Use as deck cover
                    </ContextMenuItem>
                  ) : null}
                  {onChangePrinting ? (
                    <ContextMenuItem
                      onSelect={() => {
                        setIsMenuOpen(false);
                        onChangePrinting(row);
                      }}
                    >
                      Change printing
                    </ContextMenuItem>
                  ) : null}
                  {moveTargetCategories.length > 0 ? (
                    <ContextMenuSubmenuItem
                      disabled={!canMoveCard}
                      title={canMoveCard ? "Move to category" : "Card cannot be moved"}
                      submenu={moveTargetCategories.map((category) => (
                        <ContextMenuItem
                          key={category.id}
                          onSelect={() => {
                            setIsMenuOpen(false);
                            onMoveCardCategory?.(row, category.id);
                          }}
                        >
                          {category.name}
                        </ContextMenuItem>
                      ))}
                    >
                      Move to
                    </ContextMenuSubmenuItem>
                  ) : null}
                </ContextMenu>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatPrice(price: number | undefined) {
  return price === undefined ? "--" : `$${price.toFixed(2)}`;
}

function areCardLayoutsEqual(left: CardLayout | null, right: CardLayout) {
  return (
    left !== null &&
    left.badgeFontSize === right.badgeFontSize &&
    left.badgePaddingX === right.badgePaddingX &&
    left.badgePaddingY === right.badgePaddingY &&
    left.controlIconSize === right.controlIconSize &&
    left.controlRight === right.controlRight &&
    left.controlSize === right.controlSize &&
    left.controlTop === right.controlTop &&
    left.stackHoverGap === right.stackHoverGap &&
    left.stackPeek === right.stackPeek &&
    left.stackTopInset === right.stackTopInset
  );
}
