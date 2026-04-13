import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Download, Import, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CARD_CATEGORIES,
  type CardCategory,
  type InvalidDeckCard,
  type ValidatedDeckCard,
  formatDeckExport,
  groupValidatedCards,
  mergeValidatedCards,
  parseDecklist,
} from '../lib/decklist'
import { formatFolderName, getFolderById } from '../lib/folders'
import { searchCards, type SearchCardResult, validateDeckEntries } from '../lib/scryfall'

export const Route = createFileRoute('/folders/$folderId')({
  component: FolderDetailPage,
})

type ImportTarget = 'left' | 'middle'

type BaseDeckState = {
  rawText: string
  cards: ValidatedDeckCard[]
  invalidCards: InvalidDeckCard[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage: string | null
}

type MigrationCard = {
  oracleId: string
  name: string
  delta: number
  typeLine: string
  category: CardCategory
}

type ChangeDeckState = {
  rawText: string
  changes: MigrationCard[]
  invalidCards: InvalidDeckCard[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage: string | null
}

const emptyBaseDeckState: BaseDeckState = {
  rawText: '',
  cards: [],
  invalidCards: [],
  status: 'idle',
  errorMessage: null,
}

const emptyChangeDeckState: ChangeDeckState = {
  rawText: '',
  changes: [],
  invalidCards: [],
  status: 'idle',
  errorMessage: null,
}

function mergeMigrationCards(changes: MigrationCard[]) {
  const mergedChanges = new Map<string, MigrationCard>()

  for (const change of changes) {
    const existingChange = mergedChanges.get(change.oracleId)

    if (existingChange) {
      existingChange.delta += change.delta
      continue
    }

    mergedChanges.set(change.oracleId, { ...change })
  }

  return [...mergedChanges.values()]
    .filter((change) => change.delta !== 0)
    .sort((left, right) => {
      const categoryCompare = CARD_CATEGORIES.indexOf(left.category) - CARD_CATEGORIES.indexOf(right.category)
      if (categoryCompare !== 0) {
        return categoryCompare
      }

      return left.name.localeCompare(right.name)
    })
}

function applyChange(changes: MigrationCard[], nextChange: MigrationCard) {
  return mergeMigrationCards([...changes, nextChange])
}

function buildResultDeck(baseCards: ValidatedDeckCard[], changes: MigrationCard[]) {
  const mergedBaseCards = mergeValidatedCards(baseCards)
  const resultMap = new Map(mergedBaseCards.map((card) => [card.oracleId, { ...card }]))

  for (const change of mergeMigrationCards(changes)) {
    const existingCard = resultMap.get(change.oracleId)

    if (!existingCard) {
      if (change.delta > 0) {
        resultMap.set(change.oracleId, {
          oracleId: change.oracleId,
          name: change.name,
          quantity: change.delta,
          typeLine: change.typeLine,
          category: change.category,
        })
      }
      continue
    }

    existingCard.quantity += change.delta
    if (existingCard.quantity <= 0) {
      resultMap.delete(change.oracleId)
    }
  }

  return [...resultMap.values()].sort((left, right) => {
    const categoryCompare = CARD_CATEGORIES.indexOf(left.category) - CARD_CATEGORIES.indexOf(right.category)
    if (categoryCompare !== 0) {
      return categoryCompare
    }

    return left.name.localeCompare(right.name)
  })
}

function formatChangesExport(changes: MigrationCard[]) {
  const groupedChanges = groupMigrationCards(changes)

  return CARD_CATEGORIES.flatMap((category) => {
    const categoryChanges = groupedChanges[category]
    if (categoryChanges.length === 0) {
      return []
    }

    return [
      category,
      ...categoryChanges.map((change) => `${change.delta > 0 ? '+' : ''}${change.delta} ${change.name}`),
      '',
    ]
  })
    .join('\n')
    .trim()
}

function groupMigrationCards(changes: MigrationCard[]) {
  const groupedChanges: Record<CardCategory, MigrationCard[]> = {
    Land: [],
    Creature: [],
    Artifact: [],
    Enchantment: [],
    Instant: [],
    Sorcery: [],
    Planeswalker: [],
    Battle: [],
    Other: [],
  }

  for (const change of mergeMigrationCards(changes)) {
    groupedChanges[change.category].push(change)
  }

  for (const category of CARD_CATEGORIES) {
    groupedChanges[category].sort((left, right) => left.name.localeCompare(right.name))
  }

  return groupedChanges
}

function FolderDetailPage() {
  const { folderId } = Route.useParams()
  const folder = getFolderById(folderId)
  const folderName = folder?.name ?? formatFolderName(folderId)
  const [leftDeck, setLeftDeck] = useState<BaseDeckState>(emptyBaseDeckState)
  const [middleDeck, setMiddleDeck] = useState<ChangeDeckState>(emptyChangeDeckState)
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null)
  const [draftDeck, setDraftDeck] = useState('')

  const middleChanges = mergeMigrationCards(middleDeck.changes)
  const resultDeck = buildResultDeck(leftDeck.cards, middleChanges)

  function openImportModal(target: ImportTarget) {
    setImportTarget(target)
    setDraftDeck(target === 'left' ? leftDeck.rawText : middleDeck.rawText)
  }

  function closeImportModal() {
    setImportTarget(null)
    setDraftDeck('')
  }

  async function handleImportDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!importTarget) {
      return
    }

    const rawText = draftDeck.trim()
    const { entries, errors } = parseDecklist(rawText)
    closeImportModal()

    if (importTarget === 'left') {
      setLeftDeck((currentDeck) => ({
        ...currentDeck,
        rawText,
        status: 'loading',
        invalidCards: [],
        errorMessage: null,
      }))
    } else {
      setMiddleDeck((currentDeck) => ({
        ...currentDeck,
        rawText,
        status: 'loading',
        invalidCards: [],
        errorMessage: null,
      }))
    }

    try {
      const { validCards, invalidCards } = await validateDeckEntries(entries)
      const importWarnings = [
        ...errors.map((error) => ({
          lineNumber: error.lineNumber,
          quantity: 0,
          name: error.text,
          reason: error.reason,
        })),
        ...invalidCards,
      ]

      if (importTarget === 'left') {
        setLeftDeck({
          rawText,
          cards: validCards,
          invalidCards: importWarnings,
          status: 'ready',
          errorMessage: null,
        })
        return
      }

      setMiddleDeck({
        rawText,
        changes: mergeMigrationCards(
          validCards.map((card) => ({
            oracleId: card.oracleId,
            name: card.name,
            delta: card.quantity,
            typeLine: card.typeLine,
            category: card.category,
          })),
        ),
        invalidCards: importWarnings,
        status: 'ready',
        errorMessage: null,
      })
    } catch (error) {
      if (importTarget === 'left') {
        setLeftDeck({
          rawText,
          cards: [],
          invalidCards: [],
          status: 'error',
          errorMessage:
            error instanceof Error ? error.message : 'Could not import this deck right now.',
        })
        return
      }

      setMiddleDeck({
        rawText,
        changes: [],
        invalidCards: [],
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Could not import these changes right now.',
      })
    }
  }

  function dismissWarnings(target: ImportTarget) {
    if (target === 'left') {
      setLeftDeck((currentDeck) => ({
        ...currentDeck,
        invalidCards: [],
      }))
      return
    }

    setMiddleDeck((currentDeck) => ({
      ...currentDeck,
      invalidCards: [],
    }))
  }

  function handleAddCard(target: ImportTarget, card: SearchCardResult) {
    if (target === 'left') {
      setLeftDeck((currentDeck) => ({
        ...currentDeck,
        cards: [
          ...currentDeck.cards,
          {
            oracleId: card.oracleId,
            name: card.name,
            quantity: 1,
            typeLine: card.typeLine,
            category: card.category,
          },
        ],
        status: 'ready',
        errorMessage: null,
      }))
      return
    }

    setMiddleDeck((currentDeck) => ({
      ...currentDeck,
      changes: applyChange(currentDeck.changes, {
        oracleId: card.oracleId,
        name: card.name,
        delta: 1,
        typeLine: card.typeLine,
        category: card.category,
      }),
      status: 'ready',
      errorMessage: null,
    }))
  }

  function toggleRemoval(card: ValidatedDeckCard) {
    setMiddleDeck((currentDeck) => {
      const existingChange = mergeMigrationCards(currentDeck.changes).find(
        (change) => change.oracleId === card.oracleId,
      )
      const delta = existingChange && existingChange.delta < 0 ? card.quantity : -card.quantity

      return {
        ...currentDeck,
        changes: applyChange(currentDeck.changes, {
          oracleId: card.oracleId,
          name: card.name,
          delta,
          typeLine: card.typeLine,
          category: card.category,
        }),
        status: 'ready',
        errorMessage: null,
      }
    })
  }

  function removeChange(oracleId: string) {
    setMiddleDeck((currentDeck) => ({
      ...currentDeck,
      changes: currentDeck.changes.filter((change) => change.oracleId !== oracleId),
    }))
  }

  function handleExport(target: 'left' | 'middle' | 'right') {
    let content = ''
    let suffix = ''

    if (target === 'left') {
      content = formatDeckExport(leftDeck.cards)
      suffix = 'original'
    } else if (target === 'middle') {
      content = formatChangesExport(middleChanges)
      suffix = 'changes'
    } else {
      content = formatDeckExport(resultDeck)
      suffix = 'result'
    }

    if (!content) {
      return
    }

    const file = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${folderName.toLowerCase().replace(/\s+/g, '-')}-${suffix}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const originalGroupedCards = groupValidatedCards(leftDeck.cards)
  const changeGroupedCards = groupMigrationCards(middleChanges)
  const resultGroupedCards = groupValidatedCards(resultDeck)

  return (
    <>
      <main className="mx-auto min-h-screen w-full max-w-[1600px] px-8 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            to="/"
            className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
          >
            Back
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">{folderName}</h1>
        </div>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <DeckColumnHeader
              title="Original Deck"
              statusText={
                leftDeck.status === 'loading'
                  ? 'Validating deck...'
                  : leftDeck.cards.length > 0
                    ? `${mergeValidatedCards(leftDeck.cards).length} cards`
                    : 'No deck imported'
              }
              onImport={() => openImportModal('left')}
              onExport={() => handleExport('left')}
              exportDisabled={leftDeck.cards.length === 0 || leftDeck.status === 'loading'}
              searchTarget="left"
              onAddCard={handleAddCard}
            />
            <DeckAlerts
              target="left"
              status={leftDeck.status}
              errorMessage={leftDeck.errorMessage}
              invalidCards={leftDeck.invalidCards}
              emptyMessage="Import an original deck to start building changes."
              onDismissWarnings={() => dismissWarnings('left')}
            />
            <DeckCardList
              groupedCards={originalGroupedCards}
              emptyMessage="No cards in the original deck yet."
              renderAction={(card) => {
                const removalQueued = middleChanges.some(
                  (change) => change.oracleId === card.oracleId && change.delta < 0,
                )

                return (
                  <button
                    type="button"
                    onClick={() => toggleRemoval(card)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${removalQueued ? 'bg-amber-950/50 text-amber-200 hover:bg-amber-900/50' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
                  >
                    {removalQueued ? 'Undo Remove' : 'Remove'}
                  </button>
                )
              }}
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <DeckColumnHeader
              title="Changes"
              statusText={
                middleDeck.status === 'loading'
                  ? 'Validating changes...'
                  : middleChanges.length > 0
                    ? `${middleChanges.length} queued changes`
                    : 'No changes queued'
              }
              onImport={() => openImportModal('middle')}
              onExport={() => handleExport('middle')}
              exportDisabled={middleChanges.length === 0 || middleDeck.status === 'loading'}
              searchTarget="middle"
              onAddCard={handleAddCard}
            />
            <DeckAlerts
              target="middle"
              status={middleDeck.status}
              errorMessage={middleDeck.errorMessage}
              invalidCards={middleDeck.invalidCards}
              emptyMessage="Search or import cards to build migrations here."
              onDismissWarnings={() => dismissWarnings('middle')}
            />
            <MigrationCardList
              groupedCards={changeGroupedCards}
              emptyMessage="No changes queued yet."
              onClearChange={removeChange}
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
            <DeckColumnHeader
              title="Result"
              statusText={
                resultDeck.length > 0
                  ? `${mergeValidatedCards(resultDeck).length} cards after migrations`
                  : 'Result deck is empty'
              }
              onExport={() => handleExport('right')}
              exportDisabled={resultDeck.length === 0}
            />
            <DeckCardList
              groupedCards={resultGroupedCards}
              emptyMessage="The result deck will appear here after importing cards or applying changes."
            />
          </div>
        </section>
      </main>

      {importTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <button
            type="button"
            aria-label="Close import modal"
            className="absolute inset-0"
            onClick={closeImportModal}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">
                  Import {importTarget === 'left' ? 'Original Deck' : 'Changes'}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Paste the deck list for the {importTarget === 'left' ? 'original deck' : 'changes column'}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeImportModal}
                className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form className="mt-5" onSubmit={handleImportDeck}>
              <textarea
                autoFocus
                spellCheck={false}
                value={draftDeck}
                onChange={(event) => setDraftDeck(event.target.value)}
                placeholder="Paste a deck list here"
                className="min-h-80 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
              />

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!draftDeck.trim()}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Validate Import
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function DeckColumnHeader({
  title,
  statusText,
  onImport,
  onExport,
  exportDisabled,
  searchTarget,
  onAddCard,
}: {
  title: string
  statusText: string
  onImport?: () => void
  onExport: () => void
  exportDisabled: boolean
  searchTarget?: ImportTarget
  onAddCard?: (target: ImportTarget, card: SearchCardResult) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchCardResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!searchTarget || !onAddCard) {
      return
    }

    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 3) {
      setResults([])
      setIsSearching(false)
      return
    }

    let isCancelled = false
    setIsSearching(true)

    const timeoutId = window.setTimeout(async () => {
      const nextResults = await searchCards(trimmedQuery)

      if (isCancelled) {
        return
      }

      setResults(nextResults)
      setIsSearching(false)
    }, 300)

    return () => {
      isCancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [onAddCard, query, searchTarget])

  function handleSelectCard(card: SearchCardResult) {
    if (!searchTarget || !onAddCard) {
      return
    }

    onAddCard(searchTarget, card)
    setQuery('')
    setResults([])
    setIsSearching(false)
  }

  return (
    <div className="border-b border-zinc-800 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{statusText}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export
          </button>

          {onImport ? (
            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <Import className="h-4 w-4" strokeWidth={1.75} />
              Import
            </button>
          ) : null}
        </div>
      </div>

      {searchTarget && onAddCard ? (
        <div className="relative mt-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Add card"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
          />

          {query.trim().length >= 3 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
              {isSearching ? (
                <div className="px-4 py-3 text-sm text-zinc-500">Searching cards...</div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-zinc-800">
                  {results.map((card) => (
                    <button
                      key={`${card.oracleId}-${card.name}`}
                      type="button"
                      onClick={() => handleSelectCard(card)}
                      className="block w-full px-4 py-3 text-left transition hover:bg-zinc-900"
                    >
                      <div className="text-sm font-medium text-zinc-100">{card.name}</div>
                      <div className="mt-1 text-xs text-zinc-500">{card.typeLine}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-zinc-500">No cards found.</div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DeckAlerts({
  target,
  status,
  errorMessage,
  invalidCards,
  emptyMessage,
  onDismissWarnings,
}: {
  target: ImportTarget
  status: BaseDeckState['status'] | ChangeDeckState['status']
  errorMessage: string | null
  invalidCards: InvalidDeckCard[]
  emptyMessage: string
  onDismissWarnings: () => void
}) {
  return (
    <div className="space-y-4 px-5 pt-5">
      {errorMessage ? (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      {invalidCards.length > 0 ? (
        <section className="rounded-xl border border-amber-900/60 bg-amber-950/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-amber-200">Warnings</h3>
            <button
              type="button"
              onClick={onDismissWarnings}
              className="rounded-lg p-1.5 text-amber-300 transition hover:bg-amber-900/30 hover:text-amber-100"
              aria-label="Dismiss warnings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-100/90">
            {invalidCards.map((card) => (
              <li key={`${target}-${card.lineNumber}-${card.name}`}>
                <span className="font-medium">Line {card.lineNumber}:</span> {card.name}{' '}
                <span className="text-amber-300">{card.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {status === 'loading' ? (
        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500">Validating {target === 'left' ? 'the original deck' : 'these changes'} with Scryfall.</p>
        </div>
      ) : null}

      {status === 'idle' ? (
        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500">{emptyMessage}</p>
        </div>
      ) : null}
    </div>
  )
}

function DeckCardList({
  groupedCards,
  emptyMessage,
  renderAction,
}: {
  groupedCards: ReturnType<typeof groupValidatedCards>
  emptyMessage: string
  renderAction?: (card: ValidatedDeckCard) => React.ReactNode
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const categoriesWithCards = CARD_CATEGORIES.filter((category) => groupedCards[category].length > 0)

  function toggleCategory(category: string) {
    setCollapsedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }))
  }

  if (categoriesWithCards.length === 0) {
    return (
      <div className="p-5">
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5">
      {categoriesWithCards.map((category) => (
        <section key={category} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${collapsedCategories[category] ? '' : 'border-b border-zinc-800'}`}
          >
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">{category}</h3>
              <p className="mt-1 text-xs text-zinc-600">
                {groupedCards[category].length} card{groupedCards[category].length === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition ${collapsedCategories[category] ? '-rotate-90' : 'rotate-0'}`}
            />
          </button>

          {collapsedCategories[category] ? null : (
            <div className="divide-y divide-zinc-800">
              {groupedCards[category].map((card) => (
                <div key={card.oracleId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-zinc-100">{card.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-400">{card.quantity}</span>
                    {renderAction ? renderAction(card) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function MigrationCardList({
  groupedCards,
  emptyMessage,
  onClearChange,
}: {
  groupedCards: ReturnType<typeof groupMigrationCards>
  emptyMessage: string
  onClearChange: (oracleId: string) => void
}) {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const categoriesWithCards = CARD_CATEGORIES.filter((category) => groupedCards[category].length > 0)

  function toggleCategory(category: string) {
    setCollapsedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }))
  }

  if (categoriesWithCards.length === 0) {
    return (
      <div className="p-5">
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
          <p className="max-w-sm text-sm text-zinc-500">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-5">
      {categoriesWithCards.map((category) => (
        <section key={category} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${collapsedCategories[category] ? '' : 'border-b border-zinc-800'}`}
          >
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-400">{category}</h3>
              <p className="mt-1 text-xs text-zinc-600">
                {groupedCards[category].length} change{groupedCards[category].length === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 transition ${collapsedCategories[category] ? '-rotate-90' : 'rotate-0'}`}
            />
          </button>

          {collapsedCategories[category] ? null : (
            <div className="divide-y divide-zinc-800">
              {groupedCards[category].map((card) => (
                <div key={card.oracleId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className={card.delta > 0 ? 'text-emerald-200' : 'text-rose-200'}>{card.name}</span>
                  <div className="flex items-center gap-3">
                    <span className={card.delta > 0 ? 'font-medium text-emerald-300' : 'font-medium text-rose-300'}>
                      {card.delta > 0 ? `+${card.delta}` : card.delta}
                    </span>
                    <button
                      type="button"
                      onClick={() => onClearChange(card.oracleId)}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
