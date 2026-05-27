import { useEffect, useReducer, type FormEvent } from "react";
import { Alert } from "#/components/ui/Alert";
import { Button } from "#/components/ui/Button";
import { Textarea } from "#/components/ui/Textarea";
import { generateScryfallQuery, type GeneratedScryfallQuery } from "#/server/searchTags";

type SearchPageState = {
  generatedQuery: GeneratedScryfallQuery | null;
  prompt: string;
  isGeneratingQuery: boolean;
  message: string | null;
  errorMessage: string | null;
};

const initialState: SearchPageState = {
  generatedQuery: null,
  prompt: "",
  isGeneratingQuery: false,
  message: null,
  errorMessage: null,
};

const EXAMPLE_PROMPTS = [
  "squirrels in the art",
  "cheap blue card draw",
  "graveyard hate for Commander",
];

export function SearchPage() {
  const [state, setState] = useReducer(
    (current: SearchPageState, next: Partial<SearchPageState>) => ({ ...current, ...next }),
    initialState,
  );
  const { generatedQuery, prompt, isGeneratingQuery, message, errorMessage } = state;
  const query = generatedQuery?.query ?? "";
  const hasResult = Boolean(generatedQuery) || isGeneratingQuery;
  const warnings = generatedQuery?.warnings ?? [];

  useEffect(() => {
    if (!message) return;
    const timeoutId = window.setTimeout(() => setState({ message: null }), 1500);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function handleGenerateQuery(promptValue = prompt) {
    const nextPrompt = promptValue.trim();
    if (!nextPrompt || isGeneratingQuery) return;

    setState({
      isGeneratingQuery: true,
      generatedQuery: null,
      message: null,
      errorMessage: null,
    });

    try {
      const result = await generateScryfallQuery({ data: { prompt: nextPrompt } });
      setState({
        generatedQuery: result as GeneratedScryfallQuery,
      });
    } catch (error) {
      setState({
        errorMessage: error instanceof Error ? error.message : "Could not generate a query.",
      });
    } finally {
      setState({ isGeneratingQuery: false });
    }
  }

  async function handleCopyQuery() {
    if (!query) return;
    await navigator.clipboard.writeText(query);
    setState({ message: "Copied" });
  }

  function handleExampleClick(text: string) {
    setState({ prompt: text });
    void handleGenerateQuery(text);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPrompt = String(formData.get("prompt") ?? "");
    setState({ prompt: nextPrompt });
    void handleGenerateQuery(nextPrompt);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Search cards</h1>
            <p className="mt-1 text-sm text-zinc-400">Natural language to Scryfall query.</p>
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
            <Textarea
              name="prompt"
              value={prompt}
              onChange={(event) => setState({ prompt: event.target.value })}
              placeholder="Rakdos commander cards that care about casting from exile"
              rows={10}
              className="min-h-64 w-full resize-y border-zinc-700 bg-zinc-900/70 leading-6"
            />
            <Button
              variant="primary"
              type="submit"
              disabled={isGeneratingQuery}
              className="w-full"
            >
              {isGeneratingQuery ? "Generating..." : "Generate query"}
            </Button>
          </form>

          <div className="mt-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">Try</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={isGeneratingQuery}
                    className="inline-flex max-w-full items-center rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-left text-xs text-zinc-300 transition hover:border-cyan-700 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {errorMessage ? (
            <Alert className="mt-6 border-rose-900/40">{errorMessage}</Alert>
          ) : null}
        </aside>

        <section className="min-w-0">
          {!hasResult ? (
            <div className="flex min-h-[24rem] items-center justify-center rounded-xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="max-w-md text-sm leading-6 text-zinc-500">
                Describe the cards you're looking for and we'll turn it into a Scryfall query —
                using DeckDiff's internal tag index for things like sacrifice outlets, tokenfall,
                and art themes.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                      Scryfall Query
                    </p>
                    {message ? (
                      <span className="text-xs text-cyan-300 transition-opacity duration-200">
                        {message}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleCopyQuery} disabled={!query}>
                      Copy
                    </Button>
                    {query ? (
                      <a
                        href={`https://scryfall.com/search?q=${encodeURIComponent(query)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-3 py-2 text-sm font-medium text-cyan-950 transition hover:bg-cyan-300"
                      >
                        Open in Scryfall
                      </a>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-600">
                        Open in Scryfall
                      </span>
                    )}
                  </div>
                </div>

                {isGeneratingQuery ? (
                  <div className="mt-3 min-h-32 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <div className="h-3 w-3/4 rounded bg-zinc-800" />
                    <div className="mt-3 h-3 w-1/2 rounded bg-zinc-800" />
                    <div className="mt-3 h-3 w-2/3 rounded bg-zinc-800" />
                  </div>
                ) : (
                  <pre
                    className={`mt-3 min-h-32 whitespace-pre-wrap break-words rounded-xl border p-4 font-mono text-sm leading-7 ${
                      query
                        ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-50"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-600"
                    }`}
                  >
                    <code>{query || "Generated query will appear here."}</code>
                  </pre>
                )}
              </div>

              <div className="border-t border-zinc-900 pt-6">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                  Tags used
                </p>
                <div className="mt-3 flex min-h-10 flex-wrap gap-2">
                  {generatedQuery?.selectedTags.length ? (
                    generatedQuery.selectedTags.map((tag) => (
                      <span
                        key={`${tag.operator}:${tag.slug}`}
                        title={tag.reason}
                        style={{ order: -tag.slug.length }}
                        className="inline-flex max-w-full items-stretch overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 text-sm leading-none"
                      >
                        <span className="flex items-center border-r border-zinc-800 bg-zinc-900/70 px-2 py-1.5 font-semibold text-cyan-300">
                          {tag.operator}
                        </span>
                        <span className="flex items-center truncate px-2 py-1.5 font-mono text-zinc-300">
                          {tag.slug}
                        </span>
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-600">
                      {isGeneratingQuery ? "Finding relevant tags..." : "No tags."}
                    </p>
                  )}
                </div>
              </div>

              <details className="group border-t border-zinc-900 pt-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 transition hover:text-zinc-300">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="h-3 w-3 transition-transform group-open:rotate-90"
                  >
                    <path
                      d="M4 2l4 4-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Why this query
                  {warnings.length ? (
                    <span
                      aria-label={`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400"
                    />
                  ) : null}
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-sm leading-6 text-zinc-300">
                    {generatedQuery?.explanation ??
                      (isGeneratingQuery
                        ? "Choosing query terms and validating them against local tags..."
                        : "Generate a query to see why these terms were chosen.")}
                  </p>
                  {warnings.length ? (
                    <ul className="space-y-2 text-sm leading-6 text-amber-300">
                      {warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </details>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
