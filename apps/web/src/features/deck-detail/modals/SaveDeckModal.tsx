import type { FormEvent } from "react";
import { Button } from "#/components/ui/Button";
import { Input } from "#/components/ui/Input";
import { Modal } from "#/components/ui/Modal";

type SaveDeckModalProps = {
  defaultLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string) => void;
};

export function SaveDeckModal({ defaultLabel, isOpen, onClose, onSave }: SaveDeckModalProps) {
  if (!isOpen) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const label = String(formData.get("label") ?? "");
    const trimmed = label.trim();
    onSave(trimmed || defaultLabel);
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal ariaLabel="Close save deck modal" onClose={handleClose}>
      <h2 className="text-xl font-semibold text-zinc-100">Save Deck</h2>
      <p className="mt-2 text-sm text-zinc-400">Create a snapshot of your current deck state.</p>

      <form className="mt-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-zinc-400" htmlFor="save-label">
          Save label (optional)
        </label>
        <Input
          id="save-label"
          name="label"
          defaultValue={defaultLabel}
          placeholder={defaultLabel}
          className="mt-2 w-full"
        />

        <div className="mt-5 flex justify-end gap-3">
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
