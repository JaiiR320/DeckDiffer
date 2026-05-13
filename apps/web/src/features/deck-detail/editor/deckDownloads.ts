import type { DeckItem } from "#/lib/deck";
import { formatDeckExport } from "#/lib/decklist";

export function downloadCurrentDeck(deck: DeckItem) {
  const cards = deck.cards ?? [];
  if (cards.length === 0) {
    alert("No cards to export. Import or add cards first.");
    return;
  }

  const url = URL.createObjectURL(new Blob([formatDeckExport(cards)], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${deck.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
