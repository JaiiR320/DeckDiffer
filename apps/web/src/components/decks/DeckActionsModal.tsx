import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import type { Dispatch, FormEvent } from "react";
import { useEffect, useReducer } from "react";
import { ToggleChip } from "#/components/ToggleChip";
import type { DeckItem } from "../../lib/deck";
import {
  createCategoryId,
  hasCategoryName,
  type DeckCategory,
  type ValidatedDeckCard,
} from "../../lib/decklist";

type DeckActionsModalProps = {
  deck: DeckItem;
  isOpen: boolean;
  onClose: () => void;
  onRename: (deckId: string, newName: string) => void;
  onDelete: (deckId: string) => void;
  onExport: (deck: DeckItem) => void;
  categories?: DeckCategory[];
  cards?: ValidatedDeckCard[];
  showRemovedCardGhosts?: boolean;
  onAddLane?: () => void;
  onCategoriesChange?: (categories: DeckCategory[]) => void;
  onShowRemovedCardGhostsChange?: (showRemovedCardGhosts: boolean) => void;
};

const EMPTY_CARDS: ValidatedDeckCard[] = [];

type ModalState = {
  activeTab: "general" | "categories";
  categoryName: string;
  isEditing: boolean;
  newCategoryName: string;
  newName: string;
  renamingCategoryId: string | null;
  showDeleteConfirm: boolean;
};

const initialModalState: ModalState = {
  activeTab: "general",
  categoryName: "",
  isEditing: false,
  newCategoryName: "",
  newName: "",
  renamingCategoryId: null,
  showDeleteConfirm: false,
};

export function DeckActionsModal({
  deck,
  isOpen,
  onClose,
  onRename,
  onDelete,
  onExport,
  categories,
  cards = EMPTY_CARDS,
  showRemovedCardGhosts = true,
  onAddLane,
  onCategoriesChange,
  onShowRemovedCardGhostsChange,
}: DeckActionsModalProps) {
  const [state, setState] = useReducer(
    (current: ModalState, next: Partial<ModalState>) => ({ ...current, ...next }),
    initialModalState,
  );
  const {
    activeTab,
    categoryName,
    isEditing,
    newCategoryName,
    newName,
    renamingCategoryId,
    showDeleteConfirm,
  } = state;

  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  function handleRenameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (trimmed && trimmed !== deck.name) {
      onRename(deck.id, trimmed);
    }
    setState({ isEditing: false });
  }

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed || !categories || !onCategoriesChange || hasCategoryName(categories, trimmed)) {
      return;
    }

    onCategoriesChange([
      ...categories,
      { id: createCategoryId(trimmed, categories), name: trimmed, kind: "custom" },
    ]);
    setState({ newCategoryName: "" });
  }

  function handleRenameCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = categoryName.trim();
    if (
      !trimmed ||
      !renamingCategoryId ||
      !categories ||
      !onCategoriesChange ||
      hasCategoryName(categories, trimmed, renamingCategoryId)
    ) {
      return;
    }

    onCategoriesChange(
      categories.map((category) =>
        category.id === renamingCategoryId ? { ...category, name: trimmed } : category,
      ),
    );
    setState({ renamingCategoryId: null, categoryName: "" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/70 p-6">
      <button
        type="button"
        aria-label="Close deck actions modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/40">
        <h2 className="text-xl font-semibold text-zinc-100">{deck.name}</h2>
        <div className="mt-5 flex border-b border-zinc-800">
          <SettingsTab
            active={activeTab === "general"}
            onClick={() => setState({ activeTab: "general" })}
          >
            General
          </SettingsTab>
          {categories && onCategoriesChange ? (
            <SettingsTab
              active={activeTab === "categories"}
              onClick={() => setState({ activeTab: "categories" })}
            >
              Categories
            </SettingsTab>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === "general" ? (
            <GeneralSettingsTab
              deck={deck}
              isEditing={isEditing}
              newName={newName}
              showDeleteConfirm={showDeleteConfirm}
              onClose={onClose}
              onDelete={onDelete}
              onExport={onExport}
              onRenameSubmit={handleRenameSubmit}
              setState={setState}
            />
          ) : categories && onCategoriesChange ? (
            <CategoriesSettingsTab
              cards={cards}
              categories={categories}
              categoryName={categoryName}
              newCategoryName={newCategoryName}
              renamingCategoryId={renamingCategoryId}
              showRemovedCardGhosts={showRemovedCardGhosts}
              onAddCategory={handleAddCategory}
              onAddLane={onAddLane}
              onCategoriesChange={onCategoriesChange}
              onRenameCategory={handleRenameCategory}
              onShowRemovedCardGhostsChange={onShowRemovedCardGhostsChange}
              setState={setState}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function GeneralSettingsTab({
  deck,
  isEditing,
  newName,
  showDeleteConfirm,
  onClose,
  onDelete,
  onExport,
  onRenameSubmit,
  setState,
}: {
  deck: DeckItem;
  isEditing: boolean;
  newName: string;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onDelete: (deckId: string) => void;
  onExport: (deck: DeckItem) => void;
  onRenameSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setState: Dispatch<Partial<ModalState>>;
}) {
  return (
    <div className="mt-5 space-y-2">
      {isEditing ? (
        <form onSubmit={onRenameSubmit} className="space-y-3">
          <label className="block text-sm font-medium text-zinc-400" htmlFor="deck-rename">
            New name
          </label>
          <input
            id="deck-rename"
            value={newName}
            onChange={(event) => setState({ newName: event.target.value })}
            placeholder="Enter a new name"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState({ isEditing: false })}
              className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setState({ newName: deck.name, isEditing: true })}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-left text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          <Pencil className="size-5 text-zinc-500" strokeWidth={1.75} />
          <span>Rename deck</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onExport(deck)}
        className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-left text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
      >
        <Download className="size-5 text-zinc-500" strokeWidth={1.75} />
        <span>Export deck list</span>
      </button>

      {showDeleteConfirm ? (
        <div className="space-y-3 rounded-xl border border-rose-900/50 bg-rose-950/20 p-4">
          <p className="text-sm text-rose-300">
            Are you sure? This will delete the deck and all {deck.saves.length} save
            {deck.saves.length === 1 ? "" : "s"}.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setState({ showDeleteConfirm: false })}
              className="flex-1 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete(deck.id);
                onClose();
              }}
              className="flex-1 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              Delete
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setState({ showDeleteConfirm: true })}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-left text-rose-400 transition hover:border-rose-900/50 hover:bg-rose-950/20"
        >
          <Trash2 className="size-5" strokeWidth={1.75} />
          <span>Delete deck</span>
        </button>
      )}
    </div>
  );
}

