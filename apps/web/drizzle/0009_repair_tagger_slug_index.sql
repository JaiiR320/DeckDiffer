DROP INDEX IF EXISTS "scryfall_tagger_tags_slug_uidx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scryfall_tagger_tags_slug_idx" ON "scryfall_tagger_tags" USING btree ("slug");
