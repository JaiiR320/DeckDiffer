import { useLoaderData, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronRight, Folder, FolderPlus, Plus, Trash2 } from "lucide-react";
import { useReducer } from "react";
import type { FormEvent } from "react";
import { DeckActionsModal } from "#/components/decks/DeckActionsModal";
import { CreateDeckModal } from "#/components/decks/CreateDeckModal";
import { DeckCard } from "#/components/decks/DeckCard";
import { Button } from "#/components/ui/Button";
import { IconButton } from "#/components/ui/IconButton";
import type { DeckFolderView, DeckItem } from "#/lib/deck";
import { swapSplitDeckCover } from "#/lib/deckCover";
import { createDeckExport } from "#/lib/deckExport";
import {
  createDeckForUser,
  createFolderForUser,
  deleteDeckForUser,
  deleteFolderForUser,
  moveDeckToFolderForUser,
  renameDeckForUser,
  updateDeckCoverForUser,
} from "#/server/decks";

type DecksPageState = {
  isCreateDeckOpen: boolean;
  isCreateFolderOpen: boolean;
  name: string;
  editingDeck: DeckItem | null;
  errorMessage: string | null;
};

type FolderCardProps = {
  folder: DeckFolderView["folders"][number];
  path: string;
  onOpen: (path: string) => void;
  onDelete: (folder: DeckFolderView["folders"][number]) => void;
};

function folderSearch(folderPath: string) {
  return { folder: folderPath || undefined };
}

export function DecksPage() {
  const view = useLoaderData({ from: "/decks" }) as DeckFolderView;
  const navigate = useNavigate({ from: "/decks" });
  const router = useRouter();
  const [state, setState] = useReducer(
    (current: DecksPageState, next: Partial<DecksPageState>) => ({ ...current, ...next }),
    {
      isCreateDeckOpen: false,
      isCreateFolderOpen: false,
      name: "",
      editingDeck: null,
      errorMessage: null,
    },
  );
  const { isCreateDeckOpen, isCreateFolderOpen, name, editingDeck, errorMessage } = state;

  function openFolder(folderPath: string) {
    void navigate({ to: "/decks", search: folderSearch(folderPath) });
  }

  function closeCreateModal() {
    setState({ isCreateDeckOpen: false, isCreateFolderOpen: false, name: "" });
  }

  function closeEditModal() {
    setState({ editingDeck: null });
  }

  async function refreshDecks() {
    await router.invalidate();
  }

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      const newDeck = await createDeckForUser({
        data: { name: trimmedName, folderId: view.currentFolder?.id ?? null },
      });

      if (!newDeck) {
        throw new Error("Could not create deck.");
      }

      closeCreateModal();
      setState({ errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not create deck right now.",
      });
    }
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      await createFolderForUser({
        data: { name: trimmedName, parentFolderId: view.currentFolder?.id ?? null },
      });
      closeCreateModal();
      setState({ errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not create folder right now.",
      });
    }
  }

  async function handleDeleteFolder(folder: DeckFolderView["folders"][number]) {
    if (!folder.isEmpty) return;

    try {
      await deleteFolderForUser({ data: { folderId: folder.id } });
      setState({ errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not delete folder right now.",
      });
    }
  }

  async function handleMoveDeck(deckId: string, folderId: string | null) {
    try {
      await moveDeckToFolderForUser({ data: { deckId, folderId } });
      setState({ editingDeck: null, errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not move deck right now.",
      });
    }
  }

  async function handleRenameDeck(deckId: string, newName: string) {
    try {
      const updatedDeck = await renameDeckForUser({
        data: { deckId, newName },
      });

      if (!updatedDeck) {
        throw new Error("Could not rename deck.");
      }

      setState({ editingDeck: updatedDeck, errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not rename deck right now.",
      });
    }
  }

  async function handleDeleteDeck(deckId: string) {
    try {
      await deleteDeckForUser({ data: { deckId } });
      setState({ editingDeck: null, errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not delete deck right now.",
      });
    }
  }

  async function handleClearCover(deckId: string) {
    try {
      const updatedDeck = await updateDeckCoverForUser({ data: { deckId, cover: null } });
      if (!updatedDeck) throw new Error("Could not clear deck cover.");

      setState({ editingDeck: updatedDeck, errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage:
          error instanceof Error ? error.message : "Could not clear deck cover right now.",
      });
    }
  }

  async function handleSwapSplitCover(deck: DeckItem) {
    try {
      const updatedDeck = await updateDeckCoverForUser({
        data: { deckId: deck.id, cover: deck.cover ? swapSplitDeckCover(deck.cover) : null },
      });
      if (!updatedDeck) throw new Error("Could not swap deck cover.");

      setState({ editingDeck: updatedDeck, errorMessage: null });
      await refreshDecks();
    } catch (error) {
      setState({
        errorMessage:
          error instanceof Error ? error.message : "Could not swap deck cover right now.",
      });
    }
  }

  function handleExportDeck(deck: DeckItem) {
    const deckExport = createDeckExport(deck);
    if (!deckExport.ok) {
      alert(deckExport.reason);
      return;
    }

    const blob = new Blob([deckExport.text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = deckExport.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setState({ editingDeck: null });
  }

  const hasItems = view.folders.length > 0 || view.decks.length > 0;

  return (
    <>
      <main className="mx-auto w-full p-8">
        {errorMessage ? (
          <p className="mb-6 rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <div className="mx-auto max-w-[74.5rem]">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Breadcrumbs breadcrumbs={view.breadcrumbs} onOpen={openFolder} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setState({ isCreateDeckOpen: true, name: "" })}>
                <Plus className="size-4" strokeWidth={1.75} />
                New Deck
              </Button>
              <Button size="sm" onClick={() => setState({ isCreateFolderOpen: true, name: "" })}>
                <FolderPlus className="size-4" strokeWidth={1.75} />
                New Folder
              </Button>
            </div>
          </div>

          <section className="grid justify-center gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,24rem),24rem))]">
            {view.folders.map((folder) => {
              const folderPath = view.currentFolderPath
                ? `${view.currentFolderPath}/${folder.slug}`
                : folder.slug;
              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  path={folderPath}
                  onOpen={openFolder}
                  onDelete={handleDeleteFolder}
                />
              );
            })}

            {view.decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onEdit={(editingDeck) => setState({ editingDeck })}
              />
            ))}
          </section>
        </div>

        {!hasItems ? (
          <p className="mt-8 text-sm text-zinc-500">
            This folder is empty. Create a deck or folder to get started.
          </p>
        ) : null}
      </main>

      {isCreateDeckOpen ? (
        <CreateDeckModal
          deckName={name}
          onDeckNameChange={(nextName) => setState({ name: nextName })}
          onClose={closeCreateModal}
          onSubmit={handleCreateDeck}
        />
      ) : null}

      {isCreateFolderOpen ? (
        <CreateDeckModal
          title="New Folder"
          label="Folder name"
          placeholder="Enter a folder name"
          deckName={name}
          onDeckNameChange={(nextName) => setState({ name: nextName })}
          onClose={closeCreateModal}
          onSubmit={handleCreateFolder}
        />
      ) : null}

      {editingDeck ? (
        <DeckActionsModal
          deck={editingDeck}
          isOpen={true}
          onClose={closeEditModal}
          onRename={handleRenameDeck}
          onDelete={handleDeleteDeck}
          onExport={handleExportDeck}
          onMoveToFolder={handleMoveDeck}
          folderOptions={view.folderOptions}
          currentFolderId={view.deckFolderIds[editingDeck.id] ?? null}
          onClearCover={handleClearCover}
          onSwapSplitCover={handleSwapSplitCover}
        />
      ) : null}
    </>
  );
}