function CategoriesSettingsTab({
  cards,
  categories,
  categoryName,
  newCategoryName,
  renamingCategoryId,
  showRemovedCardGhosts,
  onAddCategory,
  onAddLane,
  onCategoriesChange,
  onRenameCategory,
  onShowRemovedCardGhostsChange,
  setState,
}: {
  cards: ValidatedDeckCard[];
  categories: DeckCategory[];
  categoryName: string;
  newCategoryName: string;
  renamingCategoryId: string | null;
  showRemovedCardGhosts: boolean;
  onAddCategory: (event: FormEvent<HTMLFormElement>) => void;
  onAddLane?: () => void;
  onCategoriesChange: (categories: DeckCategory[]) => void;
  onRenameCategory: (event: FormEvent<HTMLFormElement>) => void;
  onShowRemovedCardGhostsChange?: (showRemovedCardGhosts: boolean) => void;
  setState: Dispatch<Partial<ModalState>>;
}) {
  return (
    <div className="mt-5 space-y-3">
      <form onSubmit={onAddCategory} className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(event) => setState({ newCategoryName: event.target.value })}
          placeholder="New category"
          className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-500"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-950 transition hover:bg-cyan-300"
        >
          <Plus className="size-4" />
          Add
        </button>
      </form>

      {onAddLane ? (
        <button
          type="button"
          onClick={onAddLane}
          className="w-full rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
        >
          Add lane
        </button>
      ) : null}

      {onShowRemovedCardGhostsChange ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">Removed-card ghosts</p>
              <p className="mt-1 text-xs text-zinc-500">
                Keep cards visible in their old category after moving them.
              </p>
            </div>
            <ToggleChip
              label={showRemovedCardGhosts ? "On" : "Off"}
              checked={showRemovedCardGhosts}
              onToggle={() => onShowRemovedCardGhostsChange(!showRemovedCardGhosts)}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {categories.map((category) => {
          const cardCount = cards.filter((card) => card.categoryId === category.id).length;
          const isBlocked = cardCount > 0;

          return (
            <div key={category.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              {renamingCategoryId === category.id ? (
                <form onSubmit={onRenameCategory} className="flex gap-2">
                  <input
                    value={categoryName}
                    onChange={(event) => setState({ categoryName: event.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-cyan-950"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-100">{category.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {cardCount} card{cardCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ToggleChip
                      label="Hide"
                      checked={category.hidden === true}
                      onToggle={() =>
                        updateCategory(category.id, categories, onCategoriesChange, {
                          hidden: !category.hidden,
                        })
                      }
                    />
                    <ToggleChip
                      label="In Deck"
                      checked={category.includeInDeck !== false}
                      onToggle={() =>
                        updateCategory(category.id, categories, onCategoriesChange, {
                          includeInDeck: category.includeInDeck === false,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setState({ renamingCategoryId: category.id, categoryName: category.name })
                      }
                      className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-700"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        removeCategory(category.id, categories, cards, onCategoriesChange)
                      }
                      disabled={isBlocked}
                      title={isBlocked ? "Move cards out before removing." : "Remove category"}
                      className="rounded-lg border border-zinc-800 px-3 py-1.5 text-sm text-rose-400 hover:border-rose-900/50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function updateCategory(
  categoryId: string,
  categories: DeckCategory[],
  onCategoriesChange: (categories: DeckCategory[]) => void,
  patch: Partial<DeckCategory>,
) {
  onCategoriesChange(
    categories.map((category) =>
      category.id === categoryId ? { ...category, ...patch } : category,
    ),
  );
}

function removeCategory(
  categoryId: string,
  categories: DeckCategory[] | undefined,
  cards: ValidatedDeckCard[],
  onCategoriesChange: ((categories: DeckCategory[]) => void) | undefined,
) {
  if (!categories || !onCategoriesChange || cards.some((card) => card.categoryId === categoryId)) {
    return;
  }
  onCategoriesChange(categories.filter((category) => category.id !== categoryId));
}

function useLockBodyScroll(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
}

function SettingsTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition ${
        active ? "border-b-2 border-cyan-400 text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}
