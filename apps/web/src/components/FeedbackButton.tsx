import { useReducer } from "react";
import type { FormEvent } from "react";
import { Bug, Check, Lightbulb, MessageSquarePlus, X } from "lucide-react";
import { Alert } from "#/components/ui/Alert";
import { Button } from "#/components/ui/Button";
import { IconButton } from "#/components/ui/IconButton";
import { Input } from "#/components/ui/Input";
import { Modal } from "#/components/ui/Modal";
import { Textarea } from "#/components/ui/Textarea";
import { createGithubIssue } from "#/server/github";

type IssueType = "bug" | "feature";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; issueNumber: number; issueUrl: string }
  | { status: "error"; message: string };

export function FeedbackButton() {
  const [state, setState] = useReducer(
    (
      current: {
        isOpen: boolean;
        issueType: IssueType;
        title: string;
        body: string;
        submitState: SubmitState;
      },
      next: Partial<typeof current>,
    ) => ({ ...current, ...next }),
    {
      isOpen: false,
      issueType: "bug" as IssueType,
      title: "",
      body: "",
      submitState: { status: "idle" } as SubmitState,
    },
  );
  const { isOpen, issueType, title, body, submitState } = state;

  function handleClose() {
    setState({
      isOpen: false,
      issueType: "bug",
      title: "",
      body: "",
      submitState: { status: "idle" },
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) return;

    setState({ submitState: { status: "loading" } });
    try {
      const result = await createGithubIssue({
        data: { issueType, title: trimmedTitle, body: trimmedBody },
      });
      setState({
        submitState: {
          status: "success",
          issueNumber: result.number,
          issueUrl: result.html_url,
        },
      });
    } catch (err) {
      setState({
        submitState: {
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        },
      });
    }
  }

  const isLoading = submitState.status === "loading";

  return (
    <>
      {/* Floating trigger button */}
      <IconButton
        aria-label="Send feedback"
        onClick={() => setState({ isOpen: true })}
        size="lg"
        className="fixed bottom-6 right-6 z-50 border border-zinc-700 bg-zinc-800 text-zinc-300 shadow-lg shadow-black/40 hover:bg-zinc-700 hover:text-cyan-300"
      >
        <MessageSquarePlus className="size-5" strokeWidth={1.75} />
      </IconButton>

      {/* Modal */}
      {isOpen && (
        <Modal ariaLabel="Close feedback modal" onClose={handleClose}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-zinc-100">Send Feedback</h2>
            <IconButton
              aria-label="Close"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-zinc-500"
            >
              <X className="size-5" />
            </IconButton>
          </div>

          {/* Success state */}
          {submitState.status === "success" ? (
            <div className="mt-6 flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full border border-cyan-800 bg-cyan-950/50">
                <Check className="size-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-zinc-100">Issue created!</p>
                <p className="mt-1 text-sm text-zinc-400">Thanks for your feedback.</p>
              </div>
              <a
                href={submitState.issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                View issue #{submitState.issueNumber} on GitHub
              </a>
              <Button onClick={handleClose}>Close</Button>
            </div>
          ) : (
            /* Form state */
            <form className="mt-5" onSubmit={handleSubmit}>
              {/* Issue type selector */}
              <p className="block text-sm font-medium text-zinc-400">Type</p>
              <div className="mt-2 flex gap-2">
                {(["bug", "feature"] as const).map((type) => {
                  const isActive = issueType === type;
                  const label = type === "bug" ? "Bug Report" : "Feature Request";
                  const Icon = type === "bug" ? Bug : Lightbulb;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setState({ issueType: type })}
                      aria-pressed={isActive}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-cyan-800 bg-cyan-950/40 text-cyan-200"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <Icon className="size-4" strokeWidth={1.75} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <label
                className="mt-4 block text-sm font-medium text-zinc-400"
                htmlFor="feedback-title"
              >
                Title
              </label>
              <Input
                id="feedback-title"
                required
                value={title}
                onChange={(e) => setState({ title: e.target.value })}
                placeholder="Brief summary"
                className="mt-2 w-full"
              />

              {/* Description */}
              <label
                className="mt-4 block text-sm font-medium text-zinc-400"
                htmlFor="feedback-description"
              >
                Description
              </label>
              <Textarea
                id="feedback-description"
                required
                value={body}
                onChange={(e) => setState({ body: e.target.value })}
                placeholder="Describe the issue or feature in detail…"
                rows={5}
                className="mt-2 w-full resize-y"
              />

              {/* Error message */}
              {submitState.status === "error" && (
                <Alert tone="danger" className="mt-3 rounded-lg px-3 py-2 text-rose-400">
                  {submitState.message}
                </Alert>
              )}

              {/* Actions */}
              <div className="mt-5 flex justify-end gap-3">
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading || !title.trim() || !body.trim()}
                >
                  {isLoading ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
