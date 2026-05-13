import type { FormEvent } from "react";
import { X } from "lucide-react";
import { Button } from "#/components/ui/Button";
import { IconButton } from "#/components/ui/IconButton";
import { Modal } from "#/components/ui/Modal";
import { Textarea } from "#/components/ui/Textarea";

type ImportDeckModalProps = {
  hasCards: boolean;
  draftDeck: string;
  onDraftDeckChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOverride?: () => void;
};

export function ImportDeckModal({
  hasCards,
  draftDeck,
  onDraftDeckChange,
  onClose,
  onSubmit,
  onOverride,
}: ImportDeckModalProps) {
  return (
    <Modal ariaLabel="Close import modal" maxWidth="2xl" onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Import Deck</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {hasCards
              ? "Bulk add to your deck, or override it with the pasted list."
              : "Paste the baseline deck list."}
          </p>
        </div>
        <IconButton variant="ghost" onClick={onClose} className="p-2 text-zinc-500">
          <X className="size-5" />
        </IconButton>
      </div>

      <form className="mt-5" onSubmit={onSubmit}>
        <Textarea
          spellCheck={false}
          value={draftDeck}
          onChange={(event) => onDraftDeckChange(event.target.value)}
          placeholder="Paste a deck list here"
          className="min-h-80 w-full resize-y"
        />

        <div className="mt-5 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          {hasCards ? (
            <>
              <Button onClick={onOverride} disabled={!draftDeck.trim()} className="border-zinc-700">
                Override
              </Button>
              <Button type="submit" variant="primary" disabled={!draftDeck.trim()}>
                Bulk Add
              </Button>
            </>
          ) : (
            <Button type="submit" variant="primary" disabled={!draftDeck.trim()}>
              Validate Import
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
