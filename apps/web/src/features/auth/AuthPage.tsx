import { LoaderCircle } from "lucide-react";
import { useReducer } from "react";
import type { FormEvent } from "react";
import { Alert } from "#/components/ui/Alert";
import { Button } from "#/components/ui/Button";
import { Input } from "#/components/ui/Input";
import { authClient } from "#/lib/auth-client";

type Mode = "sign-in" | "sign-up";

type AuthState = {
  mode: Mode;
  email: string;
  password: string;
  errorMessage: string | null;
  isSubmitting: boolean;
};

const initialAuthState: AuthState = {
  mode: "sign-up",
  email: "",
  password: "",
  errorMessage: null,
  isSubmitting: false,
};

export function AuthPage() {
  const [state, setState] = useReducer(
    (current: AuthState, next: Partial<AuthState>) => ({ ...current, ...next }),
    initialAuthState,
  );
  const { mode, email, password, errorMessage, isSubmitting } = state;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      return;
    }

    setState({ isSubmitting: true, errorMessage: null });

    try {
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: trimmedEmail.split("@")[0] || "User",
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
      } else {
        const result = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }
      }

      window.location.assign("/decks");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      if (mode === "sign-in" && message === "Invalid email or password") {
        setState({
          errorMessage: "No account was found for that email/password. Try Sign up first.",
        });
      } else {
        setState({ errorMessage: message });
      }
    } finally {
      setState({ isSubmitting: false });
    }
  }

  const title = mode === "sign-in" ? "Sign in" : "Create account";
  const subtitle =
    mode === "sign-in"
      ? "Use your email and password to access your decks."
      : "Create an account to start building and saving decks.";

  return (
    <main className="flex h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/90 p-8 shadow-2xl shadow-black/40">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">DeckDiff</p>
          <h1 className="text-3xl font-semibold text-zinc-100">{title}</h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-1">
          <button
            type="button"
            onClick={() => setState({ mode: "sign-in" })}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "sign-in" ? "bg-cyan-400 text-cyan-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setState({ mode: "sign-up" })}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              mode === "sign-up" ? "bg-cyan-400 text-cyan-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-zinc-400" htmlFor="auth-email">
              Email
            </label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setState({ email: event.target.value })}
              className="mt-2 w-full"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400" htmlFor="auth-password">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setState({ password: event.target.value })}
              className="mt-2 w-full"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          {errorMessage ? <Alert className="border-rose-900/40">{errorMessage}</Alert> : null}

          <Button type="submit" variant="primary" disabled={isSubmitting} className="w-full py-3">
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </main>
  );
}
