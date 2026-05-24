import { useLoaderData } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useReducer } from "react";
import type { FormEvent } from "react";
import { DeckActionsModal } from "#/components/decks/DeckActionsModal";
import { CreateDeckModal } from "#/components/decks/CreateDeckModal";
import { DeckCard } from "#/components/decks/DeckCard";
import type { DeckItem } from "#/lib/deck";
import { swapSplitDeckCover } from "#/lib/deckCover";
import { createDeckExport } from "#/lib/deckExport";
import {
  createDeckForUser,
  deleteDeckForUser,
  renameDeckForUser,
  updateDeckCoverForUser,
} from "#/server/decks";

export function DecksPage() {
  const initialDecks = useLoaderData({ from: "/decks" }) as DeckItem[];
  const [state, setState] = useReducer(
    (
      current: {
        decks: DeckItem[];
        isCreateOpen: boolean;
        deckName: string;
        editingDeck: DeckItem | null;
        errorMessage: string | null;
      },
      next: Partial<typeof current>,
    ) => ({ ...current, ...next }),
    {
      decks: initialDecks,
      isCreateOpen: false,
      deckName: "",
      editingDeck: null,
      errorMessage: null,
    },
  );
  const { decks, isCreateOpen, deckName, editingDeck, errorMessage } = state;

  function closeModal() {
    setState({ isCreateOpen: false, deckName: "" });
  }

  function closeEditModal() {
    setState({ editingDeck: null });
  }

  async function handleCreateDeck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = deckName.trim();
    if (!name) {
      return;
    }

    try {
      const newDeck = await createDeckForUser({
        data: { name },
      });

      if (!newDeck) {
        throw new Error("Could not create deck.");
      }

      setState({
        decks: [newDeck, ...decks],
        errorMessage: null,
        isCreateOpen: false,
        deckName: "",
      });
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not create deck right now.",
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

      setState({
        decks: decks.map((d) => (d.id === deckId ? updatedDeck : d)),
        editingDeck: updatedDeck,
        errorMessage: null,
      });
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not rename deck right now.",
      });
    }
  }

  async function handleDeleteDeck(deckId: string) {
    try {
      await deleteDeckForUser({
        data: { deckId },
      });

      setState({
        decks: decks.filter((d) => d.id !== deckId),
        editingDeck: null,
        errorMessage: null,
      });
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

      setState({
        decks: decks.map((d) => (d.id === deckId ? updatedDeck : d)),
        editingDeck: updatedDeck,
        errorMessage: null,
      });
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

      setState({
        decks: decks.map((d) => (d.id === deck.id ? updatedDeck : d)),
        editingDeck: updatedDeck,
        errorMessage: null,
      });
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

  return (
    <>
      <main className="mx-auto w-full p-8">
        {errorMessage ? (
          <p className="mb-6 rounded-xl border border-rose-900/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </p>
        ) : null}

        <section className="grid justify-center gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,24rem),24rem))]">
          <button
            type="button"
            onClick={() => setState({ isCreateOpen: true })}
            className="flex aspect-[3/2] min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 text-zinc-400 transition hover:border-cyan-500/50 hover:text-cyan-300 sm:min-h-0"
          >
            <Plus className="size-9" strokeWidth={1.75} />
            <span className="mt-5 text-xl font-medium text-zinc-300">New Deck</span>
          </button>

          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={(editingDeck) => setState({ editingDeck })}
            />
          ))}
        </section>

        {decks.length === 0 ? (
          <p className="mt-8 text-sm text-zinc-500">No decks yet. Create one to get started.</p>
        ) : null}
      </main>

      {isCreateOpen ? (
        <CreateDeckModal
          deckName={deckName}
          onDeckNameChange={(deckName) => setState({ deckName })}
          onClose={closeModal}
          onSubmit={handleCreateDeck}
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
          onClearCover={handleClearCover}
          onSwapSplitCover={handleSwapSplitCover}
        />
      ) : null}
    </>
  );
}
