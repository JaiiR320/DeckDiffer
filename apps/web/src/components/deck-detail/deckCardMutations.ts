import type { EditorRow } from "../deck-editor/types";
import type { CardCategory, ValidatedDeckCard } from "../../lib/decklist";
import type { SearchCardResult } from "../../lib/scryfall";

export function appendSearchCard(cards: ValidatedDeckCard[], card: SearchCardResult) {
  return [
    ...cards,
    {
      oracleId: card.oracleId,
      name: card.name,
      quantity: 1,
      typeLine: card.typeLine,
      category: card.category,
      manaValue: card.manaValue,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      smallImageUrl: card.smallImageUrl,
      imageUrl: card.imageUrl,
    },
  ];
}

export function adjustCardQuantity(cards: ValidatedDeckCard[], row: EditorRow, delta: number) {
  const currentIndex = cards.findIndex((card) => card.oracleId === row.oracleId);

  if (currentIndex === -1) {
    return delta <= 0
      ? cards
      : [
          ...cards,
          {
            oracleId: row.oracleId,
            name: row.name,
            quantity: 1,
            typeLine: row.typeLine,
            category: row.category,
            manaValue: row.manaValue,
            setCode: row.setCode,
            collectorNumber: row.collectorNumber,
            smallImageUrl: row.smallImageUrl,
            imageUrl: row.imageUrl,
          },
        ];
  }

  return cards.flatMap((card, index) => {
    const nextCard =
      index === currentIndex
        ? {
            ...card,
            quantity: card.quantity + delta,
          }
        : card;

    return nextCard.quantity > 0 ? [nextCard] : [];
  });
}

export function restoreEditorRow(cards: ValidatedDeckCard[], row: EditorRow) {
  const nextCards = cards.filter((card) => card.oracleId !== row.oracleId);

  if (row.baselineQuantity <= 0) {
    return nextCards;
  }

  return [
    ...nextCards,
    {
      oracleId: row.oracleId,
      name: row.name,
      quantity: row.baselineQuantity,
      typeLine: row.typeLine,
      category: row.category,
      manaValue: row.manaValue,
      setCode: row.setCode,
      collectorNumber: row.collectorNumber,
      smallImageUrl: row.smallImageUrl,
      imageUrl: row.imageUrl,
    },
  ];
}

export function moveEditorRowCategory(
  cards: ValidatedDeckCard[],
  row: EditorRow,
  category: CardCategory,
) {
  if (row.category === category || row.currentQuantity <= 0) {
    return cards;
  }

  return cards.map((card) =>
    card.oracleId === row.oracleId
      ? {
          ...card,
          category,
        }
      : card,
  );
}
