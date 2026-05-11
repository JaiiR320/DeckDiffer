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

  if (!controller.state) {
    return <DeckNotFound />;
  }

  return (
    <DeckDetailProvider
      actions={controller.actions}
      model={controller.model}
      services={controller.services}
      state={controller.state}
    >
      <DeckDetailMain />
      <DeckDetailModals />
    </DeckDetailProvider>
  );
}
