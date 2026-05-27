import { createFileRoute, redirect } from "@tanstack/react-router";
import { SearchPage } from "#/features/search/SearchPage";
import { getCurrentSession } from "#/server/session";

export const Route = createFileRoute("/search")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: SearchPage,
});
