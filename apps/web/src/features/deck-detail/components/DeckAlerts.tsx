import { X } from "lucide-react";
import { Alert } from "#/components/ui/Alert";
import { IconButton } from "#/components/ui/IconButton";
import type { DeckState } from "../editor/types";

type DeckAlertsProps = {
  deck: DeckState;
  onDismissWarnings: () => void;
};

export function DeckAlerts({ deck, onDismissWarnings }: DeckAlertsProps) {
  const hasError = deck.errorMessage !== null;
  const hasWarnings = deck.invalidCards.length > 0;

  if (!hasError && !hasWarnings) {
    return null;
  }

  return (
    <div className="space-y-4 px-5 pb-2 pt-5">
      {hasError ? (
        <Alert tone="danger" className="border-rose-900/60 bg-rose-950/40 p-4">
          {deck.errorMessage}
        </Alert>
      ) : null}

      {hasWarnings ? (
        <Alert as="section" tone="warning" className="p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-amber-200">Warnings</h3>
            <IconButton
              onClick={onDismissWarnings}
              variant="warning"
              size="sm"
              aria-label="Dismiss warnings"
            >
              <X className="size-4" />
            </IconButton>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-100/90">
            {deck.invalidCards.map((card) => (
              <li key={`${card.lineNumber}-${card.name}`}>
                <span className="font-medium">Line {card.lineNumber}:</span> {card.name}{" "}
                <span className="text-amber-300">{card.reason}</span>
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
}
