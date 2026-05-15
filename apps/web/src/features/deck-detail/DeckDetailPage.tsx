import { StatusMessage } from "./components/DeckStatusMessages";
import { DeckDetailProvider } from "./deckDetailContext";
import { DeckDetailMain } from "./DeckDetailMain";
import { DeckDetailModals } from "./DeckDetailModals";
import { DeckNotFound } from "./DeckNotFound";
import { useDeckDetailController } from "./useDeckDetailController";

export function DeckDetailPage() {
  const controller = useDeckDetailController();

  if (controller.errorMessage) {
    return <StatusMessage>{controller.errorMessage}</StatusMessage>;
  }

  if (!controller.workspaceView) {
    return <DeckNotFound />;
  }

  return (
    <DeckDetailProvider
      deckUiActions={controller.deckUiActions}
      deckUiView={controller.deckUiView}
      model={controller.model}
      services={controller.services}
      workspaceActions={controller.workspaceActions}
      workspaceView={controller.workspaceView}
    >
      <DeckDetailMain />
      <DeckDetailModals />
    </DeckDetailProvider>
  );
}
