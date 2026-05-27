ALTER TABLE "scryfall_tagger_imports" ALTER COLUMN "tag_count" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "scryfall_tagger_imports" ALTER COLUMN "page_count" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "scryfall_tagger_imports" ALTER COLUMN "tag_count" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "scryfall_tagger_imports" ALTER COLUMN "page_count" SET NOT NULL;
