import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "#/server/session";
import { AuthPage } from "#/features/auth/AuthPage";

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (session) {
      throw redirect({ to: "/decks", search: { folder: undefined } });
    }
  },
  component: AuthPage,
});
