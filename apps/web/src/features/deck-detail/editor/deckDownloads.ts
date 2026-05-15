import type { DeckItem } from "#/lib/deck";
import { createDeckExport } from "#/lib/deckExport";

export function downloadCurrentDeck(deck: DeckItem) {
  const deckExport = createDeckExport(deck);
  if (!deckExport.ok) {
    alert(deckExport.reason);
    return;
  }

  const url = URL.createObjectURL(new Blob([deckExport.text], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = deckExport.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
