type LegacyImportModalProps = {
  isOpen: boolean
  isImporting: boolean
  deckCount: number
  errorMessage: string | null
  onClose: () => void
  onImport: () => void
}

export function LegacyImportModal({
  isOpen,
  isImporting,
  deckCount,
  errorMessage,
  onClose,
  onImport,
}: LegacyImportModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <button type="button" aria-label="Close import modal" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
        <h2 className="text-xl font-semibold text-zinc-100">Import local decks?</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          We found {deckCount} deck{deckCount === 1 ? '' : 's'} saved in this browser. Importing will add them
          to your account and delete the old local browser storage after the import finishes.
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onImport}
            disabled={isImporting}
            className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? 'Importing...' : 'Import decks'}
          </button>
        </div>
      </div>
    </div>
  )
}
