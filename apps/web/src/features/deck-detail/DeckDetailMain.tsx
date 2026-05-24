import { DeckDetailHeader } from "./components/DeckDetailHeader";
import { ErrorBanner } from "./components/DeckStatusMessages";
import {
  useDeckDetailModel,
  useDeckDetailServices,
  useDeckUiView,
  useDeckWorkspaceView,
} from "./deckDetailContext";
import { DeckEditorSurface } from "./DeckEditorSurface";

export function DeckDetailMain() {
  const { deck } = useDeckWorkspaceView();
  const { deckErrorMessage } = useDeckUiView();
  const { canSave, deckName } = useDeckDetailModel();
  const { deckActions } = useDeckDetailServices();

  return (
    <main className="mx-auto w-full max-w-[1920px] p-8">
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
