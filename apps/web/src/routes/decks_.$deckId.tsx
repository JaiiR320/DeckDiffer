import { createFileRoute, redirect } from "@tanstack/react-router";
import { DeckDetailPage } from "#/features/deck-detail/DeckDetailPage";
import { getDeck } from "#/server/decks";
import { getCurrentSession } from "#/server/session";

export const Route = createFileRoute("/decks_/$deckId")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  loader: async ({ params }) => {
    try {
      return {
        deck: await getDeck({ data: { deckId: params.deckId } }),
        errorMessage: null,
      };
    } catch (error) {
      return {
        deck: null,
        errorMessage:
          error instanceof Error ? error.message : "Could not load this deck right now.",
      };
    }
  },
  component: DeckDetailPage,
});
