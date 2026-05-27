import type { DeckColor, DeckStackLayout, DeckTileCover } from "#/lib/deck";
import type { DeckCategory, ValidatedDeckCard } from "#/lib/decklist";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
};

const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...timestamps,
});

const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const decks = pgTable(
  "decks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categories: jsonb("categories").$type<DeckCategory[] | null>(),
    cards: jsonb("cards").$type<ValidatedDeckCard[] | null>(),
    colors: jsonb("colors").$type<DeckColor[] | null>(),
    cover: jsonb("cover").$type<DeckTileCover | null>(),
    layout: jsonb("layout").$type<DeckStackLayout | null>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("decks_user_id_slug_uidx").on(table.userId, table.slug),
    index("decks_user_id_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const deckSaves = pgTable(
  "deck_saves",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true, mode: "date" }).notNull(),
    categories: jsonb("categories").$type<DeckCategory[] | null>(),
    cards: jsonb("cards").$type<ValidatedDeckCard[]>().notNull(),
    layout: jsonb("layout").$type<DeckStackLayout | null>(),
  },
  (table) => [index("deck_saves_deck_id_saved_at_idx").on(table.deckId, table.savedAt)],
);

const scryfallTaggerTags = pgTable(
  "scryfall_tagger_tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    namespace: text("namespace").notNull(),
    type: text("type").notNull(),
    description: text("description"),
    taggingCount: integer("tagging_count").notNull().default(0),
    status: text("status").notNull(),
    category: boolean("category").notNull().default(false),
    hasExemplaryTagging: boolean("has_exemplary_tagging").notNull().default(false),
    taggerCreatedAt: text("tagger_created_at").notNull(),
    queryOperator: text("query_operator"),
    raw: jsonb("raw"),
    importedAt: timestamp("imported_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("scryfall_tagger_tags_slug_idx").on(table.slug),
    index("scryfall_tagger_tags_namespace_idx").on(table.namespace),
    index("scryfall_tagger_tags_query_operator_idx").on(table.queryOperator),
    index("scryfall_tagger_tags_tagging_count_idx").on(table.taggingCount),
  ],
);

const scryfallTaggerImports = pgTable("scryfall_tagger_imports", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  status: text("status").notNull(),
  tagCount: integer("tag_count").notNull().default(0),
  pageCount: integer("page_count").notNull().default(0),
  errorMessage: text("error_message"),
});

export const schema = {
  user,
  session,
  account,
  verification,
  decks,
  deckSaves,
  scryfallTaggerTags,
  scryfallTaggerImports,
};
