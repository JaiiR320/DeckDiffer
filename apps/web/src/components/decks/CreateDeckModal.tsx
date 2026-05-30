import type { FormEvent } from "react";
import { Button } from "#/components/ui/Button";
import { Input } from "#/components/ui/Input";
import { Modal } from "#/components/ui/Modal";

type CreateDeckModalProps = {
  deckName: string;
  title?: string;
  label?: string;
  placeholder?: string;
  onDeckNameChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CreateDeckModal({
  deckName,
  title = "New Deck",
  label = "Deck name",
  placeholder = "Enter a deck name",
  onDeckNameChange,
  onClose,
  onSubmit,
}: CreateDeckModalProps) {
  return (
    <Modal ariaLabel="Close create deck modal" onClose={onClose}>
      <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
      <form className="mt-5" onSubmit={onSubmit}>
        <label className="block text-sm font-medium text-zinc-400" htmlFor="deck-name">
          {label}
        </label>
        <Input
          id="deck-name"
          value={deckName}
          onChange={(event) => onDeckNameChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 w-full"
        />
        <div className="mt-5 flex justify-end gap-3">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
