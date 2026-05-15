import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "#/db";
import { deckSaves, decks } from "#/db/schema";
import { auth } from "#/lib/auth";
import { createCommanderDeckCover, shouldRefreshCommanderCover } from "#/lib/deckCover";
import { slugifyName } from "#/lib/deck";
import { mapDeck, type DeckSaveRow } from "./deckMappers";
import {
  createDeckInputSchema,
  deckIdSchema,
  renameDeckInputSchema,
  saveDeckInputSchema,
  updateDeckCoverInputSchema,
  updateDeckCurrentInputSchema,
  type CreateDeckInput,
  type DeleteDeckInput,
  type GetDeckInput,
  type RenameDeckInput,
  type SaveDeckInput,
  type UpdateDeckCoverInput,
  type UpdateDeckCurrentInput,
} from "./deckSchemas";

async function requireUserId() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

async function getDeckRowsWithSaves(userId: string) {
  const deckRows = await db
    .select()
    .from(decks)
    .where(eq(decks.userId, userId))
    .orderBy(desc(decks.updatedAt));

  if (deckRows.length === 0) {
    return [];
  }

  const saveRows = await db
    .select()
    .from(deckSaves)
    .where(
      inArray(
        deckSaves.deckId,
        deckRows.map((deck) => deck.id),
      ),
    )
    .orderBy(asc(deckSaves.savedAt));

  const savesByDeckId = new Map<string, DeckSaveRow[]>();

  for (const save of saveRows) {
    const current = savesByDeckId.get(save.deckId) ?? [];
    current.push(save);
    savesByDeckId.set(save.deckId, current);
  }

  return deckRows.map((deck) => mapDeck(deck, savesByDeckId.get(deck.id) ?? []));
}

async function getDeckWithSavesBySlug(userId: string, slug: string) {
  const deckRow = await db.query.decks.findFirst({
    where: and(eq(decks.userId, userId), eq(decks.slug, slug)),
  });

  if (!deckRow) {
    return null;
  }

  const saveRows = await db
    .select()
    .from(deckSaves)
    .where(eq(deckSaves.deckId, deckRow.id))
    .orderBy(asc(deckSaves.savedAt));

  return mapDeck(deckRow, saveRows);
}

async function getUniqueDeckIdentity(
  userId: string,
  name: string,
  currentDeckId?: string,
): Promise<string> {
  const existingDecks = await db
    .select({ slug: decks.slug })
    .from(decks)
    .where(
      currentDeckId
        ? and(eq(decks.userId, userId), ne(decks.id, currentDeckId))
        : eq(decks.userId, userId),
    );

  const existingSlugs = new Set(existingDecks.map((deck) => deck.slug));
  const baseSlug = slugifyName(name) || "deck";

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let nextSlug = `${baseSlug}-${suffix}`;

  while (existingSlugs.has(nextSlug)) {
    suffix += 1;
    nextSlug = `${baseSlug}-${suffix}`;
  }

  return nextSlug;
}

async function getUniqueSlug(userId: string, name: string, currentDeckId?: string) {
  return getUniqueDeckIdentity(userId, name, currentDeckId);
}

export const listDecks = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return getDeckRowsWithSaves(userId);
});

export const getDeck = createServerFn({ method: "GET" })
  .inputValidator((data: GetDeckInput) => deckIdSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return getDeckWithSavesBySlug(userId, data.deckId);
  });

export const createDeckForUser = createServerFn({ method: "POST" })
  .inputValidator((data: CreateDeckInput) => createDeckInputSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const name = data.name.trim();

    if (!name) {
      throw new Error("Deck name is required.");
    }

    const now = new Date();
    const slug = await getUniqueSlug(userId, name);
    const id = crypto.randomUUID();

    await db.insert(decks).values({
      id,
      userId,
      slug,
      name,
      createdAt: now,
      updatedAt: now,
    });

    return getDeckWithSavesBySlug(userId, slug);
  });

export const renameDeckForUser = createServerFn({ method: "POST" })
  .inputValidator((data: RenameDeckInput) => renameDeckInputSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const nextName = data.newName.trim();

    if (!nextName) {
      throw new Error("Deck name is required.");
    }

    const existingDeck = await db.query.decks.findFirst({
      where: and(eq(decks.userId, userId), eq(decks.slug, data.deckId)),
    });

    if (!existingDeck) {
      throw new Error("Deck not found.");
    }

    const nextSlug = await getUniqueSlug(userId, nextName, existingDeck.id);

    await db
      .update(decks)
      .set({
        slug: nextSlug,
        name: nextName,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, existingDeck.id));

    return getDeckWithSavesBySlug(userId, nextSlug);
  });

export const deleteDeckForUser = createServerFn({ method: "POST" })
  .inputValidator((data: DeleteDeckInput) => deckIdSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const existingDeck = await db.query.decks.findFirst({
      where: and(eq(decks.userId, userId), eq(decks.slug, data.deckId)),
    });

    if (!existingDeck) {
      return { success: false };
    }

    await db.delete(decks).where(eq(decks.id, existingDeck.id));
    return { success: true };
  });

export const saveDeckForUser = createServerFn({ method: "POST" })
  .inputValidator((data: SaveDeckInput) => saveDeckInputSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const existingDeck = await db.query.decks.findFirst({
      where: and(eq(decks.userId, userId), eq(decks.slug, data.deckId)),
    });

    if (!existingDeck) {
      throw new Error("Deck not found.");
    }

    const saveLabel = data.label.trim() || `Save #1`;
    const now = new Date();
    const cover = shouldRefreshCommanderCover(existingDeck.cover)
      ? createCommanderDeckCover(data.categories, data.cards, existingDeck.cover)
      : existingDeck.cover;

    await db.insert(deckSaves).values({
      id: crypto.randomUUID(),
      deckId: existingDeck.id,
      label: saveLabel,
      savedAt: now,
      categories: data.categories ?? null,
      cards: data.cards,
      layout: data.layout ?? null,
    });

    await db
      .update(decks)
      .set({
        cover,
        updatedAt: now,
      })
      .where(eq(decks.id, existingDeck.id));

    return getDeckWithSavesBySlug(userId, existingDeck.slug);
  });

export const updateDeckCurrentForUser = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateDeckCurrentInput) => updateDeckCurrentInputSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const existingDeck = await db.query.decks.findFirst({
      where: and(eq(decks.userId, userId), eq(decks.slug, data.deckId)),
    });

    if (!existingDeck) {
      throw new Error("Deck not found.");
    }

    const cover = shouldRefreshCommanderCover(existingDeck.cover)
      ? createCommanderDeckCover(data.categories, data.cards, existingDeck.cover)
      : existingDeck.cover;

    await db
      .update(decks)
      .set({
        categories: data.categories,
        cards: data.cards,
        cover,
        layout: data.layout,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, existingDeck.id));

    return getDeckWithSavesBySlug(userId, existingDeck.slug);
  });

export const updateDeckCoverForUser = createServerFn({ method: "POST" })
  .inputValidator((data: UpdateDeckCoverInput) => updateDeckCoverInputSchema.parse(data))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const existingDeck = await db.query.decks.findFirst({
      where: and(eq(decks.userId, userId), eq(decks.slug, data.deckId)),
    });

    if (!existingDeck) {
      throw new Error("Deck not found.");
    }

    await db
      .update(decks)
      .set({
        cover: data.cover,
        updatedAt: new Date(),
      })
      .where(eq(decks.id, existingDeck.id));

    return getDeckWithSavesBySlug(userId, existingDeck.slug);
  });
