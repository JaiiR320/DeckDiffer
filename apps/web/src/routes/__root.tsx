import { LogOut } from "lucide-react";
import { HeadContent, Link, Scripts, createRootRoute, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { authClient } from "#/lib/auth-client";
import appCss from "../styles.css?url";
import { FeedbackButton } from "../components/FeedbackButton";

let isReactScanStarted = false;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "DeckDiff",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-dvh flex-col bg-zinc-950 font-sans antialiased text-zinc-100 wrap-anywhere">
        <AppHeader />
        <div className="flex-1">{children}</div>
        <FeedbackGate />
        <ReactScan />
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Analytics />
        <Scripts />
      </body>
    </html>
  );
}

function ReactScan() {
  useEffect(() => {
    if (!import.meta.env.DEV || isReactScanStarted) {
      return;
    }

    isReactScanStarted = true;
    void import("react-scan").then(({ scan }) => {
      scan({
        enabled: true,
        showToolbar: true,
        showFPS: true,
        animationSpeed: "fast",
      });
    });
  }, []);

  return null;
}

function AppHeader() {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    window.location.assign("/auth");
  }

  const isAuthPage = location.pathname === "/auth";
  const isDecksPage = location.pathname === "/decks";
  const isJudgePage = location.pathname === "/judge";
  const username = session?.user.email.split("@")[0] ?? "";
  const navLinkClass =
    "inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium transition";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex w-full items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">DeckDiff</p>

          {!isAuthPage && session ? (
            <nav className="flex items-center gap-3">
              <Link
                to="/decks"
                className={`${navLinkClass} ${
                  isDecksPage
                    ? "border-cyan-800 bg-cyan-950/40 text-cyan-200"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                Decks
              </Link>
              <Link
                to="/judge"
                className={`${navLinkClass} ${
                  isJudgePage
                    ? "border-cyan-800 bg-cyan-950/40 text-cyan-200"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                Judge
              </Link>
            </nav>
          ) : null}
        </div>

        {!isAuthPage && session ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{username}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        ) : isPending ? (
          <div className="h-10 w-24" />
        ) : null}
      </div>
    </header>
  );
}

function FeedbackGate() {
  const location = useLocation();

  if (location.pathname === "/auth") {
    return null;
  }

  return <FeedbackButton />;
}
