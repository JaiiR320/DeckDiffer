import { Link } from "@tanstack/react-router";
import { Layers, MoreVertical } from "lucide-react";
import { IconButton } from "#/components/ui/IconButton";
import type { DeckItem, DeckTileCover } from "../../lib/deck";

type DeckCardProps = {
  deck: DeckItem;
  onEdit: (deck: DeckItem) => void;
};

export function DeckCard({ deck, onEdit }: DeckCardProps) {
  const editButton = (
    <IconButton
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(deck);
      }}
      aria-label={`Edit ${deck.name}`}
      variant="ghost"
      className="absolute right-6 top-6 z-20 cursor-pointer p-2 opacity-0 group-hover:opacity-100"
    >
      <MoreVertical className="size-5" strokeWidth={1.75} />
    </IconButton>
  );

  if (deck.cover) {
    return (
      <div className="group relative flex min-h-48 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-left transition hover:border-zinc-700">
        <CoverImage cover={deck.cover} />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/85 to-transparent" />
        <div className="pointer-events-none relative z-10 flex min-h-48 flex-col justify-between px-7 py-6 pr-16">
          <span className="text-3xl font-semibold tracking-tight text-zinc-100 drop-shadow-lg">
            {deck.name}
          </span>
          <p className="mt-2 text-lg text-zinc-300 drop-shadow-lg">
            {deck.saves.length} snapshot{deck.saves.length === 1 ? "" : "s"}
          </p>
        </div>

        <Link
          to="/decks/$deckId"
          params={{ deckId: deck.id }}
          className="absolute inset-0 z-10 rounded-2xl"
          aria-label={`Open ${deck.name}`}
        />

        <IconButton
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(deck);
          }}
          aria-label={`Edit ${deck.name}`}
          variant="ghost"
          className="absolute right-6 top-6 z-20 cursor-pointer bg-black/35 p-2 text-zinc-100 backdrop-blur-sm hover:bg-black/50"
        >
          <MoreVertical className="size-5" strokeWidth={1.75} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="group relative flex min-h-48 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 px-7 py-6 text-left transition hover:border-zinc-700">
      {/* Content - sits below the Link */}
      <div className="pointer-events-none">
        <Layers className="size-8 text-cyan-300" strokeWidth={1.75} />
      </div>

      <div className="pointer-events-none mt-8">
        <span className="text-3xl font-semibold tracking-tight text-zinc-100">{deck.name}</span>
        <p className="mt-2 text-lg text-zinc-500">
          {deck.saves.length} snapshot{deck.saves.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Link covers the whole card but allows clicks to pass through to interactive children via pointer-events */}
      <Link
        to="/decks/$deckId"
        params={{ deckId: deck.id }}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${deck.name}`}
      />

      {/* Edit button - positioned outside content, after Link in DOM so it's on top */}
      {editButton}
    </div>
  );
}

function CoverImage({ cover }: { cover: DeckTileCover }) {
  if (cover.kind === "split") {
    return (
      <div className="absolute inset-0 opacity-85">
        <div className="absolute inset-0 overflow-hidden [clip-path:polygon(0_0,57%_0,43%_100%,0_100%)]">
          <img
            src={cover.cards[0].imageUrl}
            alt={cover.cards[0].name}
            className="absolute inset-y-0 -left-[22%] h-full w-full scale-[1.55] object-cover object-[50%_10%]"
            loading="lazy"
          />
        </div>
        <div className="absolute inset-0 overflow-hidden [clip-path:polygon(57%_0,100%_0,100%_100%,43%_100%)]">
          <img
            src={cover.cards[1].imageUrl}
            alt={cover.cards[1].name}
            className="absolute inset-y-0 -right-[22%] h-full w-full scale-[1.55] object-cover object-[50%_10%]"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <img
      src={cover.imageUrl}
      alt={cover.name}
      className="absolute inset-0 h-full w-full scale-[1.55] object-cover object-[50%_10%] opacity-85"
      loading="lazy"
    />
  );
}
