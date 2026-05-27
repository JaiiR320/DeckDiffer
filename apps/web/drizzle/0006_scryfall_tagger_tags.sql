CREATE TABLE IF NOT EXISTS "scryfall_tagger_tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"namespace" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"tagging_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"category" boolean DEFAULT false NOT NULL,
	"has_exemplary_tagging" boolean DEFAULT false NOT NULL,
	"tagger_created_at" text NOT NULL,
	"query_operator" text,
	"raw" jsonb,
	"imported_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scryfall_tagger_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"tag_count" integer DEFAULT 0 NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scryfall_tagger_tags_slug_idx" ON "scryfall_tagger_tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scryfall_tagger_tags_namespace_idx" ON "scryfall_tagger_tags" USING btree ("namespace");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scryfall_tagger_tags_query_operator_idx" ON "scryfall_tagger_tags" USING btree ("query_operator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scryfall_tagger_tags_tagging_count_idx" ON "scryfall_tagger_tags" USING btree ("tagging_count");
