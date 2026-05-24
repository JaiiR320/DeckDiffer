import { createFileRoute, redirect } from "@tanstack/react-router";
import { JudgePage } from "#/features/judge/JudgePage";
import { getCurrentSession } from "#/server/session";

export const Route = createFileRoute("/judge")({
  beforeLoad: async () => {
    const session = await getCurrentSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: JudgePage,
});
