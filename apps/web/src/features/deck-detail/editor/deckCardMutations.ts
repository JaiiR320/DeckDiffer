import type { CardCategory, ValidatedDeckCard } from "#/lib/decklist";
import type { CardPrintingOption, SearchCardResult } from "#/lib/scryfall";
import type { EditorRow } from "./types";

export function appendSearchCard(
  cards: ValidatedDeckCard[],
  card: SearchCardResult,
  categoryId: CardCategory,
) {
  const existingIndex = cards.findIndex((existingCard) => existingCard.oracleId === card.oracleId);

  if (existingIndex !== -1) {
    return cards.map((existingCard, index) =>
      index === existingIndex
        ? { ...existingCard, quantity: existingCard.quantity + 1, categoryId }
        : existingCard,
    );
  }

  return [
    ...cards,
    {
      oracleId: card.oracleId,
      name: card.name,
      quantity: 1,
      typeLine: card.typeLine,
      categoryId,
      manaCost: card.manaCost,
      manaValue: card.manaValue,
      producedMana: card.producedMana,
      setCode: card.setCode,
      collectorNumber: card.collectorNumber,
      smallImageUrl: card.smallImageUrl,
      imageUrl: card.imageUrl,
      faces: card.faces,
      priceUsd: card.priceUsd,
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
            categoryId: row.category,
            manaCost: row.manaCost,
            manaValue: row.manaValue,
            producedMana: row.producedMana,
            setCode: row.setCode,
            collectorNumber: row.collectorNumber,
            smallImageUrl: row.smallImageUrl,
            imageUrl: row.imageUrl,
            faces: row.faces,
            priceUsd: row.priceUsd,
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
          categoryId: category,
        }
      : card,
  );
}

export function changeCardPrinting(
  cards: ValidatedDeckCard[],
  row: EditorRow,
  printing: CardPrintingOption,
) {
  return cards.map((card) =>
    card.oracleId === row.oracleId && (!card.categoryId || card.categoryId === row.category)
      ? {
          ...card,
          name: printing.name,
          manaCost: printing.manaCost,
          producedMana: printing.producedMana,
          setCode: printing.setCode,
          collectorNumber: printing.collectorNumber,
          smallImageUrl: printing.smallImageUrl,
          imageUrl: printing.imageUrl,
          faces: printing.faces,
          priceUsd: printing.priceUsd,
        }
      : card,
  );
}