function Breadcrumbs({
  breadcrumbs,
  onOpen,
}: {
  breadcrumbs: DeckFolderView["breadcrumbs"];
  onOpen: (path: string) => void;
}) {
  return (
    <nav
      className="flex flex-wrap items-center gap-2 text-sm text-zinc-500"
      aria-label="Deck folders"
    >
      <button type="button" onClick={() => onOpen("")} className="hover:text-zinc-200">
        Decks
      </button>
      {breadcrumbs.map((breadcrumb) => (
        <span key={breadcrumb.id} className="inline-flex items-center gap-2">
          <ChevronRight className="size-4" strokeWidth={1.75} />
          <button
            type="button"
            onClick={() => onOpen(breadcrumb.path)}
            className="text-zinc-300 hover:text-zinc-100"
          >
            {breadcrumb.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

function FolderCard({ folder, path, onOpen, onDelete }: FolderCardProps) {
  return (
    <div className="group relative flex aspect-[3/2] min-h-48 flex-col rounded-2xl border border-zinc-800 bg-zinc-950 px-7 py-6 text-left transition hover:border-zinc-700 sm:min-h-0">
      <div className="pointer-events-none">
        <Folder className="size-9 text-amber-300" strokeWidth={1.75} />
      </div>
      <div className="pointer-events-none mt-8 pr-10">
        <span className="text-3xl font-semibold tracking-tight text-zinc-100">{folder.name}</span>
        <p className="mt-2 text-lg text-zinc-500">Folder</p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(path)}
        className="absolute inset-0 rounded-2xl"
        aria-label={`Open ${folder.name}`}
      />
      <IconButton
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(folder);
        }}
        disabled={!folder.isEmpty}
        title={folder.isEmpty ? `Delete ${folder.name}` : "Folder must be empty"}
        aria-label={folder.isEmpty ? `Delete ${folder.name}` : `${folder.name} must be empty`}
        variant="ghost"
        className="absolute right-6 top-6 z-20 cursor-pointer p-2 opacity-0 group-hover:opacity-100 disabled:opacity-40"
      >
        <Trash2 className="size-5" strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}
