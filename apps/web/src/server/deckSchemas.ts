import { z } from "zod";
import type { DeckStackLayout } from "#/lib/deck";
import type { ValidatedDeckCard } from "#/lib/decklist";

export type CreateDeckInput = { name: string };
export type RenameDeckInput = { deckId: string; newName: string };
export type DeleteDeckInput = { deckId: string };
export type GetDeckInput = { deckId: string };
export type SaveDeckInput = {
  deckId: string;
  label: string;
  cards: ValidatedDeckCard[];
  layout?: DeckStackLayout;
};

export const deckIdSchema = z.object({
  deckId: z.string().trim().min(1, "Deck ID is required."),
});

const deckNameSchema = z.string().trim().min(1, "Deck name is required.");

export const createDeckInputSchema = z.object({
  name: deckNameSchema,
});

export const renameDeckInputSchema = z.object({
  deckId: z.string().trim().min(1, "Deck ID is required."),
  newName: deckNameSchema,
});

const cardCategorySchema = z.enum([
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Planeswalker",
  "Battle",
  "Other",
]);

const validatedDeckCardSchema = z.object({
  oracleId: z.string().trim().min(1, "Card oracle ID is required."),
  name: z.string().trim().min(1, "Card name is required."),
  quantity: z.number().int().positive("Card quantity must be greater than zero."),
  typeLine: z.string().trim().min(1, "Card type line is required."),
  category: cardCategorySchema,
  manaValue: z.number().nonnegative().optional(),
  setCode: z.string().trim().min(1, "Card set code is required."),
  collectorNumber: z.string().trim().min(1, "Card collector number is required."),
});

const deckStackLayoutSchema = z.object({
  lanes: z.array(z.array(cardCategorySchema)),
});

export const saveDeckInputSchema = z.object({
  deckId: z.string().trim().min(1, "Deck ID is required."),
  label: z.string(),
  cards: z.array(validatedDeckCardSchema),
  layout: deckStackLayoutSchema.optional(),
});
