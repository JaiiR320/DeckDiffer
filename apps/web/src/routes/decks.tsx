import { createFileRoute, redirect } from "@tanstack/react-router";
import { DecksPage } from "#/features/decks/DecksPage";
import { listDeckFolderView } from "#/server/decks";
import { getCurrentSession } from "#/server/session";

export const Route = createFileRoute("/decks")({
  validateSearch: (search: Record<string, unknown>) => ({
    folder: typeof search.folder === "string" ? search.folder : undefined,
  }),
  loaderDeps: ({ search }) => ({ folder: search.folder }),
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  loader: async ({ deps }) => listDeckFolderView({ data: { folderPath: deps.folder } }),
  component: DecksPage,
});
