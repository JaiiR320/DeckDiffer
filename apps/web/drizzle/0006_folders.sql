CREATE TABLE IF NOT EXISTS "folders" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "parent_folder_id" text REFERENCES "folders"("id") ON DELETE cascade,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "folders_user_parent_slug_uidx" ON "folders" (
  "user_id",
  coalesce("parent_folder_id", ''),
  "slug"
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "folders_user_parent_idx" ON "folders" ("user_id", "parent_folder_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "deck_folder_entries" (
  "deck_id" text PRIMARY KEY NOT NULL REFERENCES "decks"("id") ON DELETE cascade,
  "folder_id" text NOT NULL REFERENCES "folders"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deck_folder_entries_folder_id_idx" ON "deck_folder_entries" ("folder_id");
