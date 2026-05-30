import { Save, Settings } from "lucide-react";
import { Button } from "#/components/ui/Button";
import type { DeckItem } from "#/lib/deck";

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
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{deckName}</h1>
        {deck.saves.length > 0 && (
          <span className="rounded-lg bg-zinc-900 px-2 py-1 text-sm text-zinc-500">
            {deck.saves.length} snapshot{deck.saves.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={onOpenActions}>
          <Settings className="size-4" strokeWidth={1.75} />
          Settings
        </Button>
        <Button
          onClick={onOpenSave}
          disabled={!canSave}
          variant="primary"
          className="disabled:opacity-50"
        >
          <Save className="size-4" strokeWidth={1.75} />
          Save
        </Button>
      </div>
    </div>
  );
}
