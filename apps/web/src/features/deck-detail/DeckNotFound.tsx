import { Link } from "@tanstack/react-router";

export function DeckNotFound() {
  return (
    <main className="mx-auto w-full p-8">
      <div className="flex items-center gap-4">
        <Link
          to="/decks"
          className="rounded-xl border border-zinc-800 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          Back
        </Link>
        <p className="text-sm text-zinc-500">Deck not found.</p>
      </div>
    </main>
  );
}
