import type { CardPreviewResult } from '../../lib/scryfall'

type CardPreviewPanelProps = {
  preview: CardPreviewResult | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  requestedName?: string | null
}

export function CardPreviewPanel({ preview, status, requestedName }: CardPreviewPanelProps) {
  const hasPreview = preview !== null

  return (
    <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] lg:sticky lg:top-5">
      {hasPreview ? (
        <>
          <img
            src={preview.imageUrl}
            alt={preview.name}
            className="block w-full rounded-xl border border-zinc-800 bg-zinc-900"
          />

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-100">{preview.name}</h2>
                {preview.manaCost ? (
                  <span className="shrink-0 text-xs font-medium text-cyan-300">{preview.manaCost}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{preview.typeLine}</p>
              {preview.setCode ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
                  {preview.setCode}
                  {preview.collectorNumber ? ` · ${preview.collectorNumber}` : ''}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm leading-6 whitespace-pre-line text-zinc-300">
              {preview.oracleText || 'No oracle text available.'}
            </div>

            {status === 'loading' ? <p className="text-xs text-zinc-500">Updating preview...</p> : null}
          </div>
        </>
      ) : (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 px-5 text-center">
          <p className="max-w-[18rem] text-sm leading-6 text-zinc-500">
            {status === 'loading' && requestedName
              ? `Loading ${requestedName}...`
              : status === 'error' && requestedName
                ? `Could not load ${requestedName}.`
                : 'Hover a card in the deck list or search results to pin its preview here.'}
          </p>
        </div>
      )}
    </aside>
  )
}
