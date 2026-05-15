import { describe, expect, it } from "vitest";
import type { InvalidDeckCard, ValidatedDeckCard } from "#/lib/decklist";
import { applyValidatedDeckImport } from "./deckImport";
import type { DeckState } from "./types";

function card(overrides: Partial<ValidatedDeckCard> = {}): ValidatedDeckCard {
  return {
    oracleId: "oracle-1",
    name: "Sol Ring",
    quantity: 1,
    typeLine: "Artifact",
    ...overrides,
  };
}

function baseline(overrides: Partial<DeckState> = {}): DeckState {
  return {
    rawText: "1 Arcane Signet",
    cards: [card({ oracleId: "baseline", name: "Arcane Signet" })],
    invalidCards: [],
    status: "error",
    errorMessage: "Previous error",
    ...overrides,
  };
}

const warnings: InvalidDeckCard[] = [
  {
    lineNumber: 2,
    quantity: 1,
    name: "Unknown Card",
    reason: "Could not find this card.",
  },
];

describe("applyValidatedDeckImport", () => {
  it("replace-empty stores raw text and uses validated cards as baseline and working cards", () => {
    const validCards = [card({ setCode: "LTC", collectorNumber: "279", imageUrl: "sol-ring.jpg" })];

    const result = applyValidatedDeckImport({
      mode: "replace-empty",
      baselineDeck: baseline(),
      workingCards: [],
      validCards,
      warnings,
      rawText: "1 Sol Ring",
    });

    expect(result.baselineDeck).toEqual({
      rawText: "1 Sol Ring",
      cards: validCards,
      invalidCards: warnings,
      status: "ready",
      errorMessage: null,
    });
    expect(result.workingCards).toBe(validCards);
  });

  it("bulk-add merges into working cards while preserving baseline cards and raw text", () => {
    const existingPrinting = card({
      quantity: 2,
      setCode: "CMM",
      collectorNumber: "400",
      imageUrl: "existing.jpg",
    });
    const importedPrinting = card({
      quantity: 1,
      setCode: "LTC",
      collectorNumber: "279",
      imageUrl: "imported.jpg",
    });
    const existingBaseline = baseline({ status: "loading", errorMessage: "Still loading" });

    const result = applyValidatedDeckImport({
      mode: "bulk-add",
      baselineDeck: existingBaseline,
      workingCards: [existingPrinting],
      validCards: [importedPrinting, card({ oracleId: "oracle-2", name: "Command Tower" })],
      warnings,
      rawText: "ignored for bulk add",
    });

    expect(result.baselineDeck).toEqual({
      ...existingBaseline,
      invalidCards: warnings,
      status: "ready",
      errorMessage: null,
    });
    expect(result.workingCards).toEqual([
      {
        ...existingPrinting,
        quantity: 3,
      },
      card({ oracleId: "oracle-2", name: "Command Tower" }),
    ]);
  });

  it("override uses previous working cards as baseline and replaces working cards", () => {
    const previousWorking = [card({ oracleId: "previous", name: "Lightning Bolt", quantity: 4 })];
    const validCards = [card({ oracleId: "next", name: "Counterspell", quantity: 2 })];

    const result = applyValidatedDeckImport({
      mode: "override",
      baselineDeck: baseline({ rawText: "old raw text" }),
      workingCards: previousWorking,
      validCards,
      warnings,
      rawText: "2 Counterspell",
    });

    expect(result.baselineDeck).toEqual({
      rawText: "",
      cards: previousWorking,
      invalidCards: warnings,
      status: "ready",
      errorMessage: null,
    });
    expect(result.workingCards).toBe(validCards);
  });
});
