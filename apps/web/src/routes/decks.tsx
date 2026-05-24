import { createFileRoute, redirect } from "@tanstack/react-router";
import { DecksPage } from "#/features/decks/DecksPage";
import { listDecks } from "#/server/decks";
import { getCurrentSession } from "#/server/session";

export const Route = createFileRoute("/decks")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  loader: async () => listDecks(),
  component: DecksPage,
});
