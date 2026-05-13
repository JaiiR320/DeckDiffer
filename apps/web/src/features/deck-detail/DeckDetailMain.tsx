import { DeckDetailHeader } from "./components/DeckDetailHeader";
import { ErrorBanner } from "./components/DeckStatusMessages";
import { useDeckDetailModel, useDeckDetailServices, useDeckDetailState } from "./deckDetailContext";
import { DeckEditorSurface } from "./DeckEditorSurface";

export function DeckDetailMain() {
  const { deck, deckErrorMessage } = useDeckDetailState();
  const { canSave, deckName } = useDeckDetailModel();
  const { deckActions } = useDeckDetailServices();

  return (
    <main className="mx-auto w-full p-8">
      {deckErrorMessage ? <ErrorBanner>{deckErrorMessage}</ErrorBanner> : null}
      <DeckDetailHeader
        deck={deck}
        deckName={deckName}
        canSave={canSave}
        onOpenActions={() => deckActions.setIsDeckActionsOpen(true)}
        onOpenSave={() => deckActions.setIsSaveOpen(true)}
      />
      <DeckEditorSurface />
    </main>
  );
}
