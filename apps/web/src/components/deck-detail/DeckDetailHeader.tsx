import { Link } from "@tanstack/react-router";
import { Pencil, Save } from "lucide-react";
import type { DeckItem } from "../../lib/deck";

type DeckDetailHeaderProps = {
  deck: DeckItem;
  deckName: string;
  canSave: boolean;
  onOpenActions: () => void;
  onOpenSave: () => void;
};

export function DeckDetailHeader({
  deck,
  deckName,
  canSave,
  onOpenActions,
  onOpenSave,
}: DeckDetailHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          to="/decks"
          className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          Back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{deckName}</h1>
        {deck.saves.length > 0 && (
          <span className="rounded-lg bg-zinc-900 px-2 py-1 text-sm text-zinc-500">
            {deck.saves.length} save{deck.saves.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenActions}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <Pencil className="size-4" strokeWidth={1.75} />
          Edit
        </button>
        <button
          type="button"
          onClick={onOpenSave}
          disabled={!canSave}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="size-4" strokeWidth={1.75} />
          Save
        </button>
      </div>
    </div>
  );
}
