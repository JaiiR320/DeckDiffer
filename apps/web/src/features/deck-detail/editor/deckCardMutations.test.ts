import { describe, expect, it } from "vitest";
import { changeCardPrinting } from "./deckCardMutations";

describe("changeCardPrinting", () => {
  it("updates printing fields while preserving quantity and category", () => {
    const cards = [
      {
        oracleId: "oracle-1",
        name: "Bedevil",
        quantity: 3,
        typeLine: "Instant",
        categoryId: "instant",
        manaValue: 3,
        setCode: "RNA",
        collectorNumber: "157",
        imageUrl: "old.jpg",
      },
      {
        oracleId: "oracle-2",
        name: "Island",
        quantity: 1,
        typeLine: "Basic Land - Island",
        categoryId: "land",
      },
    ];

    const nextCards = changeCardPrinting(
      cards,
      {
        oracleId: "oracle-1",
        name: "Bedevil",
        category: "instant",
        typeLine: "Instant",
        manaValue: 3,
        setCode: "RNA",
        collectorNumber: "157",
        imageUrl: "old.jpg",
        baselineQuantity: 3,
        currentQuantity: 3,
        status: "same",
      },
      {
        scryfallId: "print-2",
        oracleId: "oracle-1",
        name: "Bedevil",
        setCode: "DMC",
        setName: "Dominaria United Commander",
        collectorNumber: "144",
        releasedAt: "2022-09-09",
        priceUsd: 0.99,
        smallImageUrl: "new-small.jpg",
        imageUrl: "new.jpg",
        faces: [
          {
            name: "Bedevil",
            typeLine: "Instant",
            smallImageUrl: "new-small.jpg",
            imageUrl: "new.jpg",
          },
          {
            name: "Bedevil Back",
            typeLine: "Instant",
            smallImageUrl: "new-back-small.jpg",
            imageUrl: "new-back.jpg",
          },
        ],
      },
    );

    expect(nextCards[0]).toMatchObject({
      quantity: 3,
      categoryId: "instant",
      setCode: "DMC",
      collectorNumber: "144",
      smallImageUrl: "new-small.jpg",
      imageUrl: "new.jpg",
      faces: expect.arrayContaining([expect.objectContaining({ imageUrl: "new-back.jpg" })]),
    });
    expect(nextCards[1]).toBe(cards[1]);
  });
});
